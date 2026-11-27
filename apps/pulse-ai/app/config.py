from typing import Literal
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    service_name: str = "ziro-pulse"
    tenancy_mode: Literal["single", "multi"] = "single"
    default_tenant_id: str = "default"
    database_url: str = "postgresql://ziro:ziro@localhost:5432/ziro"
    commerce_engine_url: str = "http://localhost:9000"
    embedding_provider: Literal["local_hash", "bge_m3", "remote_http"] = "local_hash"
    embedding_model_name: str = "BAAI/bge-m3"
    embedding_remote_url: str = ""
    embedding_dimension: int = 1024
    internal_service_token: str = "ziro-dev-service-token"
    kya_jwks_secret: str = "ziro-kya-dev-secret"
    kya_hmac_secret: str = "ziro-kya-hmac-secret"
    kya_require_signed_jwt: bool = False
    platform_fee_bps: int = 0
    rto_high_risk_threshold: float = 0.72
