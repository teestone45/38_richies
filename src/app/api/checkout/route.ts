import Stripe from "stripe";
import { getProductBySlug } from "@/lib/products";

type CheckoutRequest = {
  items?: { productId?: unknown; size?: unknown; color?: unknown; quantity?: unknown }[];
};

export async function POST(request: Request) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return Response.json({ error: "Secure checkout is not configured yet. Add STRIPE_SECRET_KEY to the deployment environment." }, { status: 503 });
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

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  const sessionMetadata: Record<string, string> = { cart_count: String(body.items.length) };
  for (const [index, item] of body.items.entries()) {
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
    sessionMetadata[`item_${index}`] = `${product.slug}|${item.size}|${selectedColor}|${item.quantity}`;

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: { name: `${product.title} / ${item.size} / ${selectedColor}`, metadata: { product_slug: product.slug, size: item.size, color: selectedColor } },
        unit_amount: product.priceCents,
      },
      quantity: item.quantity as number,
    });
  }

  try {
    const stripe = new Stripe(secretKey);
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price_data?.unit_amount ?? 0) * (item.quantity ?? 0), 0);
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      allow_promotion_codes: true,
      metadata: sessionMetadata,
      automatic_tax: { enabled: process.env.STRIPE_AUTOMATIC_TAX === "true" },
      shipping_address_collection: { allowed_countries: ["US"] },
      shipping_options: [{
        shipping_rate_data: {
          type: "fixed_amount",
          fixed_amount: { amount: subtotal >= 10000 ? 0 : 800, currency: "usd" },
          display_name: subtotal >= 10000 ? "Complimentary US shipping" : "US standard shipping",
          delivery_estimate: {
            minimum: { unit: "business_day", value: 3 },
            maximum: { unit: "business_day", value: 7 },
          },
        },
      }],
      success_url: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/cart`,
    });

    if (!session.url) return Response.json({ error: "Stripe did not return a checkout link." }, { status: 502 });
    return Response.json({ url: session.url });
  } catch (error) {
    console.error("Stripe checkout session creation failed", error);
    return Response.json({ error: "Secure checkout could not be started. Please try again." }, { status: 502 });
  }
}