import pytest
from httpx import ASGITransport, AsyncClient
from app.config import Settings
from app.db import InMemoryPulseRepository
from app.main import create_app
from app.services.embedder import BgeM3EmbeddingService


@pytest.fixture
def test_app():
    settings = Settings(
        internal_service_token="test-secret-token",
        kya_require_signed_jwt=False,
    )
    repo = InMemoryPulseRepository()
    embedder = BgeM3EmbeddingService()
    return create_app(settings=settings, repository=repo, bge_m3_service=embedder)


@pytest.mark.asyncio
async def test_upsert_product_embeddings_unauthorized(test_app):
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        resp = await client.post(
            "/v1/embeddings/products/upsert",
            json={
                "tenant_id": "tenant-test",
                "products": [
                    {
                        "product_id": "prod_1",
                        "handle": "brembo-brakes",
                        "title": "Brembo High Performance Brake Pads",
                        "semantic_text": "Ceramic front brake pads for high performance braking",
                        "hsn_code": "87083000",
                        "gst_slab_percent": 18,
                        "min_price_paise": 450000,
                        "total_stock": 25,
                        "fitment_matrix": [{"make": "Toyota", "model": "Fortuner", "year_start": 2018}],
                        "platform_fee_bps": 0,
                    }
                ],
                "platform_fee_bps": 0,
            },
        )
        assert resp.status_code == 401
        assert "Unauthorized" in resp.json()["detail"]


@pytest.mark.asyncio
async def test_upsert_product_embeddings_success_with_bearer(test_app):
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        headers = {"Authorization": "Bearer test-secret-token"}
        resp = await client.post(
            "/v1/embeddings/products/upsert",
            headers=headers,
            json={
                "tenant_id": "tenant-auto",
                "products": [
                    {
                        "product_id": "prod_brakes_01",
                        "handle": "brembo-carbon-ceramic",
                        "title": "Brembo Carbon Ceramic Brake Kit",
                        "semantic_text": "Complete track-spec carbon ceramic front and rear brake disc and caliper kit",
                        "hsn_code": "87083000",
                        "gst_slab_percent": 28,
                        "min_price_paise": 15000000,
                        "total_stock": 10,
                        "fitment_matrix": [
                            {"make": "Porsche", "model": "911 GT3", "year_start": 2021, "year_end": 2024}
                        ],
                        "platform_fee_bps": 0,
                    }
                ],
                "platform_fee_bps": 0,
            },
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True
        assert data["tenant_id"] == "tenant-auto"
        assert data["upserted_count"] == 1
        assert data["dimensions"] == 1024
        assert data["platform_fee_bps"] == 0


@pytest.mark.asyncio
async def test_upsert_product_embeddings_rejects_nonzero_platform_fee(test_app):
    async with AsyncClient(transport=ASGITransport(app=test_app), base_url="http://test") as client:
        headers = {"X-Ziro-Service-Token": "test-secret-token"}
        resp = await client.post(
            "/v1/embeddings/products/upsert",
            headers=headers,
            json={
                "tenant_id": "tenant-violator",
                "products": [
                    {
                        "product_id": "prod_taxed",
                        "handle": "taxed-widget",
                        "title": "Fee Violator Widget",
                        "semantic_text": "Should fail 0% platform fee invariant",
                        "hsn_code": "84713010",
                        "gst_slab_percent": 18,
                        "min_price_paise": 10000,
                        "total_stock": 5,
                        "platform_fee_bps": 200,
                    }
                ],
                "platform_fee_bps": 200,
            },
        )
        assert resp.status_code == 422 or resp.status_code == 400
