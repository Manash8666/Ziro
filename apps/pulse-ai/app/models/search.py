from typing import Any
from pydantic import BaseModel, Field


class IndexItemInput(BaseModel):
    product_id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    description: str = ""
    sku: str = ""
    price_minor: int = Field(ge=0, default=0)
    currency: str = "INR"
    stock_qty: int = Field(ge=0, default=0)
    metadata: dict[str, Any] = Field(default_factory=dict)


class IndexRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    items: list[IndexItemInput] = Field(min_length=1)


class IndexResponse(BaseModel):
    indexed_count: int
    tenant_id: str


class SemanticSearchRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    query: str = Field(min_length=1)
    limit: int = Field(ge=1, le=100, default=10)


class SemanticSearchResult(BaseModel):
    product_id: str
    title: str
    description: str
    sku: str
    price_minor: int
    currency: str
    stock_qty: int
    score: float


class SemanticSearchResponse(BaseModel):
    tenant_id: str
    query: str
    results: list[SemanticSearchResult]
