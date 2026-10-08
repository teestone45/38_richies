import { createHash } from "node:crypto";
import { getSanityAdminClient } from "@/lib/sanity-admin";

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 8000) return Response.json({ error: "Your message is too long." }, { status: 413 });
    body = JSON.parse(text);
  } catch {
    return Response.json({ error: "Invalid support message." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Invalid support message." }, { status: 400 });
  }
  const fields = body as Record<string, unknown>;
  const name = typeof fields.name === "string" ? fields.name.trim() : "";
  const email = typeof fields.email === "string" ? fields.email.trim().toLowerCase() : "";
  const message = typeof fields.message === "string" ? fields.message.trim() : "";
  const reference = typeof fields.reference === "string" ? fields.reference.trim() : "";
  if (fields.website) return Response.json({ error: "Unable to accept this message." }, { status: 400 });
  if (!name || name.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    message.length < 10 || message.length > 3000 || reference.length > 100 || /[\r\n]/.test(reference)) {
    return Response.json({ error: "Enter your name, valid email, and a message of 10 to 3,000 characters." }, { status: 400 });
  }
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM || process.env.ORDER_EMAIL_FROM || "38 RICHES Support <onboarding@resend.dev>";
  const client = getSanityAdminClient();
  if (!apiKey || !from || !client) {
    console.error("Support email configuration is incomplete.");
    return Response.json({ error: "Support messaging is temporarily unavailable. Email 38richiesclothing@gmail.com directly." }, { status: 503 });
  }
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    const id = `support-limit-${createHash("sha256").update(ip).digest("hex").slice(0, 40)}`;
    const now = Date.now();
    const limit = await client.fetch<{ _rev: string; startedAt: number; count: number } | null>(
      `*[_id == $id][0]{_rev, startedAt, count}`, { id },
    );
    const active = Boolean(limit && now - limit.startedAt < 60 * 60 * 1000);
    if (active && limit!.count >= 5) {
      return Response.json({ error: "Too many messages. Please try again in an hour or email us directly." }, { status: 429 });
    }
    const counter = { startedAt: active ? limit!.startedAt : now, count: active ? limit!.count + 1 : 1 };
    try {
      if (limit) await client.patch(id).ifRevisionId(limit._rev).set(counter).commit();
      else await client.create({ _id: id, _type: "supportRateLimit", ...counter });
    } catch (error) {
      if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 409) {
        return Response.json({ error: "A message is already being submitted. Please try again shortly." }, { status: 429 });
      }
      throw error;
    }
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from,
        to: ["38richiesclothing@gmail.com"],
        reply_to: email,
        subject: "38 RICHES customer support",
        text: `Customer: ${name}\nEmail: ${email}\nOrder reference: ${reference || "Not provided"}\n\n${message}`,
      }),
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      console.error("Support email rejected by Resend", response.status);
      return Response.json({ error: "We could not send your message. Please email us directly or try again later." }, { status: 502 });
    }
    return Response.json({ sent: true });
  } catch (error) {
    console.error("Support message failed", error instanceof Error ? error.name : "Unknown error");
    return Response.json({ error: "We could not send your message. Please email us directly or try again later." }, { status: 502 });
  }
}
