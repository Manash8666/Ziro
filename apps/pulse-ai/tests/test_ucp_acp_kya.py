import hashlib
import hmac
import json
import time


def _sign_kya(
    method: str,
    path: str,
    body_bytes: bytes,
    secret: str,
    timestamp_sec: int,
) -> str:
    body_hash = hashlib.sha256(body_bytes).hexdigest()
    canonical = f"{method.upper()}\n{path}\n{timestamp_sec}\n{body_hash}".encode("utf-8")
    return hmac.new(secret.encode("utf-8"), canonical, hashlib.sha256).hexdigest()


def test_ucp_and_webmcp_discovery_manifests(client):
    ucp_resp = client.get("/.well-known/ucp")
    assert ucp_resp.status_code == 200
    ucp = ucp_resp.json()
    assert ucp["platform_fee_bps"] == 0
    assert ucp["kya_required"] is True
    assert "/api/agent/acp/v1" in ucp["acp_base_url"]
    assert ucp["webmcp_manifest_url"].endswith("/.well-known/webmcp.json")

    webmcp_resp = client.get("/.well-known/webmcp.json")
    assert webmcp_resp.status_code == 200
    webmcp = webmcp_resp.json()
    tool_names = [t["name"] for t in webmcp["tools"]]
    assert "ziro_semantic_search" in tool_names
    assert "ziro_acp_create_checkout" in tool_names


def test_kya_rejects_unauthenticated_tampered_and_expired_requests(client):
    path = "/api/agent/acp/v1/checkout-sessions"
    payload = {
        "tenant_id": "t_auto",
        "currency": "INR",
        "line_items": [{"product_id": "prod_brake_01", "quantity": 1}],
        "requested_discount_bps": 0,
    }
    raw_body = json.dumps(payload).encode("utf-8")

    # 1. Unauthenticated
    unauth = client.post(path, content=raw_body, headers={"content-type": "application/json"})
    assert unauth.status_code == 401

    # 2. Tampered signature
    now = int(time.time())
    bad_sig = client.post(
        path,
        content=raw_body,
        headers={
            "content-type": "application/json",
            "X-Ziro-Agent-Id": "agent_gemini_01",
            "X-Ziro-Timestamp": str(now),
            "X-Ziro-Agent-Signature": "0" * 64,
        },
    )
    assert bad_sig.status_code == 401

    # 3. Expired timestamp (> 300s old)
    old_ts = now - 305
    expired_sig = _sign_kya("POST", path, raw_body, "ziro-kya-dev-secret", old_ts)
    expired = client.post(
        path,
        content=raw_body,
        headers={
            "content-type": "application/json",
            "X-Ziro-Agent-Id": "agent_gemini_01",
            "X-Ziro-Timestamp": str(old_ts),
            "X-Ziro-Agent-Signature": expired_sig,
        },
    )
    assert expired.status_code == 401


def test_kya_margin_guardrail_blocks_excessive_discount_and_logs_audit(client, pulse_repo):
    path = "/api/agent/acp/v1/checkout-sessions"
    # Default in-memory catalog has unit price 100_000, cogs 70_000 (30% margin), min_margin_bps = 1500 (15%).
    # Requesting 2500 bps (25%) discount drops net_price to 75_000 -> margin (75k-70k)/75k = 666 bps < 1500 -> 403!
    payload = {
        "tenant_id": "t_auto",
        "currency": "INR",
        "line_items": [{"product_id": "prod_brake_01", "quantity": 1}],
        "requested_discount_bps": 2500,
    }
    raw_body = json.dumps(payload).encode("utf-8")
    now = int(time.time())
    sig = _sign_kya("POST", path, raw_body, "ziro-kya-dev-secret", now)

    resp = client.post(
        path,
        content=raw_body,
        headers={
            "content-type": "application/json",
            "X-Ziro-Agent-Id": "agent_bargain_bot",
            "X-Ziro-Timestamp": str(now),
            "X-Ziro-Agent-Signature": sig,
        },
    )
    assert resp.status_code == 403
    assert len(pulse_repo._agent_audit_logs) >= 1
    assert pulse_repo._agent_audit_logs[-1]["decision"] == "DENIED_MARGIN_FLOOR"


def test_acp_checkout_create_get_and_idempotent_complete(client):
    create_path = "/api/agent/acp/v1/checkout-sessions"
    payload = {
        "tenant_id": "t_auto",
        "currency": "INR",
        "line_items": [{"product_id": "prod_brake_01", "quantity": 2}],
        "requested_discount_bps": 500,  # 5% discount -> net 95k vs cogs 70k -> 2631 bps >= 1500 bps
        "shipping_address": {
            "line1": "12 MG Road",
            "city": "Bengaluru",
            "state_code": "29",
            "postal_code": "560001",
            "country": "IN",
        },
    }
    raw_body = json.dumps(payload).encode("utf-8")
    now = int(time.time())
    sig = _sign_kya("POST", create_path, raw_body, "ziro-kya-dev-secret", now)

    create_resp = client.post(
        create_path,
        content=raw_body,
        headers={
            "content-type": "application/json",
            "X-Ziro-Agent-Id": "agent_gemini_01",
            "X-Ziro-Timestamp": str(now),
            "X-Ziro-Agent-Signature": sig,
        },
    )
    assert create_resp.status_code in (200, 201)
    session = create_resp.json()
    session_id = session["checkout_session_id"]
    assert session["platform_fee_bps"] == 0
    assert session["status"] == "READY_FOR_PAYMENT"

    # GET session
    get_path = f"/api/agent/acp/v1/checkout-sessions/{session_id}"
    get_sig = _sign_kya("GET", get_path, b"", "ziro-kya-dev-secret", now)
    get_resp = client.get(
        get_path,
        headers={
            "X-Ziro-Agent-Id": "agent_gemini_01",
            "X-Ziro-Timestamp": str(now),
            "X-Ziro-Agent-Signature": get_sig,
        },
    )
    assert get_resp.status_code == 200
    assert get_resp.json()["checkout_session_id"] == session_id

    # Complete idempotently
    complete_path = f"/api/agent/acp/v1/checkout-sessions/{session_id}/complete"
    complete_payload = {
        "payment_token": {
            "provider": "razorpay",
            "token": "tok_rzp_agent_123",
            "idempotency_key": "idem_acp_001",
        }
    }
    complete_raw = json.dumps(complete_payload).encode("utf-8")
    complete_sig = _sign_kya("POST", complete_path, complete_raw, "ziro-kya-dev-secret", now)
    headers = {
        "content-type": "application/json",
        "X-Ziro-Agent-Id": "agent_gemini_01",
        "X-Ziro-Timestamp": str(now),
        "X-Ziro-Agent-Signature": complete_sig,
    }

    first = client.post(complete_path, content=complete_raw, headers=headers)
    assert first.status_code == 200
    first_data = first.json()
    assert first_data["status"] == "COMPLETED"
    assert first_data["external_order_id"]

    second = client.post(complete_path, content=complete_raw, headers=headers)
    assert second.status_code == 200
    second_data = second.json()
    assert second_data["external_order_id"] == first_data["external_order_id"]
