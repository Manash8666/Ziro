from datetime import datetime, timezone
import json
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, status
from pydantic import BaseModel, Field

from app.config import Settings
from app.db.rls import tenant_rls_transaction, validate_tenant_id

router = APIRouter()

ZIRO_PLATFORM_FEE_BPS: int = 0

_telemetry_events: list[dict[str, Any]] = []


class TelemetryEventInput(BaseModel):
    agent_id: str
    protocol: str = Field(description="UCP, ACP, WEBMCP, or RTO_SHIELD")
    action: str
    margin_protected: bool = False
    discount_requested_bps: int = 0
    discount_granted_bps: int = 0
    cart_value_minor: int = 0
    converted: bool = False
    tenant_id: str = "tenant_fashion_01"


class TelemetryRecordEventInput(BaseModel):
    tenant_id: str = Field(default="tenant_fashion_01", min_length=1, max_length=64)
    agent_id: str = Field(..., min_length=1)
    protocol: str = Field(..., description="UCP, ACP, WEBMCP, or RTO_SHIELD")
    action: str = Field(..., min_length=1)
    query_text: str | None = None
    cart_value_paise: int = Field(default=0, ge=0)
    discount_requested_bps: int = Field(default=0, ge=0)
    discount_granted_bps: int = Field(default=0, ge=0)
    margin_floor_protected: bool = False
    rto_risk_score: float | None = Field(default=None, ge=0.0, le=1.0)
    rto_nudged: bool = False
    arbitrage_blocked: bool = False
    converted: bool = False
    estimated_rto_saved_paise: int = Field(default=0, ge=0)
    platform_fee_bps: int = Field(default=0, description="Hardcoded invariant: must be 0")
    metadata: dict[str, Any] = Field(default_factory=dict)


def get_settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", Settings())


@router.post("/log")
async def log_telemetry_event(
    event: TelemetryEventInput,
    request: Request,
) -> dict[str, Any]:
    """Backward-compatible endpoint for existing test suites."""
    now_iso = datetime.now(timezone.utc).isoformat()
    record = event.model_dump()
    record["recorded_at"] = now_iso
    record["platform_fee_bps"] = 0
    _telemetry_events.append(record)

    db_pool = getattr(request.app.state, "db_pool", None)
    if db_pool is not None:
        try:
            async with tenant_rls_transaction(db_pool, event.tenant_id) as conn:
                await conn.execute(
                    """
                    INSERT INTO pulse_agent_telemetry_events (
                        tenant_id, agent_id, protocol, action,
                        cart_value_paise, discount_requested_bps, discount_granted_bps,
                        margin_floor_protected, converted, platform_fee_bps, recorded_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 0, NOW())
                    """,
                    event.tenant_id,
                    event.agent_id,
                    event.protocol.upper(),
                    event.action,
                    event.cart_value_minor,
                    event.discount_requested_bps,
                    event.discount_granted_bps,
                    event.margin_protected,
                    event.converted,
                )
        except Exception:
            pass

    return {"logged": True, "event_count": len(_telemetry_events)}


@router.post("/agent-activity/record")
@router.post("/record")
async def record_agent_telemetry_event(
    event: TelemetryRecordEventInput,
    request: Request,
) -> dict[str, Any]:
    """Records a live UCP/ACP/WebMCP/RTO telemetry event under tenant RLS."""
    if event.platform_fee_bps != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ZIRO_PLATFORM_FEE_BPS invariant violated: received {event.platform_fee_bps}, must be 0",
        )

    valid_tenant = validate_tenant_id(event.tenant_id)
    now_iso = datetime.now(timezone.utc).isoformat()

    event_dict = event.model_dump()
    event_dict["recorded_at"] = now_iso
    # Backward compatibility mappings for test suite
    event_dict["margin_protected"] = event.margin_floor_protected
    event_dict["cart_value_minor"] = event.cart_value_paise
    _telemetry_events.append(event_dict)

    db_pool = getattr(request.app.state, "db_pool", None)
    if db_pool is not None:
        async with tenant_rls_transaction(db_pool, valid_tenant) as conn:
            await conn.execute(
                """
                INSERT INTO pulse_agent_telemetry_events (
                    tenant_id, agent_id, protocol, action, query_text,
                    cart_value_paise, discount_requested_bps, discount_granted_bps,
                    margin_floor_protected, rto_risk_score, rto_nudged,
                    arbitrage_blocked, converted, estimated_rto_saved_paise,
                    platform_fee_bps, metadata, recorded_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 0, $15::jsonb, NOW())
                """,
                valid_tenant,
                event.agent_id,
                event.protocol.upper(),
                event.action,
                event.query_text,
                event.cart_value_paise,
                event.discount_requested_bps,
                event.discount_granted_bps,
                event.margin_floor_protected,
                event.rto_risk_score,
                event.rto_nudged,
                event.arbitrage_blocked,
                event.converted,
                event.estimated_rto_saved_paise,
                json.dumps(event.metadata),
            )

    return {
        "recorded": True,
        "tenant_id": valid_tenant,
        "agent_id": event.agent_id,
        "protocol": event.protocol.upper(),
        "platform_fee_bps": 0,
    }


@router.get("/agent-activity")
async def get_agent_activity(
    request: Request,
    tenant_id: str | None = Query(None),
    x_tenant_id: str | None = Header(None, alias="X-Tenant-Id"),
) -> dict[str, Any]:
    """Returns live agentic telemetry metrics and event feeds."""
    effective_tenant = tenant_id or x_tenant_id or "tenant_fashion_01"
    valid_tenant = validate_tenant_id(effective_tenant)

    db_pool = getattr(request.app.state, "db_pool", None)

    if db_pool is not None:
        async with tenant_rls_transaction(db_pool, valid_tenant) as conn:
            agg_row = await conn.fetchrow(
                """
                SELECT
                    COUNT(*) AS monthly_queries,
                    COUNT(*) FILTER (WHERE protocol = 'UCP') AS ucp_count,
                    COUNT(*) FILTER (WHERE protocol = 'ACP' AND converted = true) AS acp_converted,
                    COUNT(*) FILTER (WHERE arbitrage_blocked = true OR margin_floor_protected = true) AS bots_blocked,
                    COUNT(*) FILTER (WHERE rto_nudged = true) AS rto_nudged_count,
                    COALESCE(SUM(estimated_rto_saved_paise), 0) AS total_rto_saved
                FROM pulse_agent_telemetry_events
                WHERE recorded_at >= NOW() - INTERVAL '30 days';
                """
            )
            rows = await conn.fetch(
                """
                SELECT id, recorded_at, tenant_id, agent_id, protocol, action,
                       cart_value_paise, discount_requested_bps, discount_granted_bps,
                       margin_floor_protected, rto_risk_score, rto_nudged,
                       arbitrage_blocked, converted, estimated_rto_saved_paise, platform_fee_bps
                FROM pulse_agent_telemetry_events
                ORDER BY recorded_at DESC
                LIMIT 20;
                """
            )

            monthly_queries = int(agg_row["monthly_queries"] if agg_row else 0)
            ucp_count = int(agg_row["ucp_count"] if agg_row else 0)
            acp_count = int(agg_row["acp_converted"] if agg_row else 0)
            bots_blocked = int(agg_row["bots_blocked"] if agg_row else 0)
            rto_nudged = int(agg_row["rto_nudged_count"] if agg_row else 0)
            rto_saved = int(agg_row["total_rto_saved"] if agg_row else 0)
            recent_events = [dict(r) for r in rows]
    else:
        # Fallback to in-memory event aggregation
        tenant_events = [
            e for e in _telemetry_events
            if e.get("tenant_id", "tenant_fashion_01") == valid_tenant or not e.get("tenant_id")
        ]
        monthly_queries = len(tenant_events)
        ucp_count = sum(1 for e in tenant_events if str(e.get("protocol", "")).upper() == "UCP")
        acp_count = sum(1 for e in tenant_events if str(e.get("protocol", "")).upper() == "ACP" and e.get("converted"))
        bots_blocked = sum(
            1 for e in tenant_events
            if e.get("arbitrage_blocked") or e.get("margin_floor_protected") or e.get("margin_protected")
        )
        rto_nudged = sum(1 for e in tenant_events if e.get("rto_nudged"))
        rto_saved = sum(
            int(e.get("estimated_rto_saved_paise", 0))
            for e in tenant_events
        )
        recent_events = list(reversed(tenant_events[-20:]))

    return {
        "tenant_id": valid_tenant,
        "monthly_agent_queries": monthly_queries,
        "ucp_discovery_requests": ucp_count,
        "acp_checkouts_completed": acp_count,
        "kya_arbitrage_bots_blocked": bots_blocked,
        "rto_high_risk_orders_nudged": rto_nudged,
        "estimated_rto_loss_saved_paise": rto_saved,
        "platform_fee_bps": 0,
        "zero_tax_guarantee": True,
        "events": recent_events,
        "recent_events": recent_events,
    }
