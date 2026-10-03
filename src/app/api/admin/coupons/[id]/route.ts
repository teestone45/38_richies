import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage discount codes." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required to manage discount codes." }, { status: 503 });

  const { id } = await params;
  if (!/^coupon-[a-z0-9_-]{3,24}$/.test(id)) return Response.json({ error: "Discount code not found." }, { status: 404 });
  let body: { active?: unknown };
  try {
    body = await request.json() as { active?: unknown };
  } catch {
    return Response.json({ error: "Invalid discount update." }, { status: 400 });
  }
  if (typeof body.active !== "boolean") return Response.json({ error: "Choose whether the discount code is active." }, { status: 400 });
  try {
    const exists = await client.fetch<boolean>(`defined(*[_type == "coupon" && _id == $id][0]._id)`, { id });
    if (!exists) return Response.json({ error: "Discount code not found." }, { status: 404 });
    await client.patch(id).set({ active: body.active }).commit();
    return Response.json({ updated: true });
  } catch (error) {
    console.error("Coupon update failed", error);
    return Response.json({ error: "Could not update the discount code." }, { status: 502 });
  }
}