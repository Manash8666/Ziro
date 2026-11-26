from fastapi import APIRouter, Request
from app.models.search import (
    IndexRequest,
    IndexResponse,
    SemanticSearchRequest,
    SemanticSearchResponse,
    SemanticSearchResult,
)

router = APIRouter(prefix="/v1", tags=["search"])


@router.post("/embeddings/index", response_model=IndexResponse)
async def index_embeddings(payload: IndexRequest, request: Request) -> IndexResponse:
    repo = request.app.state.repository
    embedder = request.app.state.embedding_provider

    texts = [f"{item.title} {item.description} {item.sku}".strip() for item in payload.items]
    vectors = await embedder.embed(texts)

    for item, vec in zip(payload.items, vectors):
        await repo.upsert_product_embedding(
            tenant_id=payload.tenant_id,
            product_id=item.product_id,
            title=item.title,
            description=item.description,
            sku=item.sku,
            price_minor=item.price_minor,
            currency=item.currency,
            stock_qty=item.stock_qty,
            embedding=vec,
            metadata=item.metadata,
        )

    return IndexResponse(indexed_count=len(payload.items), tenant_id=payload.tenant_id)


@router.post("/search/semantic", response_model=SemanticSearchResponse)
async def semantic_search(
    payload: SemanticSearchRequest,
    request: Request,
) -> SemanticSearchResponse:
    repo = request.app.state.repository
    embedder = request.app.state.embedding_provider

    query_vecs = await embedder.embed([payload.query])
    rows = await repo.search_semantic(
        tenant_id=payload.tenant_id,
        query_embedding=query_vecs[0],
        limit=payload.limit,
    )

    results = [SemanticSearchResult(**row) for row in rows]
    return SemanticSearchResponse(
        tenant_id=payload.tenant_id,
        query=payload.query,
        results=results,
    )
