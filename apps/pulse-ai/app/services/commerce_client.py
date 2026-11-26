import uuid
from typing import Any, Protocol
import httpx


class CommerceBackendClient(Protocol):
    async def price_and_reserve(
        self,
        tenant_id: str,
        line_items: list[dict[str, Any]],
        currency: str,
        requested_discount_bps: int,
        shipping_address: dict[str, Any] | None,
    ) -> dict[str, Any]: ...

    async def complete_order(
        self,
        tenant_id: str,
        reservation_id: str,
        payment_token: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]: ...


class InMemoryCommerceClient:
    def __init__(self) -> None:
        self._idempotency_orders: dict[tuple[str, str], dict[str, Any]] = {}

    async def price_and_reserve(
        self,
        tenant_id: str,
        line_items: list[dict[str, Any]],
        currency: str,
        requested_discount_bps: int,
        shipping_address: dict[str, Any] | None,
    ) -> dict[str, Any]:
        items_out: list[dict[str, Any]] = []
        subtotal_minor = 0
        cogs_total_minor = 0

        for item in line_items:
            qty = int(item["quantity"])
            unit_price = 100_000
            unit_cogs = 70_000
            line_total = unit_price * qty
            subtotal_minor += line_total
            cogs_total_minor += unit_cogs * qty
            items_out.append(
                {
                    "product_id": item["product_id"],
                    "title": f"Catalog Item {item['product_id']}",
                    "quantity": qty,
                    "unit_price_minor": unit_price,
                    "total_minor": line_total,
                }
            )

        discount_minor = (subtotal_minor * requested_discount_bps) // 10_000
        net_minor = subtotal_minor - discount_minor
        tax_minor = (net_minor * 1800) // 10_000

        return {
            "subtotal_minor": subtotal_minor,
            "tax_minor": tax_minor,
            "cogs_total_minor": cogs_total_minor,
            "min_margin_bps": 1500,
            "reservation_id": f"res_{uuid.uuid4().hex[:12]}",
            "items": items_out,
        }

    async def complete_order(
        self,
        tenant_id: str,
        reservation_id: str,
        payment_token: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]:
        cache_key = (tenant_id, idempotency_key)
        if cache_key in self._idempotency_orders:
            return self._idempotency_orders[cache_key]

        result = {
            "external_order_id": f"ord_acp_{uuid.uuid4().hex[:12]}",
            "status": "COMPLETED",
        }
        self._idempotency_orders[cache_key] = result
        return result


class HttpCommerceClient:
    def __init__(self, base_url: str) -> None:
        self.base_url = base_url.rstrip("/")

    async def price_and_reserve(
        self,
        tenant_id: str,
        line_items: list[dict[str, Any]],
        currency: str,
        requested_discount_bps: int,
        shipping_address: dict[str, Any] | None,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/internal/acp/price-and-reserve",
                json={
                    "tenant_id": tenant_id,
                    "line_items": line_items,
                    "currency": currency,
                    "requested_discount_bps": requested_discount_bps,
                    "shipping_address": shipping_address,
                },
            )
            resp.raise_for_status()
            return resp.json()

    async def complete_order(
        self,
        tenant_id: str,
        reservation_id: str,
        payment_token: dict[str, Any],
        idempotency_key: str,
    ) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(
                f"{self.base_url}/internal/acp/complete-order",
                json={
                    "tenant_id": tenant_id,
                    "reservation_id": reservation_id,
                    "payment_token": payment_token,
                    "idempotency_key": idempotency_key,
                },
            )
            resp.raise_for_status()
            return resp.json()
