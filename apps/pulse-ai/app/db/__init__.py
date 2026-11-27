from typing import Any, Protocol
import numpy as np
from app.db.rls import (
    PgConnectionProtocol,
    create_pulse_db_pool,
    init_pgvector_connection,
    tenant_rls_transaction,
    validate_tenant_id,
)


class PulseRepository(Protocol):
    async def upsert_product_embedding(
        self,
        tenant_id: str,
        product_id: str,
        title: str,
        description: str,
        sku: str,
        price_minor: int,
        currency: str,
        stock_qty: int,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> None: ...

    async def search_semantic(
        self,
        tenant_id: str,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[dict[str, Any]]: ...

    async def list_catalog(self, tenant_id: str, limit: int = 50) -> list[dict[str, Any]]: ...

    async def save_rto_assessment(
        self,
        tenant_id: str,
        pincode: str,
        cart_value_inr: int,
        result: dict[str, Any],
    ) -> None: ...


class InMemoryPulseRepository:
    def __init__(self) -> None:
        self._records: dict[tuple[str, str], dict[str, Any]] = {}
        self._rto_assessments: list[dict[str, Any]] = []
        self._agent_audit_logs: list[dict[str, Any]] = []
        self._acp_sessions: dict[str, dict[str, Any]] = {}
        # New: 1024-dim Stage 4 pulse_product_embeddings storage
        self._product_embeddings: dict[tuple[str, str], dict[str, Any]] = {}

    async def upsert_product_embedding(
        self,
        tenant_id: str,
        product_id: str,
        title: str,
        description: str,
        sku: str,
        price_minor: int,
        currency: str,
        stock_qty: int,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        self._records[(tenant_id, product_id)] = {
            "tenant_id": tenant_id,
            "product_id": product_id,
            "title": title,
            "description": description,
            "sku": sku,
            "price_minor": price_minor,
            "currency": currency,
            "stock_qty": stock_qty,
            "embedding": np.asarray(embedding, dtype=np.float32),
            "metadata": metadata or {},
        }

    async def search_semantic(
        self,
        tenant_id: str,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        q_vec = np.asarray(query_embedding, dtype=np.float32)
        q_norm = float(np.linalg.norm(q_vec))
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored: list[dict[str, Any]] = []
        for (rec_tenant, _), rec in self._records.items():
            if rec_tenant != tenant_id:
                continue
            d_vec = rec["embedding"]
            d_norm = float(np.linalg.norm(d_vec))
            score = float(np.dot(q_vec, d_vec / d_norm)) if d_norm > 0 else 0.0
            scored.append(
                {
                    "product_id": rec["product_id"],
                    "title": rec["title"],
                    "description": rec["description"],
                    "sku": rec["sku"],
                    "price_minor": rec["price_minor"],
                    "currency": rec["currency"],
                    "stock_qty": rec["stock_qty"],
                    "score": round(score, 6),
                    "metadata": rec["metadata"],
                }
            )

        scored.sort(key=lambda r: r["score"], reverse=True)
        return scored[:limit]

    # Stage 4: Store & search pulse_product_embeddings with 1024-dim vectors
    async def upsert_pulse_product_embedding(
        self,
        tenant_id: str,
        product_id: str,
        handle: str,
        title: str,
        semantic_text: str,
        content_sha256: str,
        embedding: list[float],
        hsn_code: str,
        gst_slab_percent: int,
        min_price_paise: int,
        total_stock: int,
        fitment_matrix: list[dict[str, Any]],
        platform_fee_bps: int = 0,
    ) -> None:
        assert platform_fee_bps == 0, "ZIRO_PLATFORM_FEE_BPS invariant violated: must be 0"
        self._product_embeddings[(tenant_id, product_id)] = {
            "tenant_id": tenant_id,
            "product_id": product_id,
            "handle": handle,
            "title": title,
            "semantic_text": semantic_text,
            "content_sha256": content_sha256,
            "embedding": np.asarray(embedding, dtype=np.float32),
            "hsn_code": hsn_code,
            "gst_slab_percent": gst_slab_percent,
            "min_price_paise": min_price_paise,
            "total_stock": total_stock,
            "fitment_matrix": fitment_matrix,
            "platform_fee_bps": 0,
        }

    async def search_pulse_product_embeddings(
        self,
        tenant_id: str,
        query_embedding: list[float],
        limit: int = 10,
        fitment_filter: dict[str, Any] | None = None,
        min_score: float = 0.0,
    ) -> list[dict[str, Any]]:
        q_vec = np.asarray(query_embedding, dtype=np.float32)
        q_norm = float(np.linalg.norm(q_vec))
        if q_norm > 0:
            q_vec = q_vec / q_norm

        scored: list[dict[str, Any]] = []
        for (rec_tenant, _), rec in self._product_embeddings.items():
            if rec_tenant != tenant_id:
                continue

            # Check fitment filter if provided
            if fitment_filter:
                match = False
                for fit in rec.get("fitment_matrix", []):
                    # Check if all keys in fitment_filter match fit
                    matches_all = True
                    for k, v in fitment_filter.items():
                        if fit.get(k) is None or str(fit[k]).lower() != str(v).lower():
                            matches_all = False
                            break
                    if matches_all:
                        match = True
                        break
                if not match and rec.get("fitment_matrix"):
                    continue

            d_vec = rec["embedding"]
            d_norm = float(np.linalg.norm(d_vec))
            # Cosine similarity
            score = float(np.dot(q_vec, d_vec / d_norm)) if d_norm > 0 else 0.0
            if score >= min_score:
                scored.append(
                    {
                        "product_id": rec["product_id"],
                        "handle": rec["handle"],
                        "title": rec["title"],
                        "semantic_text": rec["semantic_text"],
                        "content_sha256": rec["content_sha256"],
                        "hsn_code": rec["hsn_code"],
                        "gst_slab_percent": rec["gst_slab_percent"],
                        "min_price_paise": rec["min_price_paise"],
                        "total_stock": rec["total_stock"],
                        "fitment_matrix": rec["fitment_matrix"],
                        "platform_fee_bps": 0,
                        "similarity_score": round(score, 4),
                    }
                )

        scored.sort(key=lambda r: r["similarity_score"], reverse=True)
        return scored[:limit]

    async def list_catalog(self, tenant_id: str, limit: int = 50) -> list[dict[str, Any]]:
        items = [
            {
                "product_id": rec["product_id"],
                "title": rec["title"],
                "description": rec["description"],
                "sku": rec["sku"],
                "price_minor": rec["price_minor"],
                "currency": rec["currency"],
                "stock_qty": rec["stock_qty"],
                "metadata": rec["metadata"],
            }
            for (rec_tenant, _), rec in self._records.items()
            if rec_tenant == tenant_id
        ]
        return items[:limit]

    async def save_rto_assessment(
        self,
        tenant_id: str,
        pincode: str,
        cart_value_inr: int,
        result: dict[str, Any],
    ) -> None:
        self._rto_assessments.append(
            {
                "tenant_id": tenant_id,
                "pincode": pincode,
                "cart_value_inr": cart_value_inr,
                "result": result,
            }
        )

    async def save_agent_audit_log(
        self,
        tenant_id: str,
        agent_id: str,
        action: str,
        decision: str,
        details: dict[str, Any],
    ) -> None:
        self._agent_audit_logs.append(
            {
                "tenant_id": tenant_id,
                "agent_id": agent_id,
                "action": action,
                "decision": decision,
                "details": details,
            }
        )

    async def save_acp_session(self, session: dict[str, Any]) -> None:
        self._acp_sessions[session["checkout_session_id"]] = dict(session)

    async def get_acp_session(self, session_id: str) -> dict[str, Any] | None:
        rec = self._acp_sessions.get(session_id)
        return dict(rec) if rec else None

    async def update_acp_session_status(
        self,
        session_id: str,
        status: str,
        external_order_id: str | None = None,
    ) -> None:
        rec = self._acp_sessions.get(session_id)
        if rec:
            rec["status"] = status
            if external_order_id is not None:
                rec["external_order_id"] = external_order_id


class PgVectorPulseRepository:
    def __init__(self, database_url: str) -> None:
        self.database_url = database_url
        self._pool: Any = None

    async def _get_pool(self) -> Any:
        if self._pool is None:
            self._pool = await create_pulse_db_pool(self.database_url)
        return self._pool

    async def upsert_product_embedding(
        self,
        tenant_id: str,
        product_id: str,
        title: str,
        description: str,
        sku: str,
        price_minor: int,
        currency: str,
        stock_qty: int,
        embedding: list[float],
        metadata: dict[str, Any] | None = None,
    ) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO product_embeddings (
                    tenant_id, product_id, title, description, sku,
                    price_minor, currency, stock_qty, embedding
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                ON CONFLICT (tenant_id, product_id) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    sku = EXCLUDED.sku,
                    price_minor = EXCLUDED.price_minor,
                    currency = EXCLUDED.currency,
                    stock_qty = EXCLUDED.stock_qty,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
                """,
                tenant_id,
                product_id,
                title,
                description,
                sku,
                price_minor,
                currency,
                stock_qty,
                embedding,
            )

    async def search_semantic(
        self,
        tenant_id: str,
        query_embedding: list[float],
        limit: int = 10,
    ) -> list[dict[str, Any]]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT product_id, title, description, sku, price_minor, currency, stock_qty,
                       1 - (embedding <=> $2) AS score
                FROM product_embeddings
                WHERE tenant_id = $1
                ORDER BY embedding <=> $2 ASC
                LIMIT $3
                """,
                tenant_id,
                query_embedding,
                limit,
            )
            return [dict(r) for r in rows]

    async def list_catalog(self, tenant_id: str, limit: int = 50) -> list[dict[str, Any]]:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT product_id, title, description, sku, price_minor, currency, stock_qty
                FROM product_embeddings
                WHERE tenant_id = $1
                LIMIT $2
                """,
                tenant_id,
                limit,
            )
            return [dict(r) for r in rows]

    async def save_rto_assessment(
        self,
        tenant_id: str,
        pincode: str,
        cart_value_inr: int,
        result: dict[str, Any],
    ) -> None:
        pool = await self._get_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO rto_risk_assessments (
                    tenant_id, pincode, cart_value_inr, risk_score, risk_tier, recommended_modes
                )
                VALUES ($1, $2, $3, $4, $5, $6)
                """,
                tenant_id,
                pincode,
                cart_value_inr,
                result.get("risk_score", 0.0),
                result.get("risk_tier", "LOW"),
                result.get("recommended_payment_modes", []),
            )


__all__ = [
    "PulseRepository",
    "InMemoryPulseRepository",
    "PgVectorPulseRepository",
    "validate_tenant_id",
    "PgConnectionProtocol",
    "init_pgvector_connection",
    "create_pulse_db_pool",
    "tenant_rls_transaction",
]
