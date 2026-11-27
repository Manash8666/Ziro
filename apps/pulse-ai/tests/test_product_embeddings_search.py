import pytest
from httpx import ASGITransport, AsyncClient
from app.config import Settings
from app.db import InMemoryPulseRepository
from app.main import create_app
from app.services.embedder import BgeM3EmbeddingService


@pytest.fixture
def search_test_app():
    settings = Settings(
        internal_service_token="test-secret-token",
        kya_require_signed_jwt=False,
    )
    repo = InMemoryPulseRepository()
    embedder = BgeM3EmbeddingService()
    return create_app(settings=settings, repository=repo, bge_m3_service=embedder)


@pytest.mark.asyncio
async def test_search_product_embeddings_with_fitment_filter(search_test_app):
    async with AsyncClient(transport=ASGITransport(app=search_test_app), base_url="http://test") as client:
        headers = {"Authorization": "Bearer test-secret-token"}

        # Upsert 2 products for tenant-motors
        upsert_resp = await client.post(
            "/v1/embeddings/products/upsert",
            headers=headers,
            json={
                "tenant_id": "tenant-motors",
                "products": [
                    {
                        "product_id": "prod_fortuner_filter",
                        "handle": "oil-filter-toyota-fortuner",
                        "title": "OEM Synthetic Oil Filter for Toyota Fortuner D-4D",
                        "semantic_text": "High flow synthetic spin-on engine oil filter for 2.8L diesel Toyota Fortuner and Hilux",
                        "hsn_code": "84212300",
                        "gst_slab_percent": 18,
                        "min_price_paise": 65000,
                        "total_stock": 100,
                        "fitment_matrix": [
                            {"make": "Toyota", "model": "Fortuner", "year_start": 2016, "engine": "2.8L Diesel"},
                            {"make": "Toyota", "model": "Hilux", "year_start": 2021, "engine": "2.8L Diesel"},
                        ],
                        "platform_fee_bps": 0,
                    },
                    {
                        "product_id": "prod_scorpio_filter",
                        "handle": "oil-filter-mahindra-scorpio",
                        "title": "OEM Synthetic Oil Filter for Mahindra Scorpio mHawk",
                        "semantic_text": "Heavy duty spin-on oil filter for 2.2L mHawk Mahindra Scorpio and XUV700",
                        "hsn_code": "84212300",
                        "gst_slab_percent": 18,
                        "min_price_paise": 55000,
                        "total_stock": 80,
                        "fitment_matrix": [
                            {"make": "Mahindra", "model": "Scorpio", "year_start": 2015, "engine": "2.2L mHawk"},
                        ],
                        "platform_fee_bps": 0,
                    },
                ],
                "platform_fee_bps": 0,
            },
        )
        assert upsert_resp.status_code == 200

        # Search without filter
        search_resp = await client.post(
            "/v1/embeddings/products/search",
            json={
                "tenant_id": "tenant-motors",
                "query": "oil filter diesel engine",
                "limit": 5,
                "platform_fee_bps": 0,
            },
        )
        assert search_resp.status_code == 200
        data = search_resp.json()
        assert data["success"] is True
        assert data["count"] == 2
        assert data["platform_fee_bps"] == 0

        # Search with Fitment filter for Toyota Fortuner
        filtered_resp = await client.post(
            "/v1/embeddings/products/search",
            json={
                "tenant_id": "tenant-motors",
                "query": "oil filter",
                "limit": 5,
                "fitment_filter": {"make": "Toyota", "model": "Fortuner"},
                "platform_fee_bps": 0,
            },
        )
        assert filtered_resp.status_code == 200
        filtered_data = filtered_resp.json()
        assert filtered_data["count"] == 1
        assert filtered_data["results"][0]["product_id"] == "prod_fortuner_filter"
        assert filtered_data["results"][0]["platform_fee_bps"] == 0


@pytest.mark.asyncio
async def test_search_product_embeddings_tenant_isolation(search_test_app):
    async with AsyncClient(transport=ASGITransport(app=search_test_app), base_url="http://test") as client:
        headers = {"Authorization": "Bearer test-secret-token"}

        # Upsert for Tenant Alpha
        await client.post(
            "/v1/embeddings/products/upsert",
            headers=headers,
            json={
                "tenant_id": "tenant-alpha",
                "products": [
                    {
                        "product_id": "alpha_spark_plug",
                        "handle": "alpha-iridium-plug",
                        "title": "NGK Iridium Spark Plug for Tenant Alpha",
                        "semantic_text": "High durability laser iridium spark plug",
                        "hsn_code": "85111000",
                        "gst_slab_percent": 18,
                        "min_price_paise": 120000,
                        "total_stock": 50,
                        "platform_fee_bps": 0,
                    }
                ],
                "platform_fee_bps": 0,
            },
        )

        # Upsert for Tenant Beta
        await client.post(
            "/v1/embeddings/products/upsert",
            headers=headers,
            json={
                "tenant_id": "tenant-beta",
                "products": [
                    {
                        "product_id": "beta_turbocharger",
                        "handle": "beta-garrett-turbo",
                        "title": "Garrett Ball Bearing Turbocharger for Tenant Beta",
                        "semantic_text": "Twin scroll turbocharger kit with internal wastegate",
                        "hsn_code": "84148090",
                        "gst_slab_percent": 28,
                        "min_price_paise": 8500000,
                        "total_stock": 5,
                        "platform_fee_bps": 0,
                    }
                ],
                "platform_fee_bps": 0,
            },
        )

        # Search Tenant Alpha for turbocharger: should return 0 results
        resp_alpha = await client.post(
            "/v1/embeddings/products/search",
            json={
                "tenant_id": "tenant-alpha",
                "query": "turbocharger kit",
                "limit": 10,
                "platform_fee_bps": 0,
            },
        )
        assert resp_alpha.status_code == 200
        alpha_items = resp_alpha.json()["results"]
        # Only alpha products can ever be returned
        for item in alpha_items:
            assert "beta" not in item["product_id"]

        # Search Tenant Beta for spark plug: should return 0 results
        resp_beta = await client.post(
            "/v1/embeddings/products/search",
            json={
                "tenant_id": "tenant-beta",
                "query": "spark plug",
                "limit": 10,
                "platform_fee_bps": 0,
            },
        )
        assert resp_beta.status_code == 200
        beta_items = resp_beta.json()["results"]
        for item in beta_items:
            assert "alpha" not in item["product_id"]
