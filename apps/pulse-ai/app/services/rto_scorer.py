import math
from app.models.rto import RtoPaymentMode, RtoRiskTier, RtoScoreRequest, RtoScoreResponse

HIGH_RISK_PINCODE_PREFIXES = ("201", "1100", "122", "244", "302", "800")


def score_cod_rto(
    payload: RtoScoreRequest,
    high_risk_threshold: float = 0.72,
) -> RtoScoreResponse:
    logit = -1.6
    factors: list[str] = []

    if payload.pincode.startswith(HIGH_RISK_PINCODE_PREFIXES):
        logit += 1.1
        factors.append(f"elevated_rto_pincode:{payload.pincode[:3]}xxx")

    total_prior = payload.prior_rto_count + payload.prior_delivered_count
    if total_prior > 0 and payload.prior_rto_count > 0:
        rto_ratio = payload.prior_rto_count / total_prior
        logit += 2.4 * rto_ratio
        factors.append(f"prior_rto_history:{payload.prior_rto_count}/{total_prior}")
    elif payload.is_repeat_customer and payload.prior_rto_count == 0:
        logit -= 1.4
        factors.append("trusted_repeat_buyer")

    if payload.address_completeness_score < 0.60:
        logit += 1.1
        factors.append("incomplete_shipping_address")

    if payload.order_velocity_24h >= 3:
        logit += 1.0
        factors.append(f"order_velocity_spike:{payload.order_velocity_24h}")

    if payload.cart_value_inr >= 3000:
        logit += 0.8
        factors.append("high_cod_ticket_value")

    raw_score = 1.0 / (1.0 + math.exp(-logit))
    risk_score = round(min(1.0, max(0.0, raw_score)), 4)

    if risk_score >= high_risk_threshold:
        risk_tier: RtoRiskTier = "HIGH"
        upi_nudge = min(150, max(25, int(payload.cart_value_inr * 0.03)))
        recommended: list[RtoPaymentMode] = ["UPI_INTENT", "UPI", "CARD", "NETBANKING"]
    elif risk_score >= 0.40:
        risk_tier = "MEDIUM"
        upi_nudge = min(75, max(15, int(payload.cart_value_inr * 0.015)))
        recommended = ["UPI_INTENT", "UPI", "CARD", "COD"]
    else:
        risk_tier = "LOW"
        upi_nudge = 0
        recommended = ["UPI_INTENT", "UPI", "CARD", "COD"]

    if not factors:
        factors.append("baseline_risk_profile")

    return RtoScoreResponse(
        risk_score=risk_score,
        risk_tier=risk_tier,
        upi_nudge_discount_inr=upi_nudge,
        recommended_payment_modes=recommended,
        factors=factors,
    )
