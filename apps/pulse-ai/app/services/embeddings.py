import hashlib
import re
from typing import Protocol
import httpx
import numpy as np

from app.config import Settings

TOKEN_RE = re.compile(r"[a-z0-9]+")


class EmbeddingProvider(Protocol):
    async def embed(self, texts: list[str]) -> list[list[float]]: ...


class LocalHashEmbeddingProvider:
    """Deterministic 1024-dim L2-normalized feature-hashing embedder (zero ML weights required)."""

    def __init__(self, dimension: int = 1024) -> None:
        self.dimension = dimension

    def _embed_one(self, text: str) -> list[float]:
        vec = np.zeros(self.dimension, dtype=np.float32)
        tokens = TOKEN_RE.findall(text.lower())
        ngrams = list(tokens)
        for i in range(len(tokens) - 1):
            ngrams.append(f"{tokens[i]}_{tokens[i + 1]}")

        for token in ngrams:
            digest = hashlib.sha256(token.encode("utf-8")).digest()
            idx = int.from_bytes(digest[:4], "big") % self.dimension
            sign = 1.0 if (digest[4] & 1) == 0 else -1.0
            vec[idx] += sign

        norm = float(np.linalg.norm(vec))
        if norm > 0.0:
            vec /= norm
        return vec.tolist()

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [self._embed_one(t) for t in texts]


class BgeM3EmbeddingProvider:
    """BAAI/bge-m3 SentenceTransformer embedder (lazy-loaded)."""

    def __init__(self, model_name: str = "BAAI/bge-m3") -> None:
        self.model_name = model_name
        self._model = None

    def _get_model(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            self._model = SentenceTransformer(self.model_name)
        return self._model

    async def embed(self, texts: list[str]) -> list[list[float]]:
        model = self._get_model()
        vectors = model.encode(texts, normalize_embeddings=True)
        return [v.tolist() for v in vectors]


class RemoteHttpEmbeddingProvider:
    """Remote HTTP embedding service client."""

    def __init__(self, endpoint_url: str) -> None:
        self.endpoint_url = endpoint_url

    async def embed(self, texts: list[str]) -> list[list[float]]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(self.endpoint_url, json={"input": texts})
            resp.raise_for_status()
            data = resp.json()
            if "embeddings" in data:
                return data["embeddings"]
            return [row["embedding"] for row in data.get("data", [])]


def build_embedding_provider(settings: Settings) -> EmbeddingProvider:
    if settings.embedding_provider == "bge_m3":
        return BgeM3EmbeddingProvider(model_name=settings.embedding_model_name)
    if settings.embedding_provider == "remote_http" and settings.embedding_remote_url:
        return RemoteHttpEmbeddingProvider(endpoint_url=settings.embedding_remote_url)
    return LocalHashEmbeddingProvider(dimension=settings.embedding_dimension)
