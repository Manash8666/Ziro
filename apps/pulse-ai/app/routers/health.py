from fastapi import APIRouter, Request

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check(request: Request) -> dict:
    settings = request.app.state.settings
    return {
        "status": "ok",
        "service": settings.service_name,
        "tenancy_mode": settings.tenancy_mode,
        "platform_fee_bps": settings.platform_fee_bps,
    }
