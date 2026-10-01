import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const statuses = ["paid", "packing", "shipped", "cancelled", "inventory_issue"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to update orders." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to update orders." }, { status: 503 });

  const { id } = await params;
  if (!/^order-[A-Za-z0-9_-]{5,128}$/.test(id)) return Response.json({ error: "Invalid order ID." }, { status: 400 });
  let body: { status?: unknown; trackingNumber?: unknown };
  try {
    body = await request.json() as { status?: unknown; trackingNumber?: unknown };
  } catch {
    return Response.json({ error: "Invalid order update." }, { status: 400 });
  }

  const update: Record<string, string> = {};
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !statuses.includes(body.status as typeof statuses[number])) return Response.json({ error: "Choose a valid fulfillment status." }, { status: 400 });
    update.status = body.status;
  }
  if (body.trackingNumber !== undefined) {
    if (typeof body.trackingNumber !== "string" || body.trackingNumber.length > 120) return Response.json({ error: "Tracking number must be 120 characters or fewer." }, { status: 400 });
    update.trackingNumber = body.trackingNumber.trim();
  }
  if (!Object.keys(update).length) return Response.json({ error: "No order changes provided." }, { status: 400 });

  try {
    const order = await client.fetch<{ _id: string; status: string; email?: string; stripeSessionId?: string; items?: { title: string; size: string; quantity: number }[] } | null>(`*[_type == "order" && _id == $id][0]{_id, status, email, stripeSessionId, items}`, { id });
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    await client.patch(id).set(update).commit();
    let emailSent = false;
    if (update.status === "shipped" && order.status !== "shipped" && order.email && process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM) {
      const tracking = update.trackingNumber ?? "";
      const itemList = (order.items ?? []).map((item) => `${item.quantity} x ${item.title} / ${item.size}`).join("\n");
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.ORDER_EMAIL_FROM,
          to: [order.email],
          subject: `Your 38 RICHES order has shipped`,
          text: `Your order ${order.stripeSessionId ?? id} is on its way.\n${tracking ? `Tracking: ${tracking}\n` : ""}\n${itemList}`,
        }),
      });
      emailSent = response.ok;
    }
    return Response.json({ updated: true, emailSent });
  } catch (error) {
    console.error("Admin order update failed", error);
    return Response.json({ error: "Could not update the order." }, { status: 502 });
  }
}