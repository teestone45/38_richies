import { randomUUID } from "node:crypto";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { priceCheckoutCart } from "@/lib/checkout-pricing";
import { calculateDiscount } from "@/lib/discounts";

type CheckoutRequest = {
  items?: unknown;
  customer?: { email?: unknown; name?: unknown; phone?: unknown; address?: unknown; city?: unknown; region?: unknown };
  discountCode?: unknown;
};

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > 16_384) return Response.json({ error: "Checkout request is too large." }, { status: 413 });

  const secretKey = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secretKey) {
    return Response.json({ error: "Paystack checkout is not configured yet. Add PAYSTACK_SECRET_KEY to the server environment." }, { status: 503 });
  }

  let body: CheckoutRequest;
  try {
    body = await request.json() as CheckoutRequest;
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (!body || typeof body !== "object") return Response.json({ error: "Invalid checkout request." }, { status: 400 });

  const customer = body.customer;
  const email = typeof customer?.email === "string" ? customer.email.trim().toLowerCase() : "";
  const name = typeof customer?.name === "string" ? customer.name.trim() : "";
  const phone = typeof customer?.phone === "string" ? customer.phone.trim() : "";
  const address = typeof customer?.address === "string" ? customer.address.trim() : "";
  const city = typeof customer?.city === "string" ? customer.city.trim() : "";
  const region = typeof customer?.region === "string" ? customer.region.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name || name.length > 120 || !phone || phone.length > 40 || !address || address.length > 300 || !city || city.length > 80 || !region || region.length > 80) {
    return Response.json({ error: "Enter a valid email, contact number, and complete Ghana delivery address." }, { status: 400 });
  }

  try {
    const pricing = await priceCheckoutCart(body.items);
    if (!pricing.ok) return Response.json({ error: pricing.error }, { status: pricing.status });
    if (body.discountCode !== undefined && typeof body.discountCode !== "string") return Response.json({ error: "Invalid discount code." }, { status: 400 });
    const discountCode = typeof body.discountCode === "string" ? body.discountCode.trim() : "";
    const discount = discountCode ? await calculateDiscount(discountCode, pricing.subtotal) : undefined;
    if (discount && !discount.valid) return Response.json({ error: discount.error }, { status: 400 });
    const discountAmount = discount?.valid ? discount.discountAmount : 0;
    const discountedSubtotal = pricing.subtotal - discountAmount;
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const shipping = discountedSubtotal >= 10000 ? 0 : 800;
    const shippingAddress = [name, phone, address, city, region, "Ghana"].join("\n");
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: name.split(/\s+/)[0],
        last_name: name.split(/\s+/).slice(1).join(" "),
        phone,
        amount: String(discountedSubtotal + shipping),
        currency: "GHS",
        reference: `38r-${randomUUID()}`,
        callback_url: `${origin}/success`,
        metadata: JSON.stringify({
          items: pricing.items,
          shippingAddress,
          customerName: name,
          subtotal: pricing.subtotal,
          shippingAmount: shipping,
          discountAmount,
          couponId: discount?.valid ? discount.couponId : "",
          couponCode: discount?.valid ? discount.code : "",
        }),
      }),
    });

    const result = await response.json().catch(() => ({})) as { status?: boolean; message?: string; data?: { authorization_url?: string } };
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      const reason = typeof result.message === "string" ? result.message.slice(0, 200) : `HTTP ${response.status}`;
      console.error("Paystack transaction initialization failed", response.status, reason);
      return Response.json({ error: `Paystack could not start checkout: ${reason}` }, { status: 502 });
    }
    return Response.json({ url: result.data.authorization_url });
  } catch (error) {
    console.error("Paystack checkout request failed", error);
    return Response.json({ error: "Secure checkout could not be started. Please try again." }, { status: 502 });
  }
}