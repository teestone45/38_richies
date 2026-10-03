import { hasAdminSession } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const ordersQuery = `*[_type == "order"] | order(createdAt desc) {
  _id,
  paymentProvider,
  paymentReference,
  stripeSessionId,
  email,
  items,
  amountTotal,
  currency,
  status,
  shippingAddress,
  trackingNumber,
  createdAt,
  emailNotifiedAt
}`;

export async function GET(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to view orders." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to store orders." }, { status: 503 });
  try {
    const orders = await client.fetch(ordersQuery);
    return Response.json({ orders }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Admin order query failed", error);
    return Response.json({ error: "Could not load orders." }, { status: 502 });
  }
}