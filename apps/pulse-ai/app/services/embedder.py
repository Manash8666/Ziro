from typing import Protocol
import numpy as np

from app.services.embeddings import (
    EmbeddingProvider,
    LocalHashEmbeddingProvider,
    build_embedding_provider,
)
from app.config import Settings

BGE_M3_DIMENSIONS: int = 1024


class TextEmbedderProtocol(Protocol):
    async def embed_batch(self, texts: list[str]) -> list[list[float]]: ...
    async def embed_single(self, text: str) -> list[float]: ...


class BgeM3EmbeddingService:
    """
    1024-dimension BAAI/bge-m3 dense vector embedding service.
    Normalizes vectors to unit L2 norm for cosine / vector_l2_ops similarity in PostgreSQL 17 pgvector.
    """

    def __init__(self, provider: EmbeddingProvider | None = None) -> None:
        self._provider = provider or LocalHashEmbeddingProvider(dimension=BGE_M3_DIMENSIONS)

    async def embed_batch(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        raw_embeddings = await self._provider.embed(texts)
        normalized: list[list[float]] = []
        for vec in raw_embeddings:
            arr = np.asarray(vec, dtype=np.float32)
            norm = float(np.linalg.norm(arr))
            if norm > 0.0:
                arr = arr / norm
            # Pad or truncate to exactly 1024 dimensions if needed
            if len(arr) != BGE_M3_DIMENSIONS:
                padded = np.zeros(BGE_M3_DIMENSIONS, dtype=np.float32)
                limit = min(len(arr), BGE_M3_DIMENSIONS)
                padded[:limit] = arr[:limit]
                arr = padded
            normalized.append(arr.tolist())
        return normalized

    async def embed_single(self, text: str) -> list[float]:
        results = await self.embed_batch([text])
        return results[0]


def build_bge_m3_service(settings: Settings) -> BgeM3EmbeddingService:
    provider = build_embedding_provider(settings)
    return BgeM3EmbeddingService(provider=provider)
