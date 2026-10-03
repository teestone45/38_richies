import { formatCurrency } from "@/lib/currency";
import { getProductBySlug } from "@/lib/products";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type PaystackCartItem = { slug: string; size: string; color: string; quantity: number; unitAmount: number };
type PaystackMetadata = {
  items?: PaystackCartItem[];
  shippingAddress?: string;
  customerName?: string;
  discountAmount?: number;
  shippingAmount?: number;
  couponId?: string;
  couponCode?: string;
};
type PaystackTransaction = {
  id: number;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  metadata?: string | PaystackMetadata | null;
  customer?: { email?: string | null };
};
type SanityProduct = { _id: string; _rev: string; title: string; sizes?: string[]; inventory?: { size: string; quantity: number }[] };

function parseMetadata(value: PaystackTransaction["metadata"]): PaystackMetadata | null {
  try {
    const metadata = typeof value === "string" ? JSON.parse(value) as unknown : value;
    return typeof metadata === "object" && metadata !== null ? metadata as PaystackMetadata : null;
  } catch {
    return null;
  }
}

export async function verifyPaystackTransaction(reference: string) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  if (!secretKey || !/^[A-Za-z0-9_.=-]{5,100}$/.test(reference)) return null;

  const response = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
    headers: { Authorization: `Bearer ${secretKey}` },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Paystack verification returned ${response.status}.`);

  const result = await response.json() as { status?: boolean; data?: PaystackTransaction };
  const transaction = result.data;
  if (!result.status || !transaction || transaction.reference !== reference || transaction.status !== "success" || transaction.currency !== "GHS") return null;
  return transaction;
}

export async function recordPaystackOrder(transaction: PaystackTransaction) {
  const sanity = getSanityAdminClient();
  if (!sanity) throw new Error("Sanity order storage is not configured.");

  const metadata = parseMetadata(transaction.metadata);
  const cartItems = metadata?.items;
  if (!Array.isArray(cartItems) || cartItems.length < 1 || cartItems.length > 20) throw new Error("Paystack transaction metadata is invalid.");
  const items: PaystackCartItem[] = [];
  let subtotal = 0;
  for (const item of cartItems) {
    if (!item || typeof item.slug !== "string" || typeof item.size !== "string" || typeof item.color !== "string" || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 10 || !Number.isInteger(item.unitAmount) || item.unitAmount < 1) {
      throw new Error("Paystack transaction item metadata is invalid.");
    }
    items.push(item);
    subtotal += item.unitAmount * item.quantity;
  }
  const discountAmount = metadata?.discountAmount ?? 0;
  const expectedShipping = subtotal - discountAmount >= 10000 ? 0 : 800;
  const shippingAmount = metadata?.shippingAmount ?? expectedShipping;
  const couponId = metadata?.couponId ?? "";
  const couponCode = metadata?.couponCode ?? "";
  if (!Number.isInteger(discountAmount) || discountAmount < 0 || discountAmount > subtotal || !Number.isInteger(shippingAmount) || shippingAmount !== expectedShipping || (discountAmount > 0 && !couponId)) {
    throw new Error("Paystack discount or shipping metadata is invalid.");
  }
  const expectedAmount = subtotal - discountAmount + shippingAmount;
  if (!Number.isInteger(transaction.amount) || transaction.amount !== expectedAmount) throw new Error("Paystack transaction amount does not match the order.");

  const orderId = `order-${transaction.reference}`;
  const priorOrder = await sanity.fetch<{ _id: string } | null>(`*[_type == "order" && _id == $id][0]{_id}`, { id: orderId });
  if (priorOrder) return { duplicate: true };

  const orderItems: { productId: string; title: string; size: string; color: string; quantity: number; unitAmount: number }[] = [];
  const inventoryByProduct = new Map<string, { product: SanityProduct; quantities: Map<string, number> }>();
  let inventoryIssue = false;

  for (const item of items) {
    const product = await sanity.fetch<SanityProduct | null>(`*[_type == "product" && slug.current == $slug && active != false && removed != true][0]{_id, _rev, title, sizes, inventory}`, { slug: item.slug });
    const catalogProduct = product ? undefined : await getProductBySlug(item.slug);
    if (!product && !catalogProduct) inventoryIssue = true;
    if ((product?.sizes ?? catalogProduct?.sizes) && !(product?.sizes ?? catalogProduct?.sizes)?.includes(item.size)) inventoryIssue = true;
    orderItems.push({ productId: item.slug, title: product?.title ?? catalogProduct?.title ?? item.slug, size: item.size, color: item.color, quantity: item.quantity, unitAmount: item.unitAmount });

    if (!product?.inventory) continue;
    const quantities = inventoryByProduct.get(product._id)?.quantities ?? new Map<string, number>();
    quantities.set(item.size, (quantities.get(item.size) ?? 0) + item.quantity);
    inventoryByProduct.set(product._id, { product, quantities });
  }

  const inventoryUpdates: { id: string; revision: string; inventory: { size: string; quantity: number }[] }[] = [];
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
        inventory: inventory.map((variant) => ({ ...variant, quantity: variant.quantity - (quantities.get(variant.size) ?? 0) })),
      });
    }
  }

  const email = transaction.customer?.email ?? "";
  const order = {
    _type: "order",
    _id: orderId,
    paymentProvider: "paystack",
    paymentReference: transaction.reference,
    paystackTransactionId: String(transaction.id),
    email,
    items: orderItems,
    amountTotal: transaction.amount,
    currency: transaction.currency,
    ...(couponCode ? { couponCode } : {}),
    discountAmount,
    status: inventoryIssue ? "inventory_issue" : "paid",
    shippingAddress: metadata?.shippingAddress ?? "",
    trackingNumber: "",
    createdAt: new Date().toISOString(),
  };

  try {
    let transactionWrite = sanity.transaction().create(order);
    if (!inventoryIssue) {
      for (const update of inventoryUpdates) {
        transactionWrite = transactionWrite.patch(sanity.patch(update.id).ifRevisionId(update.revision).set({ inventory: update.inventory }));
      }
    }
    if (couponId && !inventoryIssue) transactionWrite = transactionWrite.patch(sanity.patch(couponId).inc({ usageCount: 1 }));
    await transactionWrite.commit();
  } catch (error) {
    const duplicate = await sanity.fetch<{ _id: string } | null>(`*[_type == "order" && _id == $id][0]{_id}`, { id: orderId }).catch(() => null);
    if (duplicate) return { duplicate: true };
    throw error;
  }

  if (inventoryIssue) {
    const refund = await fetch("https://api.paystack.co/refund", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ transaction: transaction.reference }),
    });
    if (!refund.ok) console.error("Paystack inventory-conflict refund request failed", refund.status);
  } else if (email && process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM) {
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM,
        to: [email],
        subject: `38 RICHES order ${transaction.reference}`,
        text: `Thanks for your order. Your paid order total is ${formatCurrency(transaction.amount / 100, "GHS")}. Order reference: ${transaction.reference}`,
      }),
    });
    if (emailResponse.ok) await sanity.patch(orderId).set({ emailNotifiedAt: new Date().toISOString() }).commit();
    else console.error("Resend order confirmation returned", emailResponse.status);
  }

  return { duplicate: false, inventoryIssue };
}