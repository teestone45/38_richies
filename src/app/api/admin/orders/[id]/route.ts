import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getOrderTrackingUrl } from "@/lib/order-reference";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const statuses = ["paid", "packing", "shipped", "delivered", "cancelled", "inventory_issue"] as const;

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to update orders." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to update orders." }, { status: 503 });

  const { id } = await params;
  if (!/^order-[A-Za-z0-9_-]{5,128}$/.test(id)) return Response.json({ error: "Invalid order ID." }, { status: 400 });
  let body: { status?: unknown; trackingNumber?: unknown; gpsLocation?: unknown };
  try {
    body = await request.json() as { status?: unknown; trackingNumber?: unknown; gpsLocation?: unknown };
  } catch {
    return Response.json({ error: "Invalid order update." }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (body.status !== undefined) {
    if (typeof body.status !== "string" || !statuses.includes(body.status as typeof statuses[number])) return Response.json({ error: "Choose a valid fulfillment status." }, { status: 400 });
    update.status = body.status;
  }
  if (body.trackingNumber !== undefined) {
    if (typeof body.trackingNumber !== "string" || body.trackingNumber.length > 120) return Response.json({ error: "Tracking number must be 120 characters or fewer." }, { status: 400 });
    update.trackingNumber = body.trackingNumber.trim();
  }
  if (body.gpsLocation !== undefined) {
    if (typeof body.gpsLocation !== "object" || body.gpsLocation === null || Array.isArray(body.gpsLocation)) return Response.json({ error: "Invalid GPS location." }, { status: 400 });
    const location = body.gpsLocation as Record<string, unknown>;
    if (typeof location.latitude !== "number" || !Number.isFinite(location.latitude) || location.latitude < -90 || location.latitude > 90 || typeof location.longitude !== "number" || !Number.isFinite(location.longitude) || location.longitude < -180 || location.longitude > 180 || typeof location.accuracy !== "number" || !Number.isFinite(location.accuracy) || location.accuracy < 0 || location.accuracy > 100000) {
      return Response.json({ error: "GPS latitude, longitude, or accuracy is invalid." }, { status: 400 });
    }
    update.gpsLocation = {
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      updatedAt: new Date().toISOString(),
    };
  }
  if (!Object.keys(update).length) return Response.json({ error: "No order changes provided." }, { status: 400 });

  try {
    const order = await client.fetch<{ _id: string; status: string; email?: string; orderNumber?: string; paymentReference?: string; stripeSessionId?: string; items?: { title: string; size: string; quantity: number }[] } | null>(`*[_type == "order" && _id == $id][0]{_id, status, email, orderNumber, paymentReference, stripeSessionId, items}`, { id });
    if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
    await client.patch(id).set(update).commit();
    let emailSent = false;
    if ((update.status === "shipped" || update.status === "delivered") && order.status !== update.status && order.email && process.env.RESEND_API_KEY && process.env.ORDER_EMAIL_FROM) {
      const tracking = update.trackingNumber ?? "";
      const itemList = (order.items ?? []).map((item) => `${item.quantity} x ${item.title} / ${item.size}`).join("\n");
      const orderNumber = order.orderNumber ?? order.paymentReference ?? order.stripeSessionId ?? id;
      const trackingUrl = getOrderTrackingUrl(orderNumber);
      const statusMessage = update.status === "delivered" ? "Your order has been delivered." : "Your order is on its way.";
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: process.env.ORDER_EMAIL_FROM,
          to: [order.email],
          subject: update.status === "delivered" ? "Your 38 RICHES order was delivered" : "Your 38 RICHES order has shipped",
          text: `${statusMessage} Order number: ${orderNumber}.\n${tracking ? `Tracking: ${tracking}\n` : ""}${trackingUrl ? `Track your order: ${trackingUrl}\n` : ""}\n${itemList}`,
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