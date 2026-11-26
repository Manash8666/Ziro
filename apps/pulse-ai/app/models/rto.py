from typing import Literal
from pydantic import BaseModel, Field

RtoRiskTier = Literal["LOW", "MEDIUM", "HIGH"]
RtoPaymentMode = Literal["UPI_INTENT", "UPI", "CARD", "NETBANKING", "COD"]


class RtoScoreRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    pincode: str = Field(pattern=r"^\d{6}$")
    cart_value_inr: int = Field(ge=0)
    is_repeat_customer: bool = False
    prior_rto_count: int = Field(ge=0, default=0)
    prior_delivered_count: int = Field(ge=0, default=0)
    address_completeness_score: float = Field(ge=0.0, le=1.0, default=1.0)
    order_velocity_24h: int = Field(ge=0, default=1)


class RtoScoreResponse(BaseModel):
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_tier: RtoRiskTier
    upi_nudge_discount_inr: int = Field(ge=0)
    recommended_payment_modes: list[RtoPaymentMode]
    factors: list[str]
