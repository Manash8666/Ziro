def test_agent_telemetry_logging_and_querying(client):
    log_resp = client.post(
        "/v1/telemetry/log",
        json={
            "agent_id": "agent_chatgpt_search_01",
            "protocol": "UCP",
            "action": "checkout_session_create",
            "margin_protected": True,
            "discount_requested_bps": 2000,
            "discount_granted_bps": 1200,
            "cart_value_minor": 180000,
            "converted": True,
        },
    )
    assert log_resp.status_code == 200
    assert log_resp.json()["logged"] is True

    telemetry_resp = client.get("/v1/telemetry/agent-activity")
    assert telemetry_resp.status_code == 200
    events = telemetry_resp.json()["events"]
    assert len(events) >= 1
    found = next((e for e in events if e["agent_id"] == "agent_chatgpt_search_01"), None)
    assert found is not None
    assert found["protocol"] == "UCP"
    assert found["margin_protected"] is True
    assert found["cart_value_minor"] == 180000
