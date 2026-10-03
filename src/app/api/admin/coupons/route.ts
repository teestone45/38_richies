import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const couponsQuery = `*[_type == "coupon"] | order(_createdAt desc){_id, code, discountType, discountValue, active, usageCount, maxUses, startsAt, expiresAt}`;

export async function GET(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage discount codes." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to manage discount codes." }, { status: 503 });
  try {
    const coupons = await client.fetch(couponsQuery);
    return Response.json({ coupons }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Coupon list failed", error);
    return Response.json({ error: "Could not load discount codes." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage discount codes." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to manage discount codes." }, { status: 503 });

  let body: unknown;
  try {
    body = await request.json() as unknown;
  } catch {
    return Response.json({ error: "Invalid discount code." }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return Response.json({ error: "Invalid discount code." }, { status: 400 });
  const input = body as Record<string, unknown>;
  const code = typeof input.code === "string" ? input.code.trim().toUpperCase() : "";
  const discountType = input.discountType;
  const discountValue = input.discountValue;
  const maxUses = input.maxUses === undefined || input.maxUses === "" || input.maxUses === null ? undefined : Number(input.maxUses);
  const startsAtInput = typeof input.startsAt === "string" && input.startsAt ? input.startsAt : undefined;
  const expiresAtInput = typeof input.expiresAt === "string" && input.expiresAt ? input.expiresAt : undefined;
  const startsAtDate = startsAtInput ? new Date(startsAtInput) : undefined;
  const expiresAtDate = expiresAtInput ? new Date(expiresAtInput) : undefined;
  const startsAt = startsAtDate && Number.isFinite(startsAtDate.getTime()) ? startsAtDate.toISOString() : undefined;
  const expiresAt = expiresAtDate && Number.isFinite(expiresAtDate.getTime()) ? expiresAtDate.toISOString() : undefined;
  if (!/^[A-Z0-9][A-Z0-9_-]{2,23}$/.test(code) || (discountType !== "percentage" && discountType !== "fixed") || typeof discountValue !== "number" || !Number.isFinite(discountValue) || discountValue <= 0 || (discountType === "percentage" ? discountValue > 100 : discountValue > 10000) || (maxUses !== undefined && (!Number.isInteger(maxUses) || maxUses < 1 || maxUses > 100000)) || (startsAtInput && !startsAt) || (expiresAtInput && !expiresAt) || (startsAt && expiresAt && Date.parse(expiresAt) <= Date.parse(startsAt))) {
    return Response.json({ error: "Check the code, discount value, use limit, and validity dates." }, { status: 400 });
  }

  try {
    const exists = await client.fetch<boolean>(`count(*[_type == "coupon" && upper(code) == $code]) > 0`, { code });
    if (exists) return Response.json({ error: "That discount code already exists." }, { status: 409 });
    const coupon = await client.create({
      _type: "coupon",
      _id: `coupon-${code.toLowerCase()}`,
      code,
      discountType,
      discountValue,
      active: true,
      usageCount: 0,
      ...(maxUses ? { maxUses } : {}),
      ...(startsAt ? { startsAt } : {}),
      ...(expiresAt ? { expiresAt } : {}),
    });
    return Response.json({ coupon: { _id: coupon._id, code, discountType, discountValue, active: true, usageCount: 0, maxUses, startsAt, expiresAt } }, { status: 201 });
  } catch (error) {
    console.error("Coupon creation failed", error);
    return Response.json({ error: "Could not create the discount code." }, { status: 502 });
  }
}