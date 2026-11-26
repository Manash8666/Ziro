from fastapi import APIRouter, Request
from app.models.rto import RtoScoreRequest, RtoScoreResponse
from app.services.rto_scorer import score_cod_rto

router = APIRouter(prefix="/v1/rto", tags=["rto"])


@router.post("/score", response_model=RtoScoreResponse)
async def rto_score(payload: RtoScoreRequest, request: Request) -> RtoScoreResponse:
    settings = request.app.state.settings
    repo = request.app.state.repository
    result = score_cod_rto(payload, high_risk_threshold=settings.rto_high_risk_threshold)
    await repo.save_rto_assessment(
        tenant_id=payload.tenant_id,
        pincode=payload.pincode,
        cart_value_inr=payload.cart_value_inr,
        result=result.model_dump(),
    )
    return result
