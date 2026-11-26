def test_rto_low_risk_repeat_buyer(client):
    resp = client.post(
        "/v1/rto/score",
        json={
            "tenant_id": "t_auto",
            "pincode": "400001",
            "cart_value_inr": 1200,
            "is_repeat_customer": True,
            "prior_rto_count": 0,
            "prior_delivered_count": 6,
            "address_completeness_score": 0.95,
            "order_velocity_24h": 1,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["risk_score"] < 0.35
    assert body["risk_tier"] == "LOW"
    assert body["upi_nudge_discount_inr"] == 0
    assert "COD" in body["recommended_payment_modes"]


def test_rto_high_risk_buyer_recommends_upi_intent_and_nudge(client):
    resp = client.post(
        "/v1/rto/score",
        json={
            "tenant_id": "t_auto",
            "pincode": "201301",
            "cart_value_inr": 4500,
            "is_repeat_customer": False,
            "prior_rto_count": 3,
            "prior_delivered_count": 0,
            "address_completeness_score": 0.35,
            "order_velocity_24h": 5,
        },
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["risk_score"] >= 0.72
    assert body["risk_tier"] == "HIGH"
    assert body["upi_nudge_discount_inr"] > 0
    assert body["recommended_payment_modes"][0] == "UPI_INTENT"
    assert len(body["factors"]) >= 3
