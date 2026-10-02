import { revalidatePath } from "next/cache";
import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getStarterProductBySlug } from "@/lib/products";
import { getSanityAdminClient } from "@/lib/sanity-admin";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage products." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Sanity write access is required for bulk changes." }, { status: 503 });

  let body: { ids?: unknown; active?: unknown; featured?: unknown };
  try {
    body = await request.json() as { ids?: unknown; active?: unknown; featured?: unknown };
  } catch {
    return Response.json({ error: "Invalid bulk update." }, { status: 400 });
  }
  if (!Array.isArray(body.ids) || body.ids.length === 0 || body.ids.length > 100 || body.ids.some((id) => typeof id !== "string")) {
    return Response.json({ error: "Select between 1 and 100 products." }, { status: 400 });
  }
  const changes: Record<string, boolean> = {};
  if (body.active !== undefined && typeof body.active === "boolean") changes.active = body.active;
  if (body.featured !== undefined && typeof body.featured === "boolean") changes.featured = body.featured;
  if (!Object.keys(changes).length) return Response.json({ error: "Choose a bulk action." }, { status: 400 });

  try {
    const transaction = client.transaction();
    const starterDocuments: ({ _id: string; _type: string } & Record<string, unknown>)[] = [];
    const updates: { id: string; local: boolean }[] = [];
    for (const id of body.ids as string[]) {
      if (!/^(local-)?[A-Za-z0-9._-]{1,128}$/.test(id)) return Response.json({ error: "One or more product IDs are invalid." }, { status: 400 });
      const localSlug = id.startsWith("local-") ? id.slice(6) : null;
      const starter = localSlug ? getStarterProductBySlug(localSlug) : undefined;
      if (localSlug && !starter) return Response.json({ error: "One of the selected starter products no longer exists." }, { status: 404 });
      if (starter) {
        const documentId = `product-${starter.slug}`;
        starterDocuments.push({
          _type: "product",
          _id: documentId,
          title: starter.title,
          slug: { _type: "slug", current: starter.slug },
          price: starter.priceCents / 100,
          description: starter.description,
          image: starter.image,
          category: starter.category,
          badge: starter.badge,
          sizes: starter.sizes,
          dtfPlacement: starter.dtfPlacement,
          fabric: starter.fabric,
          printMethod: starter.printMethod ?? "DTF",
          ...(starter.artwork ? { artwork: { _type: "artwork", ...starter.artwork } } : {}),
          active: true,
          removed: false,
        });
        updates.push({ id: documentId, local: true });
      } else {
        updates.push({ id, local: false });
      }
    }

    for (const document of starterDocuments) transaction.createIfNotExists(document);
    for (const product of updates) transaction.patch(product.id, (patch) => patch.set(changes));
    await transaction.commit();
    revalidatePath("/");
    revalidatePath("/product/[slug]", "page");
    return Response.json({ updated: updates.length });
  } catch (error) {
    console.error("Bulk product update failed", error);
    return Response.json({ error: "Could not apply the bulk changes." }, { status: 502 });
  }
}