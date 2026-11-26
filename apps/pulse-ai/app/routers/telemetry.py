from typing import Any
from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter()

_telemetry_events: list[dict[str, Any]] = []


class TelemetryEventInput(BaseModel):
    agent_id: str
    protocol: str = Field(description="UCP, ACP, or WEBMCP")
    action: str
    margin_protected: bool = False
    discount_requested_bps: int = 0
    discount_granted_bps: int = 0
    cart_value_minor: int = 0
    converted: bool = False


@router.post("/log")
async def log_telemetry_event(event: TelemetryEventInput) -> dict[str, Any]:
    record = event.model_dump()
    _telemetry_events.append(record)
    return {"logged": True, "event_count": len(_telemetry_events)}


@router.get("/agent-activity")
async def get_agent_activity() -> dict[str, Any]:
    return {"events": _telemetry_events}
