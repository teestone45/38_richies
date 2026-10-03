import { redirect } from "next/navigation";
import { hashRestockValue } from "@/lib/restock";
import { getSanityAdminClient } from "@/lib/sanity-admin";

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Invalid confirmation link." }, { status: 400 });
  const token = new URL(request.url).searchParams.get("token") ?? "";
  if (token.length < 32 || token.length > 100) return Response.json({ error: "This confirmation link is invalid or expired." }, { status: 400 });

  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Restock confirmation is temporarily unavailable." }, { status: 503 });
  try {
    const alert = await client.fetch<{ _id: string } | null>(`*[_type == "restockAlert" && productSlug == $slug && tokenHash == $tokenHash && verified != true && tokenExpiresAt > $now][0]{_id}`, {
      slug,
      tokenHash: hashRestockValue(token),
      now: new Date().toISOString(),
    });
    if (!alert) return Response.json({ error: "This confirmation link is invalid or expired." }, { status: 400 });
    await client.patch(alert._id).set({ active: true, verified: true, confirmedAt: new Date().toISOString() }).unset(["tokenHash", "tokenExpiresAt"]).commit();
  } catch (error) {
    console.error("Restock confirmation failed", error);
    return Response.json({ error: "Restock confirmation is temporarily unavailable." }, { status: 502 });
  }

  const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? request.url).origin;
  return redirect(`${origin}/product/${slug}?restock=confirmed`);
}