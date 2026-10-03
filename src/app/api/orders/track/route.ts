import { isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type TrackRequest = { reference?: unknown; email?: unknown };

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2048) return Response.json({ error: "Invalid tracking request." }, { status: 413 });

  let parsedBody: unknown;
  try {
    parsedBody = await request.json() as unknown;
  } catch {
    return Response.json({ error: "Enter your order reference and checkout email." }, { status: 400 });
  }
  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) return Response.json({ error: "Invalid tracking request." }, { status: 400 });

  const body = parsedBody as TrackRequest;
  const reference = typeof body.reference === "string" ? body.reference.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[A-Za-z0-9_-]{5,128}$/.test(reference) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ error: "Enter a valid order reference and checkout email." }, { status: 400 });
  }

  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 503 });

  try {
    const order = await client.fetch<{
      paymentReference?: string;
      stripeSessionId?: string;
      email?: string;
      items?: { title: string; size: string; color?: string; quantity: number }[];
      status?: string;
      trackingNumber?: string;
      createdAt?: string;
    } | null>(`*[_type == "order" && (paymentReference == $reference || stripeSessionId == $reference)][0]{paymentReference, stripeSessionId, email, items[]{title, size, color, quantity}, status, trackingNumber, createdAt}`, { reference });

    if (!order || order.email?.trim().toLowerCase() !== email) {
      return Response.json({ error: "We couldn't find an order with those details." }, { status: 404, headers: { "Cache-Control": "no-store" } });
    }

    return Response.json({
      order: {
        reference: order.paymentReference ?? order.stripeSessionId ?? reference,
        items: order.items ?? [],
        status: order.status ?? "paid",
        trackingNumber: order.trackingNumber ?? "",
        createdAt: order.createdAt ?? "",
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order tracking lookup failed", error);
    return Response.json({ error: "Order tracking is temporarily unavailable." }, { status: 502 });
  }
}