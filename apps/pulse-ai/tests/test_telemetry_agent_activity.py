from typing import Any
import pytest
from fastapi.testclient import TestClient
from app.config import Settings
from app.main import create_app


class FakePgTransaction:
    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return None


class FakePgConnection:
    def __init__(self, executed_queries: list[tuple[str, tuple[Any, ...]]]):
        self.executed_queries = executed_queries

    def transaction(self):
        return FakePgTransaction()

    async def execute(self, query: str, *args: Any):
        self.executed_queries.append((query, args))
        return "EXECUTE 1"

    async def fetch(self, query: str, *args: Any):
        self.executed_queries.append((query, args))
        return [
            {
                "id": 1,
                "recorded_at": "2026-11-27T10:00:00Z",
                "tenant_id": "tenant_fake_01",
                "agent_id": "test_agent_01",
                "protocol": "UCP",
                "action": "search",
                "cart_value_paise": 150000,
                "discount_requested_bps": 1000,
                "discount_granted_bps": 500,
                "margin_floor_protected": True,
                "rto_risk_score": 0.12,
                "rto_nudged": False,
                "arbitrage_blocked": False,
                "converted": True,
                "estimated_rto_saved_paise": 0,
                "platform_fee_bps": 0,
            }
        ]

    async def fetchrow(self, query: str, *args: Any):
        self.executed_queries.append((query, args))
        return {
            "monthly_queries": 42,
            "ucp_count": 25,
            "acp_converted": 12,
            "bots_blocked": 5,
            "rto_nudged_count": 8,
            "total_rto_saved": 450000,
        }


class FakePgPool:
    def __init__(self):
        self.executed_queries: list[tuple[str, tuple[Any, ...]]] = []

    def acquire(self):
        conn = FakePgConnection(self.executed_queries)

        class PoolContext:
            async def __aenter__(self):
                return conn

            async def __aexit__(self, exc_type, exc_val, exc_tb):
                return None

        return PoolContext()


def test_record_telemetry_and_aggregated_activity(client: TestClient):
    # 1. Record UCP discovery event
    res1 = client.post(
        "/v1/telemetry/agent-activity/record",
        json={
            "tenant_id": "tenant_fashion_01",
            "agent_id": "chatgpt_shopping_agent",
            "protocol": "UCP",
            "action": "product_discovery",
            "cart_value_paise": 120000,
            "platform_fee_bps": 0,
        },
    )
    assert res1.status_code == 200
    assert res1.json()["recorded"] is True
    assert res1.json()["platform_fee_bps"] == 0

    # 2. Record ACP checkout completed
    res2 = client.post(
        "/v1/telemetry/agent-activity/record",
        json={
            "tenant_id": "tenant_fashion_01",
            "agent_id": "claude_procurement_agent",
            "protocol": "ACP",
            "action": "checkout_complete",
            "cart_value_paise": 250000,
            "converted": True,
            "platform_fee_bps": 0,
        },
    )
    assert res2.status_code == 200

    # 3. Record KYA arbitrage blocked event
    res3 = client.post(
        "/v1/telemetry/agent-activity/record",
        json={
            "tenant_id": "tenant_fashion_01",
            "agent_id": "scrape_bot_rogue",
            "protocol": "WEBMCP",
            "action": "margin_arbitrage_attempt",
            "arbitrage_blocked": True,
            "margin_floor_protected": True,
            "discount_requested_bps": 4000,
            "discount_granted_bps": 0,
            "platform_fee_bps": 0,
        },
    )
    assert res3.status_code == 200

    # 4. Record high-risk RTO order nudged
    res4 = client.post(
        "/v1/telemetry/agent-activity/record",
        json={
            "tenant_id": "tenant_fashion_01",
            "agent_id": "rto_cod_shield_v2",
            "protocol": "RTO_SHIELD",
            "action": "cod_nudge_applied",
            "cart_value_paise": 180000,
            "rto_risk_score": 0.88,
            "rto_nudged": True,
            "estimated_rto_saved_paise": 150000,
            "platform_fee_bps": 0,
        },
    )
    assert res4.status_code == 200

    # 5. Query aggregated activity
    get_res = client.get("/v1/telemetry/agent-activity?tenant_id=tenant_fashion_01")
    assert get_res.status_code == 200
    data = get_res.json()
    assert data["tenant_id"] == "tenant_fashion_01"
    assert data["monthly_agent_queries"] >= 4
    assert data["ucp_discovery_requests"] >= 1
    assert data["acp_checkouts_completed"] >= 1
    assert data["kya_arbitrage_bots_blocked"] >= 1
    assert data["rto_high_risk_orders_nudged"] >= 1
    assert data["estimated_rto_loss_saved_paise"] >= 150000
    assert data["platform_fee_bps"] == 0
    assert data["zero_tax_guarantee"] is True
    assert len(data["recent_events"]) >= 4


def test_platform_fee_bps_invariant_rejection(client: TestClient):
    # Attempting to inject a platform fee must be rejected immediately
    res = client.post(
        "/v1/telemetry/agent-activity/record",
        json={
            "tenant_id": "tenant_fashion_01",
            "agent_id": "greedy_broker",
            "protocol": "ACP",
            "action": "fee_arbitrage",
            "platform_fee_bps": 50,  # VIOLATION!
        },
    )
    assert res.status_code == 400
    assert "ZIRO_PLATFORM_FEE_BPS invariant violated" in res.json()["detail"]


def test_fake_db_pool_telemetry_rls_isolation():
    fake_pool = FakePgPool()
    app = create_app(settings=Settings(database_url="sqlite:///memory"), db_pool=fake_pool)
    with TestClient(app) as test_client:
        # 1. Record event
        res = test_client.post(
            "/v1/telemetry/agent-activity/record",
            json={
                "tenant_id": "tenant_auto_parts_99",
                "agent_id": "agent_auto_procure",
                "protocol": "UCP",
                "action": "fitment_search",
                "cart_value_paise": 550000,
                "platform_fee_bps": 0,
            },
        )
        assert res.status_code == 200

        # Assert set_config with tenant_id was called
        set_config_calls = [
            args for sql, args in fake_pool.executed_queries
            if "set_config" in sql
        ]
        assert len(set_config_calls) >= 1
        assert set_config_calls[0] == ("tenant_auto_parts_99",)

        # 2. Get activity
        get_res = test_client.get(
            "/v1/telemetry/agent-activity",
            headers={"X-Tenant-Id": "tenant_auto_parts_99"},
        )
        assert get_res.status_code == 200
        data = get_res.json()
        assert data["monthly_agent_queries"] == 42
        assert data["ucp_discovery_requests"] == 25
        assert data["acp_checkouts_completed"] == 12
        assert data["kya_arbitrage_bots_blocked"] == 5
        assert data["rto_high_risk_orders_nudged"] == 8
        assert data["estimated_rto_loss_saved_paise"] == 450000
        assert data["platform_fee_bps"] == 0
        assert data["zero_tax_guarantee"] is True
