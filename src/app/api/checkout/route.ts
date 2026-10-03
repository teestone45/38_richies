import { randomUUID } from "node:crypto";
import { getProductBySlug } from "@/lib/products";

type CheckoutRequest = {
  items?: { productId?: unknown; size?: unknown; color?: unknown; quantity?: unknown }[];
  customer?: { email?: unknown; name?: unknown; phone?: unknown; address?: unknown; city?: unknown; region?: unknown };
};

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Paystack checkout is not configured yet. Add PAYSTACK_SECRET_KEY to the server environment." }, { status: 503 });
  }

  let body: CheckoutRequest;
  try {
    body = await request.json() as CheckoutRequest;
  } catch {
    return Response.json({ error: "Invalid checkout request." }, { status: 400 });
  }

  if (!body || !Array.isArray(body.items) || body.items.length === 0 || body.items.length > 20) {
    return Response.json({ error: "Your bag is empty or contains too many line items." }, { status: 400 });
  }

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

  const items: { slug: string; size: string; color: string; quantity: number; unitAmount: number }[] = [];
  let subtotal = 0;
  for (const item of body.items) {
    if (!item || typeof item.productId !== "string" || typeof item.size !== "string" || !Number.isInteger(item.quantity) || (item.quantity as number) < 1 || (item.quantity as number) > 10) {
      return Response.json({ error: "One or more items in your bag are invalid." }, { status: 400 });
    }

    const selectedColor = typeof item.color === "string" && item.color.trim() ? item.color.trim() : "Default";
    const product = await getProductBySlug(item.productId);
    if (!product || !product.sizes.includes(item.size)) {
      return Response.json({ error: "One of the selected products or sizes is no longer available." }, { status: 400 });
    }
    if (product.colors?.length && !product.colors.includes(selectedColor)) {
      return Response.json({ error: `${product.title} does not offer the selected color.` }, { status: 400 });
    }
    if (product.inventory && (product.inventory[item.size] ?? 0) < (item.quantity as number)) {
      return Response.json({ error: `${product.title} in size ${item.size} does not have enough stock.` }, { status: 409 });
    }
    items.push({
      slug: product.slug,
      size: item.size,
      color: selectedColor,
      quantity: item.quantity as number,
      unitAmount: product.priceCents,
    });
    subtotal += product.priceCents * (item.quantity as number);
  }

  try {
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const shipping = subtotal >= 10000 ? 0 : 800;
    const shippingAddress = [name, phone, address, city, region, "Ghana"].join("\n");
    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${secretKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        first_name: name.split(/\s+/)[0],
        last_name: name.split(/\s+/).slice(1).join(" "),
        phone,
        amount: String(subtotal + shipping),
        currency: "GHS",
        reference: `38r-${randomUUID()}`,
        callback_url: `${origin}/success`,
        metadata: JSON.stringify({ items, shippingAddress, customerName: name }),
      }),
    });

    const result = await response.json() as { status?: boolean; data?: { authorization_url?: string } };
    if (!response.ok || !result.status || !result.data?.authorization_url) {
      console.error("Paystack transaction initialization failed", response.status);
      return Response.json({ error: "Paystack could not start checkout. Check your account configuration and try again." }, { status: 502 });
    }
    return Response.json({ url: result.data.authorization_url });
  } catch (error) {
    console.error("Paystack checkout request failed", error);
    return Response.json({ error: "Secure checkout could not be started. Please try again." }, { status: 502 });
  }
}