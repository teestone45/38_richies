import { randomBytes } from "node:crypto";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { hashRestockValue } from "@/lib/restock";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type RestockRequest = { email?: unknown; size?: unknown; website?: unknown };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Product not found." }, { status: 404 });

  let parsedBody: unknown;
  try {
    parsedBody = await request.json() as unknown;
  } catch {
    return Response.json({ error: "Invalid restock request." }, { status: 400 });
  }
  if (!parsedBody || typeof parsedBody !== "object" || Array.isArray(parsedBody)) return Response.json({ error: "Invalid restock request." }, { status: 400 });
  const body = parsedBody as RestockRequest;
  if (typeof body.website === "string" && body.website.trim()) return Response.json({ subscribed: true }, { status: 201 });
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const size = typeof body.size === "string" ? body.size.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || size.length < 1 || size.length > 20) return Response.json({ error: "Enter a valid email and choose a size." }, { status: 400 });
  if (!process.env.RESEND_API_KEY || !process.env.ORDER_EMAIL_FROM || !process.env.NEXT_PUBLIC_SITE_URL) return Response.json({ error: "Restock alerts are temporarily unavailable." }, { status: 503 });

  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Restock alerts are temporarily unavailable." }, { status: 503 });

  try {
    const product = await client.fetch<{ _id: string; title: string; sizes?: string[]; inventory?: { size: string; quantity: number }[] } | null>(`*[_type == "product" && slug.current == $slug && active != false && removed != true][0]{_id, title, sizes, inventory}`, { slug });
    if (!product || !product.sizes?.includes(size)) return Response.json({ error: "That product size is unavailable." }, { status: 404 });
    const variant = product.inventory?.find((item) => item.size === size);
    if (!variant) return Response.json({ error: "Restock alerts are only available for tracked sizes." }, { status: 400 });
    if (variant.quantity > 0) return Response.json({ error: "This size is already in stock." }, { status: 409 });

    const id = `restock-${hashRestockValue(`${slug}|${size}|${email}`).slice(0, 48)}`;
    const existing = await client.fetch<{ active?: boolean; verified?: boolean } | null>(`*[_type == "restockAlert" && _id == $id][0]{active, verified}`, { id });
    if (existing?.active && existing.verified) return Response.json({ subscribed: true, message: "This email is already subscribed for this size." }, { status: 201 });
    const now = new Date().toISOString();
    const subscriberCount = await client.fetch<number>(`count(*[_type == "restockAlert" && productSlug == $slug && size == $size && (active == true || tokenExpiresAt > $now)])`, { slug, size, now });
    if (subscriberCount >= 20 && !existing) return Response.json({ error: "Restock alerts are full for this size. Please check back on the product page." }, { status: 429 });

    const token = randomBytes(32).toString("base64url");
    const tokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const siteOrigin = new URL(process.env.NEXT_PUBLIC_SITE_URL).origin;
    const confirmationUrl = `${siteOrigin}/api/products/${encodeURIComponent(slug)}/restock/confirm?token=${encodeURIComponent(token)}`;
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.ORDER_EMAIL_FROM,
        to: [email],
        subject: `Confirm your ${product.title} restock alert`,
        text: `Confirm that you want a restock alert for ${product.title} in size ${size}: ${confirmationUrl}. This link expires in 24 hours.`,
      }),
    });
    if (!response.ok) return Response.json({ error: "Could not send the confirmation email. Please try again later." }, { status: 502 });
    await client.createOrReplace({
      _id: id,
      _type: "restockAlert",
      email,
      productSlug: slug,
      productTitle: product.title,
      size,
      active: false,
      verified: false,
      tokenHash: hashRestockValue(token),
      tokenExpiresAt,
      createdAt: new Date().toISOString(),
    });
    return Response.json({ subscribed: true, message: "Check your email to confirm the restock alert." }, { status: 201 });
  } catch (error) {
    console.error("Restock subscription failed", error);
    return Response.json({ error: "Could not create the restock alert." }, { status: 502 });
  }
}