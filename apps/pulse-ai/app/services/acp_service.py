import uuid
from fastapi import HTTPException
from app.models.agent import (
    AcpCheckoutCompleteRequest,
    AcpCheckoutCompleteResponse,
    AcpCheckoutCreateRequest,
    AcpCheckoutSessionResponse,
    AcpSessionLineItem,
)
from app.services.commerce_client import CommerceBackendClient
from app.services.kya import KyaAgentIdentity


class AcpCheckoutService:
    def __init__(self, repository, commerce_client: CommerceBackendClient) -> None:
        self.repository = repository
        self.commerce_client = commerce_client

    async def create_session(
        self,
        payload: AcpCheckoutCreateRequest,
        identity: KyaAgentIdentity,
    ) -> AcpCheckoutSessionResponse:
        priced = await self.commerce_client.price_and_reserve(
            tenant_id=payload.tenant_id,
            line_items=[item.model_dump() for item in payload.line_items],
            currency=payload.currency,
            requested_discount_bps=payload.requested_discount_bps,
            shipping_address=payload.shipping_address.model_dump() if payload.shipping_address else None,
        )

        subtotal_minor = int(priced["subtotal_minor"])
        cogs_total_minor = int(priced["cogs_total_minor"])
        min_margin_bps = int(priced["min_margin_bps"])
        discount_minor = (subtotal_minor * payload.requested_discount_bps) // 10_000
        net_minor = subtotal_minor - discount_minor

        effective_margin_bps = (
            ((net_minor - cogs_total_minor) * 10_000) // net_minor if net_minor > 0 else -10_000
        )

        if effective_margin_bps < min_margin_bps:
            await self.repository.save_agent_audit_log(
                tenant_id=payload.tenant_id,
                agent_id=identity.agent_id,
                action="ACP_CREATE_CHECKOUT",
                decision="DENIED_MARGIN_FLOOR",
                details={
                    "requested_discount_bps": payload.requested_discount_bps,
                    "effective_margin_bps": effective_margin_bps,
                    "min_margin_bps": min_margin_bps,
                },
            )
            raise HTTPException(
                status_code=403,
                detail=(
                    f"Margin floor violated: effective margin {effective_margin_bps} bps "
                    f"is below merchant minimum {min_margin_bps} bps"
                ),
            )

        tax_minor = int(priced["tax_minor"])
        total_minor = net_minor + tax_minor
        session_id = f"acp_sess_{uuid.uuid4().hex[:12]}"

        session = AcpCheckoutSessionResponse(
            checkout_session_id=session_id,
            tenant_id=payload.tenant_id,
            status="READY_FOR_PAYMENT",
            currency=payload.currency,
            subtotal_minor=subtotal_minor,
            discount_minor=discount_minor,
            tax_minor=tax_minor,
            total_minor=total_minor,
            platform_fee_bps=0,
            reservation_id=priced["reservation_id"],
            items=[AcpSessionLineItem(**item) for item in priced["items"]],
        )

        await self.repository.save_acp_session(session.model_dump())
        await self.repository.save_agent_audit_log(
            tenant_id=payload.tenant_id,
            agent_id=identity.agent_id,
            action="ACP_CREATE_CHECKOUT",
            decision="ALLOWED",
            details={"checkout_session_id": session_id},
        )
        return session

    async def get_session(self, session_id: str) -> AcpCheckoutSessionResponse:
        record = await self.repository.get_acp_session(session_id)
        if not record:
            raise HTTPException(status_code=404, detail="ACP checkout session not found")
        return AcpCheckoutSessionResponse(**record)

    async def complete_session(
        self,
        session_id: str,
        payload: AcpCheckoutCompleteRequest,
        identity: KyaAgentIdentity,
    ) -> AcpCheckoutCompleteResponse:
        record = await self.repository.get_acp_session(session_id)
        if not record:
            raise HTTPException(status_code=404, detail="ACP checkout session not found")

        result = await self.commerce_client.complete_order(
            tenant_id=record["tenant_id"],
            reservation_id=record["reservation_id"],
            payment_token=payload.payment_token.model_dump(),
            idempotency_key=payload.payment_token.idempotency_key,
        )

        await self.repository.update_acp_session_status(
            session_id=session_id,
            status="COMPLETED",
            external_order_id=result["external_order_id"],
        )
        await self.repository.save_agent_audit_log(
            tenant_id=record["tenant_id"],
            agent_id=identity.agent_id,
            action="ACP_COMPLETE_CHECKOUT",
            decision="COMPLETED",
            details={
                "checkout_session_id": session_id,
                "external_order_id": result["external_order_id"],
            },
        )

        return AcpCheckoutCompleteResponse(
            checkout_session_id=session_id,
            status="COMPLETED",
            external_order_id=result["external_order_id"],
            platform_fee_bps=0,
        )
