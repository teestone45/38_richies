import { isSameOriginRequest } from "@/lib/admin-auth";
import { priceCheckoutCart } from "@/lib/checkout-pricing";
import { calculateDiscount } from "@/lib/discounts";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 16_384) return Response.json({ error: "Invalid discount request." }, { status: 413 });

  let body: { items?: unknown; code?: unknown };
  try {
    body = await request.json() as { items?: unknown; code?: unknown };
  } catch {
    return Response.json({ error: "Invalid discount request." }, { status: 400 });
  }
  if (typeof body.code !== "string") return Response.json({ error: "Enter a discount code." }, { status: 400 });

  try {
    const pricing = await priceCheckoutCart(body.items);
    if (!pricing.ok) return Response.json({ error: pricing.error }, { status: pricing.status });
    const discount = await calculateDiscount(body.code, pricing.subtotal);
    if (!discount.valid) return Response.json({ error: discount.error }, { status: 400 });
    const shipping = pricing.subtotal - discount.discountAmount >= 10000 ? 0 : 800;
    return Response.json({ code: discount.code, discountAmount: discount.discountAmount, shippingAmount: shipping, total: pricing.subtotal - discount.discountAmount + shipping }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Discount validation failed", error);
    return Response.json({ error: "Discount codes are temporarily unavailable." }, { status: 502 });
  }
}