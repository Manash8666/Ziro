from typing import Any, Literal
from pydantic import BaseModel, Field


class AcpShippingAddress(BaseModel):
    line1: str = Field(min_length=1)
    city: str = Field(min_length=1)
    state_code: str = ""
    postal_code: str = Field(min_length=1)
    country: str = Field(min_length=2, max_length=2, default="IN")


class AcpLineItemInput(BaseModel):
    product_id: str = Field(min_length=1)
    quantity: int = Field(ge=1)


class AcpCheckoutCreateRequest(BaseModel):
    tenant_id: str = Field(min_length=1)
    currency: str = Field(min_length=3, max_length=3, default="INR")
    line_items: list[AcpLineItemInput] = Field(min_length=1)
    requested_discount_bps: int = Field(ge=0, le=10000, default=0)
    shipping_address: AcpShippingAddress | None = None


class AcpSessionLineItem(BaseModel):
    product_id: str
    title: str
    quantity: int
    unit_price_minor: int
    total_minor: int


class AcpCheckoutSessionResponse(BaseModel):
    checkout_session_id: str
    tenant_id: str
    status: Literal["READY_FOR_PAYMENT", "COMPLETED", "CANCELED"]
    currency: str
    subtotal_minor: int
    discount_minor: int
    tax_minor: int
    total_minor: int
    platform_fee_bps: int = 0
    reservation_id: str
    items: list[AcpSessionLineItem]
    external_order_id: str | None = None


class AcpPaymentToken(BaseModel):
    provider: Literal["razorpay", "stripe", "net30"]
    token: str = Field(min_length=1)
    idempotency_key: str = Field(min_length=1)


class AcpCheckoutCompleteRequest(BaseModel):
    payment_token: AcpPaymentToken


class AcpCheckoutCompleteResponse(BaseModel):
    checkout_session_id: str
    status: Literal["COMPLETED"]
    external_order_id: str
    platform_fee_bps: int = 0
    metadata: dict[str, Any] = Field(default_factory=dict)
