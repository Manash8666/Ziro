def test_health_endpoint(client):
    resp = client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "ok"
    assert body["service"] == "ziro-pulse"


def test_semantic_index_and_search_ranks_automotive_brake_kit_first(client):
    index_resp = client.post(
        "/v1/embeddings/index",
        json={
            "tenant_id": "t_auto",
            "items": [
                {
                    "product_id": "prod_brake_01",
                    "title": "Ceramic Brake Pad Kit",
                    "description": "High-performance ceramic brake pad replacement for sedans and SUVs",
                    "sku": "BRK-CER-01",
                    "price_minor": 149900,
                    "currency": "INR",
                    "stock_qty": 18,
                },
                {
                    "product_id": "prod_yoga_02",
                    "title": "Cotton Yoga Mat",
                    "description": "Eco-friendly handwoven cotton yoga mat for home fitness",
                    "sku": "YOG-MAT-02",
                    "price_minor": 89900,
                    "currency": "INR",
                    "stock_qty": 40,
                },
            ],
        },
    )
    assert index_resp.status_code == 200
    assert index_resp.json()["indexed_count"] == 2

    search_resp = client.post(
        "/v1/search/semantic",
        json={
            "tenant_id": "t_auto",
            "query": "ceramic brake pad replacement",
            "limit": 5,
        },
    )
    assert search_resp.status_code == 200
    results = search_resp.json()["results"]
    assert len(results) == 2
    assert results[0]["product_id"] == "prod_brake_01"
    assert results[0]["score"] > results[1]["score"]
