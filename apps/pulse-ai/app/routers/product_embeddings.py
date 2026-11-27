import hashlib
import hmac
import json
from typing import Any
from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field

from app.config import Settings
from app.db.rls import tenant_rls_transaction, validate_tenant_id
from app.services.embedder import BgeM3EmbeddingService

router = APIRouter(prefix="/v1/embeddings/products", tags=["product-embeddings"])

ZIRO_PLATFORM_FEE_BPS: int = 0


def get_settings(request: Request) -> Settings:
    return getattr(request.app.state, "settings", Settings())


def get_embedder(request: Request) -> BgeM3EmbeddingService:
    embedder = getattr(request.app.state, "bge_m3_service", None)
    if embedder is None:
        settings = get_settings(request)
        embedder = BgeM3EmbeddingService()
        request.app.state.bge_m3_service = embedder
    return embedder


def verify_service_or_kya_auth(
    authorization: str | None = Header(None),
    x_ziro_service_token: str | None = Header(None, alias="X-Ziro-Service-Token"),
    x_ziro_signature_hmac: str | None = Header(None, alias="X-Ziro-Signature-HMAC"),
    settings: Settings = Depends(get_settings),
) -> bool:
    """
    Enforces constant-time bearer service token or HMAC KYA authorization.
    """
    expected_token = settings.internal_service_token.encode("utf-8")

    # 1. Check Bearer token in Authorization header
    if authorization and authorization.startswith("Bearer "):
        bearer_token = authorization.split("Bearer ", 1)[1].strip().encode("utf-8")
        if hmac.compare_digest(bearer_token, expected_token):
            return True

    # 2. Check X-Ziro-Service-Token header
    if x_ziro_service_token:
        token_bytes = x_ziro_service_token.strip().encode("utf-8")
        if hmac.compare_digest(token_bytes, expected_token):
            return True

    # 3. Check X-Ziro-Signature-HMAC if provided
    if x_ziro_signature_hmac:
        expected_sig = settings.kya_hmac_secret.encode("utf-8")
        sig_bytes = x_ziro_signature_hmac.strip().encode("utf-8")
        if hmac.compare_digest(sig_bytes, expected_sig):
            return True

    # If KYA signature requirement is disabled for local dev / unauthenticated tests, allow
    if not settings.kya_require_signed_jwt and not settings.internal_service_token:
        return True

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unauthorized: Valid service token or KYA signature required",
    )


class FitmentItem(BaseModel):
    make: str = Field(..., description="Vehicle make, e.g. Toyota, Mahindra")
    model: str = Field(..., description="Vehicle model, e.g. Fortuner, Scorpio")
    year_start: int | None = Field(None, ge=1900, le=2100)
    year_end: int | None = Field(None, ge=1900, le=2100)
    engine: str | None = None
    submodel: str | None = None


class ProductUpsertItem(BaseModel):
    product_id: str
    handle: str
    title: str
    semantic_text: str
    hsn_code: str = Field(..., pattern=r"^[0-9]{4,8}$")
    gst_slab_percent: int = Field(..., ge=0, le=28)
    min_price_paise: int = Field(0, ge=0)
    total_stock: int = Field(0, ge=0)
    fitment_matrix: list[dict[str, Any]] = Field(default_factory=list)
    platform_fee_bps: int = Field(0, ge=0, le=0)


class ProductEmbeddingsUpsertRequest(BaseModel):
    tenant_id: str
    products: list[ProductUpsertItem] = Field(..., min_length=1)
    platform_fee_bps: int = Field(0, ge=0, le=0)


class ProductSearchRequest(BaseModel):
    tenant_id: str
    query: str = Field(..., min_length=1)
    limit: int = Field(10, ge=1, le=100)
    fitment_filter: dict[str, Any] | None = None
    min_score: float = Field(0.0, ge=0.0, le=1.0)
    platform_fee_bps: int = Field(0, ge=0, le=0)


@router.post("/upsert", status_code=status.HTTP_200_OK)
async def upsert_product_embeddings(
    req: ProductEmbeddingsUpsertRequest,
    request: Request,
    _auth: bool = Depends(verify_service_or_kya_auth),
    embedder: BgeM3EmbeddingService = Depends(get_embedder),
) -> dict[str, Any]:
    # Enforce 0% GMV fee platform invariant
    if req.platform_fee_bps != 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"ZIRO_PLATFORM_FEE_BPS invariant violated: received {req.platform_fee_bps}, must be 0",
        )

    for p in req.products:
        if p.platform_fee_bps != 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Product {p.product_id} has invalid platform_fee_bps: must be 0",
            )

    tenant_id = validate_tenant_id(req.tenant_id)
    texts_to_embed = [p.semantic_text for p in req.products]
    vectors = await embedder.embed_batch(texts_to_embed)

    repo = getattr(request.app.state, "repository", None)
    db_pool = getattr(request.app.state, "db_pool", None)

    # If PostgreSQL pool is available, execute with RLS transaction
    if db_pool is not None:
        async with tenant_rls_transaction(db_pool, tenant_id) as conn:
            for p, vec in zip(req.products, vectors):
                content_sha = hashlib.sha256(p.semantic_text.encode("utf-8")).hexdigest()
                fitment_json = json.dumps(p.fitment_matrix)
                await conn.execute(
                    """
                    INSERT INTO pulse_product_embeddings (
                        tenant_id, product_id, handle, title, semantic_text, content_sha256,
                        embedding, embedding_model, hsn_code, gst_slab_percent, min_price_paise,
                        total_stock, fitment_matrix, platform_fee_bps, updated_at
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, 'BAAI/bge-m3', $8, $9, $10, $11, $12::jsonb, 0, NOW())
                    ON CONFLICT (tenant_id, product_id) DO UPDATE SET
                        handle = EXCLUDED.handle,
                        title = EXCLUDED.title,
                        semantic_text = EXCLUDED.semantic_text,
                        content_sha256 = EXCLUDED.content_sha256,
                        embedding = EXCLUDED.embedding,
                        hsn_code = EXCLUDED.hsn_code,
                        gst_slab_percent = EXCLUDED.gst_slab_percent,
                        min_price_paise = EXCLUDED.min_price_paise,
                        total_stock = EXCLUDED.total_stock,
                        fitment_matrix = EXCLUDED.fitment_matrix,
                        platform_fee_bps = 0,
                        updated_at = NOW();
                    """,
                    tenant_id,
                    p.product_id,
                    p.handle,
                    p.title,
                    p.semantic_text,
                    content_sha,
                    vec,
                    p.hsn_code,
                    p.gst_slab_percent,
                    p.min_price_paise,
                    p.total_stock,
                    fitment_json,
                )
    elif repo is not None and hasattr(repo, "upsert_pulse_product_embedding"):
        for p, vec in zip(req.products, vectors):
            content_sha = hashlib.sha256(p.semantic_text.encode("utf-8")).hexdigest()
            await repo.upsert_pulse_product_embedding(
                tenant_id=tenant_id,
                product_id=p.product_id,
                handle=p.handle,
                title=p.title,
                semantic_text=p.semantic_text,
                content_sha256=content_sha,
                embedding=vec,
                hsn_code=p.hsn_code,
                gst_slab_percent=p.gst_slab_percent,
                min_price_paise=p.min_price_paise,
                total_stock=p.total_stock,
                fitment_matrix=p.fitment_matrix,
                platform_fee_bps=0,
            )
    else:
        # Fallback to standard upsert_product_embedding on repo
        for p, vec in zip(req.products, vectors):
            await repo.upsert_product_embedding(
                tenant_id=tenant_id,
                product_id=p.product_id,
                title=p.title,
                description=p.semantic_text,
                sku=p.handle,
                price_minor=p.min_price_paise,
                currency="INR",
                stock_qty=p.total_stock,
                embedding=vec,
                metadata={
                    "hsn_code": p.hsn_code,
                    "gst_slab_percent": p.gst_slab_percent,
                    "fitment_matrix": p.fitment_matrix,
                    "platform_fee_bps": 0,
                },
            )

    return {
        "success": True,
        "tenant_id": tenant_id,
        "upserted_count": len(req.products),
        "dimensions": len(vectors[0]) if vectors else 1024,
        "platform_fee_bps": 0,
    }


@router.post("/search", status_code=status.HTTP_200_OK)
async def search_product_embeddings(
    req: ProductSearchRequest,
    request: Request,
    embedder: BgeM3EmbeddingService = Depends(get_embedder),
) -> dict[str, Any]:
    tenant_id = validate_tenant_id(req.tenant_id)
    query_vector = await embedder.embed_single(req.query)

    repo = getattr(request.app.state, "repository", None)
    db_pool = getattr(request.app.state, "db_pool", None)

    results: list[dict[str, Any]] = []

    if db_pool is not None:
        async with tenant_rls_transaction(db_pool, tenant_id) as conn:
            # Set search parameter for HNSW
            await conn.execute("SET LOCAL hnsw.ef_search = 100;")

            # Query with L2 distance converted to similarity score
            rows = await conn.fetch(
                """
                SELECT product_id, handle, title, semantic_text, content_sha256,
                       hsn_code, gst_slab_percent, min_price_paise, total_stock,
                       fitment_matrix, platform_fee_bps,
                       ROUND((1 - (embedding <=> $1::vector))::numeric, 4) AS similarity_score
                FROM pulse_product_embeddings
                WHERE tenant_id = $2
                ORDER BY embedding <=> $1::vector ASC
                LIMIT $3
                """,
                query_vector,
                tenant_id,
                req.limit * 2 if req.fitment_filter else req.limit,
            )

            for r in rows:
                item = dict(r)
                item["similarity_score"] = float(item["similarity_score"])
                item["platform_fee_bps"] = 0

                # Fitment filter check
                if req.fitment_filter:
                    fits = item.get("fitment_matrix") or []
                    if isinstance(fits, str):
                        fits = json.loads(fits)
                    matched = False
                    for f in fits:
                        matches_all = True
                        for k, v in req.fitment_filter.items():
                            if f.get(k) is None or str(f[k]).lower() != str(v).lower():
                                matches_all = False
                                break
                        if matches_all:
                            matched = True
                            break
                    if not matched and len(fits) > 0:
                        continue

                if item["similarity_score"] >= req.min_score:
                    results.append(item)
                    if len(results) >= req.limit:
                        break
    elif repo is not None and hasattr(repo, "search_pulse_product_embeddings"):
        results = await repo.search_pulse_product_embeddings(
            tenant_id=tenant_id,
            query_embedding=query_vector,
            limit=req.limit,
            fitment_filter=req.fitment_filter,
            min_score=req.min_score,
        )
    elif repo is not None:
        raw_results = await repo.search_semantic(
            tenant_id=tenant_id,
            query_embedding=query_vector,
            limit=req.limit,
        )
        for r in raw_results:
            results.append(
                {
                    "product_id": r["product_id"],
                    "handle": r.get("sku", ""),
                    "title": r["title"],
                    "semantic_text": r.get("description", ""),
                    "content_sha256": "",
                    "hsn_code": r.get("metadata", {}).get("hsn_code", "87082900"),
                    "gst_slab_percent": r.get("metadata", {}).get("gst_slab_percent", 18),
                    "min_price_paise": r.get("price_minor", 0),
                    "total_stock": r.get("stock_qty", 0),
                    "fitment_matrix": r.get("metadata", {}).get("fitment_matrix", []),
                    "platform_fee_bps": 0,
                    "similarity_score": r.get("score", 0.0),
                }
            )

    return {
        "success": True,
        "tenant_id": tenant_id,
        "query": req.query,
        "count": len(results),
        "results": results,
        "platform_fee_bps": 0,
    }
