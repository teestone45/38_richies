import Stripe from "stripe";
import { formatCurrency } from "@/lib/currency";
import { getProductBySlug } from "@/lib/products";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type StockVariant = { size: string; quantity: number };
type SanityProduct = { _id: string; _rev: string; title: string; inventory?: StockVariant[] };
type OrderLine = { productId: string; title: string; size: string; color: string; quantity: number; unitAmount: number };

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  const signingHeader = request.headers.get("stripe-signature");
  const sanity = getSanityAdminClient();
  if (!webhookSecret || !stripeSecret || !sanity) return Response.json({ error: "Stripe webhook or Sanity order storage is not configured." }, { status: 503 });
  if (!signingHeader) return Response.json({ error: "Missing Stripe signature." }, { status: 400 });

  const stripe = new Stripe(stripeSecret);
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(await request.text(), signingHeader, webhookSecret);
  } catch {
    return Response.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") return Response.json({ received: true });
  const orderId = `order-${session.id}`;
  try {
    const priorOrder = await sanity.fetch<{ _id: string } | null>(`*[_type == "order" && _id == $id][0]{_id}`, { id: orderId });
    if (priorOrder) return Response.json({ received: true, duplicate: true });

    const itemCount = Number(session.metadata?.cart_count ?? 0);
    if (!Number.isInteger(itemCount) || itemCount < 1 || itemCount > 20) return Response.json({ error: "Checkout item metadata is invalid." }, { status: 400 });
    const stripeLines = await stripe.checkout.sessions.listLineItems(session.id, { limit: 100 });
    const orderItems: OrderLine[] = [];
    const inventoryByProduct = new Map<string, { product: SanityProduct; quantities: Map<string, number> }>();
    let inventoryIssue = false;

    for (let index = 0; index < itemCount; index += 1) {
      const raw = session.metadata?.[`item_${index}`] ?? "";
      const parts = raw.split("|");
      const [slug, size, colorValue, quantityText] = parts.length >= 4 ? parts : [parts[0], parts[1], "Default", parts[2]];
      const quantity = Number(quantityText);
      const color = colorValue && colorValue.trim() ? colorValue.trim() : "Default";
      if (!slug || !size || !Number.isInteger(quantity) || quantity < 1) return Response.json({ error: "Checkout item metadata is invalid." }, { status: 400 });

      const product = await sanity.fetch<SanityProduct | null>(`*[_type == "product" && slug.current == $slug && active != false && removed != true][0]{_id, _rev, title, inventory}`, { slug });
      const catalogProduct = product ? undefined : await getProductBySlug(slug);
      if (!product && !catalogProduct) {
        inventoryIssue = true;
        continue;
      }
      const title = product?.title ?? catalogProduct?.title ?? "38 RICHES item";
      const stripePrice = stripeLines.data[index]?.price;
      orderItems.push({
        productId: slug,
        title,
        size,
        color,
        quantity,
        unitAmount: typeof stripePrice === "object" && stripePrice ? stripePrice.unit_amount ?? 0 : 0,
      });

      if (!product?.inventory) continue;
      const quantities = inventoryByProduct.get(product._id)?.quantities ?? new Map<string, number>();
      quantities.set(size, (quantities.get(size) ?? 0) + quantity);
      inventoryByProduct.set(product._id, { product, quantities });
    }

    const inventoryUpdates: { id: string; revision: string; inventory: StockVariant[] }[] = [];
    for (const { product, quantities } of inventoryByProduct.values()) {
      const inventory = product.inventory ?? [];
      for (const [size, quantity] of quantities) {
        const variant = inventory.find((entry) => entry.size === size);
        if (!variant || variant.quantity < quantity) inventoryIssue = true;
      }
      if (!inventoryIssue) {
        inventoryUpdates.push({
          id: product._id,
          revision: product._rev,
          inventory: inventory.map((variant) => ({
            ...variant,
            quantity: variant.quantity - (quantities.get(variant.size) ?? 0),
          })),
        });
      }
    }

    const shippingDetails = session.collected_information?.shipping_details;
    const address = shippingDetails?.address;
    const shippingAddress = address
      ? [shippingDetails?.name, address.line1, address.line2, address.city, address.state, address.postal_code, address.country].filter(Boolean).join("\n")
      : "";
    const order = {
      _type: "order",
      _id: orderId,
      stripeSessionId: session.id,
      stripePaymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id,
      email: session.customer_details?.email ?? session.customer_email ?? "",
      items: orderItems,
      amountTotal: session.amount_total ?? 0,
      currency: session.currency ?? "ghs",
      status: inventoryIssue ? "inventory_issue" : "paid",
      shippingAddress,
      trackingNumber: "",
      createdAt: new Date().toISOString(),
    };

    let transaction = sanity.transaction().create(order);
    if (!inventoryIssue) {
      for (const update of inventoryUpdates) {
        transaction = transaction.patch(sanity.patch(update.id).ifRevisionId(update.revision).set({ inventory: update.inventory }));
      }
    }
    await transaction.commit();

    if (inventoryIssue && typeof session.payment_intent === "string") {
      await stripe.refunds.create({ payment_intent: session.payment_intent, reason: "requested_by_customer", metadata: { orderId, reason: "stock_unavailable" } });
    }

    const email = session.customer_details?.email ?? session.customer_email;
    if (!inventoryIssue && email && process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM) {
      const emailResponse = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.ORDER_EMAIL_FROM,
          to: [email],
          subject: `38 RICHES order ${session.id}`,
          text: `Thanks for your order. Your paid order total is ${formatCurrency((session.amount_total ?? 0) / 100, session.currency?.toUpperCase() ?? "GHS")}. Order reference: ${session.id}`,
        }),
      });
      if (emailResponse.ok) await sanity.patch(orderId).set({ emailNotifiedAt: new Date().toISOString() }).commit();
      else console.error("Resend order confirmation returned", emailResponse.status);
    }
    return Response.json({ received: true });
  } catch (error) {
    const existingOrder = await sanity.fetch<{ _id: string } | null>(`*[_type == "order" && _id == $id][0]{_id}`, { id: orderId }).catch(() => null);
    if (existingOrder) return Response.json({ received: true, duplicate: true });
    console.error("Stripe order processing failed", error);
    return Response.json({ error: "Order processing failed; Stripe should retry this event." }, { status: 500 });
  }
}