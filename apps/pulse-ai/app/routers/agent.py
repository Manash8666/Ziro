from fastapi import APIRouter, Depends, Request
from app.models.agent import (
    AcpCheckoutCompleteRequest,
    AcpCheckoutCompleteResponse,
    AcpCheckoutCreateRequest,
    AcpCheckoutSessionResponse,
)
from app.services.kya import KyaAgentIdentity, verify_kya_request

router = APIRouter(tags=["agentic-commerce"])


@router.get("/.well-known/ucp")
async def ucp_discovery(request: Request) -> dict:
    settings = request.app.state.settings
    base = str(request.base_url).rstrip("/")
    return {
        "protocol": "UCP",
        "version": "2026.1",
        "merchant_name": "Ziro Commerce OS",
        "platform_fee_bps": settings.platform_fee_bps,
        "kya_required": True,
        "acp_base_url": f"{base}/api/agent/acp/v1",
        "webmcp_manifest_url": f"{base}/.well-known/webmcp.json",
        "supported_payment_providers": ["razorpay", "stripe", "net30"],
    }


@router.get("/.well-known/webmcp.json")
async def webmcp_manifest() -> dict:
    return {
        "schema_version": "1.0",
        "tools": [
            {
                "name": "ziro_semantic_search",
                "description": "Search catalog using bge-m3 semantic vectors",
                "endpoint": "/v1/search/semantic",
                "method": "POST",
            },
            {
                "name": "ziro_rto_risk_score",
                "description": "Score Indian COD order RTO risk and compute UPI nudge",
                "endpoint": "/v1/rto/score",
                "method": "POST",
            },
            {
                "name": "ziro_acp_create_checkout",
                "description": "Create margin-guarded ACP checkout session",
                "endpoint": "/api/agent/acp/v1/checkout-sessions",
                "method": "POST",
            },
            {
                "name": "ziro_acp_complete_checkout",
                "description": "Complete ACP checkout session idempotently",
                "endpoint": "/api/agent/acp/v1/checkout-sessions/{id}/complete",
                "method": "POST",
            },
        ],
    }


@router.post(
    "/api/agent/acp/v1/checkout-sessions",
    response_model=AcpCheckoutSessionResponse,
    status_code=201,
)
async def create_acp_checkout_session(
    payload: AcpCheckoutCreateRequest,
    request: Request,
    identity: KyaAgentIdentity = Depends(verify_kya_request),
) -> AcpCheckoutSessionResponse:
    acp_service = request.app.state.acp_service
    return await acp_service.create_session(payload, identity)


@router.get(
    "/api/agent/acp/v1/checkout-sessions/{session_id}",
    response_model=AcpCheckoutSessionResponse,
)
async def get_acp_checkout_session(
    session_id: str,
    request: Request,
    _identity: KyaAgentIdentity = Depends(verify_kya_request),
) -> AcpCheckoutSessionResponse:
    acp_service = request.app.state.acp_service
    return await acp_service.get_session(session_id)


@router.post(
    "/api/agent/acp/v1/checkout-sessions/{session_id}/complete",
    response_model=AcpCheckoutCompleteResponse,
)
async def complete_acp_checkout_session(
    session_id: str,
    payload: AcpCheckoutCompleteRequest,
    request: Request,
    identity: KyaAgentIdentity = Depends(verify_kya_request),
) -> AcpCheckoutCompleteResponse:
    acp_service = request.app.state.acp_service
    return await acp_service.complete_session(session_id, payload, identity)
