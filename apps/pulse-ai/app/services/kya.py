import hashlib
import hmac
import time
from dataclasses import dataclass
from fastapi import HTTPException, Request
from jose import JWTError, jwt


@dataclass(frozen=True)
class KyaAgentIdentity:
    agent_id: str
    auth_mode: str


async def verify_kya_request(request: Request) -> KyaAgentIdentity:
    settings = request.app.state.settings
    agent_id = request.headers.get("x-ziro-agent-id", "").strip()
    timestamp_raw = request.headers.get("x-ziro-timestamp", "").strip()
    signature = request.headers.get("x-ziro-agent-signature", "").strip()
    auth_header = request.headers.get("authorization", "").strip()

    # Option 1: HS256 JWT Bearer token
    if auth_header.lower().startswith("bearer "):
        token = auth_header[7:].strip()
        try:
            claims = jwt.decode(token, settings.kya_jwks_secret, algorithms=["HS256"])
            sub = str(claims.get("sub") or agent_id or "")
            if not sub:
                raise HTTPException(status_code=401, detail="KYA JWT missing subject")
            return KyaAgentIdentity(agent_id=sub, auth_mode="jwt")
        except JWTError as exc:
            raise HTTPException(status_code=401, detail=f"Invalid KYA JWT: {exc}") from exc

    # Option 2: Canonical HMAC-SHA256
    if not agent_id or not timestamp_raw or not signature:
        raise HTTPException(status_code=401, detail="Missing KYA authentication headers")

    try:
        timestamp_sec = int(timestamp_raw)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail="Invalid X-Ziro-Timestamp") from exc

    now_sec = int(time.time())
    if abs(now_sec - timestamp_sec) > 300:
        raise HTTPException(status_code=401, detail="KYA request timestamp outside 300s window")

    body_bytes = await request.body()
    body_hash = hashlib.sha256(body_bytes).hexdigest()
    canonical = f"{request.method.upper()}\n{request.url.path}\n{timestamp_sec}\n{body_hash}".encode("utf-8")
    expected_sig = hmac.new(
        settings.kya_jwks_secret.encode("utf-8"),
        canonical,
        hashlib.sha256,
    ).hexdigest()

    if not hmac.compare_digest(expected_sig, signature.lower()):
        raise HTTPException(status_code=401, detail="Invalid X-Ziro-Agent-Signature")

    return KyaAgentIdentity(agent_id=agent_id, auth_mode="hmac")
