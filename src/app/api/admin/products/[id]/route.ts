import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getStarterProductBySlug } from "@/lib/products";
import { getSanityAdminClient } from "@/lib/sanity-admin";

function formText(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage products." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Add Sanity project, dataset, and write token settings to enable product management." }, { status: 503 });

  const { id } = await params;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id)) return Response.json({ error: "Invalid product ID." }, { status: 400 });

  const contentType = request.headers.get("content-type") ?? "";
  let form: FormData | null = null;
  let body: Record<string, unknown> = {};
  try {
    if (contentType.includes("multipart/form-data")) form = await request.formData();
    else body = await request.json() as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid product update." }, { status: 400 });
  }

  const raw = (name: string) => form ? form.get(name) : body[name];
  const has = (name: string) => (form ? form.has(name) : body[name] !== undefined);
  const stringValue = (name: string) => form ? formText(form, name) : typeof body[name] === "string" ? (body[name] as string).trim() : "";
  const update: Record<string, unknown> = {};

  if (has("title")) {
    const title = stringValue("title");
    if (!title || title.length > 120) return Response.json({ error: "Product name must be between 1 and 120 characters." }, { status: 400 });
    update.title = title;
  }
  if (has("slug")) {
    const slug = stringValue("slug").toLowerCase();
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Use lowercase letters, numbers, and hyphens for the product URL." }, { status: 400 });
    update.slug = { _type: "slug", current: slug };
  }
  if (has("price")) {
    const priceValue = raw("price");
    const price = typeof priceValue === "number" ? priceValue : Number(priceValue);
    if (!Number.isFinite(price) || price <= 0 || price > 10000 || Number(price.toFixed(2)) !== price) {
      return Response.json({ error: "Price must be a positive amount with no more than two decimal places." }, { status: 400 });
    }
    update.price = price;
  }
  for (const [field, limit] of [["description", 2000], ["category", 80], ["badge", 32], ["dtfPlacement", 160], ["fabric", 100]] as const) {
    if (has(field)) {
      const value = stringValue(field);
      if (value.length > limit || (field === "category" && !value)) return Response.json({ error: `Check the ${field} field.` }, { status: 400 });
      update[field] = value;
    }
  }
  if (has("sizes")) {
    const sizeValue = raw("sizes");
    const sizes = Array.isArray(sizeValue)
      ? sizeValue.filter((size): size is string => typeof size === "string").map((size) => size.trim()).filter(Boolean)
      : stringValue("sizes").split(",").map((size) => size.trim()).filter(Boolean);
    if (sizes.length === 0 || sizes.length > 12 || sizes.some((size) => size.length > 20)) return Response.json({ error: "Enter between 1 and 12 valid available sizes." }, { status: 400 });
    update.sizes = [...new Set(sizes)];
  }
  let stockUpdate: { _key: string; size: string; quantity: number }[] | undefined;
  if (has("stock")) {
    const stockValue = raw("stock");
    const pairs = typeof stockValue === "string"
      ? stockValue.split(",").map((entry) => {
          const [size, quantity] = entry.split(":").map((value) => value.trim());
          return { size, quantity: Number(quantity) };
        })
      : Array.isArray(stockValue)
        ? stockValue.filter((entry): entry is { size: string; quantity: number } => typeof entry === "object" && entry !== null && "size" in entry && "quantity" in entry && typeof entry.size === "string" && typeof entry.quantity === "number")
        : [];
    const stock = pairs.filter((entry) => entry.size);
    if (stock.some((entry) => !Number.isInteger(entry.quantity) || entry.quantity < 0) || stock.length > 12 || new Set(stock.map((entry) => entry.size)).size !== stock.length) {
      return Response.json({ error: "Stock must use unique sizes and non-negative whole numbers, for example M:4, L:2." }, { status: 400 });
    }
    stockUpdate = stock.map((entry) => ({ _key: entry.size, size: entry.size, quantity: entry.quantity }));
  }
  if (has("printMethod")) {
    const method = stringValue("printMethod");
    if (!["DTF", "DTG", "Embroidered"].includes(method)) return Response.json({ error: "Choose DTF, DTG, or Embroidered." }, { status: 400 });
    update.printMethod = method;
  }
  if (has("active")) {
    const activeValue = raw("active");
    const active = activeValue === true || activeValue === "true";
    if (!(activeValue === false || activeValue === true || activeValue === "true" || activeValue === "false")) return Response.json({ error: "Status must be Live or Draft." }, { status: 400 });
    update.active = active;
  }
  if (has("featured")) {
    const featuredValue = raw("featured");
    if (!(featuredValue === false || featuredValue === true || featuredValue === "true" || featuredValue === "false")) return Response.json({ error: "Featured must be true or false." }, { status: 400 });
    update.featured = featuredValue === true || featuredValue === "true";
  }

  const imageFiles = form ? [...form.getAll("images"), ...form.getAll("image")].filter((file): file is File => file instanceof File && file.size > 0) : [];
  if (imageFiles.length > 8 || imageFiles.some((image) => image.size > 8 * 1024 * 1024)) return Response.json({ error: "Upload up to 8 product photos, each 8 MB or smaller." }, { status: 413 });
  if (imageFiles.some((image) => !["image/jpeg", "image/png", "image/webp"].includes(image.type))) return Response.json({ error: "Use JPG, PNG, or WebP product photos." }, { status: 415 });
  if (Object.keys(update).length === 0 && imageFiles.length === 0) return Response.json({ error: "No changes were provided." }, { status: 400 });

  try {
    const localSlug = id.startsWith("local-") ? id.slice("local-".length) : null;
    const starter = localSlug ? getStarterProductBySlug(localSlug) : undefined;
    if (localSlug && !starter) return Response.json({ error: "Product not found." }, { status: 404 });
    const existing = localSlug
      ? await client.fetch<{ _id: string; slug: string; sizes?: string[] } | null>(`*[_type == "product" && slug.current == $slug && removed != true][0]{_id, "slug": slug.current, sizes}`, { slug: localSlug })
      : await client.fetch<{ _id: string; slug: string; sizes?: string[] } | null>(`*[_type == "product" && _id == $id][0]{_id, "slug": slug.current, sizes}`, { id });
    if (!existing && !starter) return Response.json({ error: "Product not found." }, { status: 404 });
    if (stockUpdate) {
      const allowedSizes = (update.sizes as string[] | undefined) ?? existing?.sizes ?? starter?.sizes;
      if (allowedSizes && stockUpdate.some((entry) => !allowedSizes.includes(entry.size))) return Response.json({ error: "Stock sizes must match the available sizes." }, { status: 400 });
      if (allowedSizes && stockUpdate.length > 0 && (stockUpdate.length !== allowedSizes.length || allowedSizes.some((size) => !stockUpdate?.some((entry) => entry.size === size)))) {
        return Response.json({ error: "Enter stock for every available size, for example M:4, L:2." }, { status: 400 });
      }
      update.inventory = stockUpdate;
    }
    const targetId = existing?._id ?? `product-${localSlug}`;
    if (typeof update.slug === "object" && update.slug !== null) {
      const slug = (update.slug as { current: string }).current;
      const duplicate = await client.fetch<boolean>(`count(*[_type == "product" && slug.current == $slug && _id != $id && removed != true]) > 0`, { slug, id: targetId });
      if (duplicate) return Response.json({ error: "That product URL slug is already in use." }, { status: 409 });
    }
    if (imageFiles.length > 0) {
      const assets = await Promise.all(imageFiles.map(async (image) => client.assets.upload("image", Buffer.from(await image.arrayBuffer()), { filename: image.name, contentType: image.type })));
      update.images = assets.map((asset) => ({ _type: "image", asset: { _type: "reference", _ref: asset._id } }));
    }
    if (existing) {
      await client.patch(targetId).set({ ...update, removed: false }).commit();
    } else if (starter) {
      const starterDocument = {
        _type: "product",
        _id: targetId,
        title: starter.title,
        slug: { _type: "slug", current: starter.slug },
        price: starter.priceCents / 100,
        description: starter.description,
        image: starter.image,
        images: undefined,
        category: starter.category,
        badge: starter.badge,
        sizes: starter.sizes,
        dtfPlacement: starter.dtfPlacement,
        fabric: starter.fabric,
        printMethod: starter.printMethod ?? "DTF",
        artwork: starter.artwork ? { _type: "artwork", ...starter.artwork } : undefined,
        inventory: starter.inventory ? Object.entries(starter.inventory).map(([size, quantity]) => ({ _key: size, size, quantity })) : undefined,
        featured: starter.featured ?? false,
        active: true,
        removed: false,
      };
      await client.create({ ...starterDocument, ...update, _id: targetId, _type: "product" });
    }
    return Response.json({ updated: true });
  } catch (error) {
    console.error("Sanity product update failed", error);
    return Response.json({ error: "Could not update this product in Sanity." }, { status: 502 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage products." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Add Sanity project, dataset, and write token settings to enable product management." }, { status: 503 });

  const { id } = await params;
  if (!/^[A-Za-z0-9._-]{1,128}$/.test(id)) return Response.json({ error: "Invalid product ID." }, { status: 400 });
  try {
    const localSlug = id.startsWith("local-") ? id.slice("local-".length) : null;
    const starter = localSlug ? getStarterProductBySlug(localSlug) : undefined;
    if (localSlug && !starter) return Response.json({ error: "Product not found." }, { status: 404 });
    const existing = localSlug
      ? await client.fetch<{ _id: string } | null>(`*[_type == "product" && slug.current == $slug][0]{_id}`, { slug: localSlug })
      : await client.fetch<{ _id: string; slug: string } | null>(`*[_type == "product" && _id == $id][0]{_id, "slug": slug.current}`, { id });
    if (!existing && !starter) return Response.json({ error: "Product not found." }, { status: 404 });

    if (starter) {
      const targetId = existing?._id ?? `product-${localSlug}`;
      if (existing) {
        await client.patch(targetId).set({ active: false, removed: true }).commit();
      } else {
        await client.create({
          _type: "product",
          _id: targetId,
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
          artwork: starter.artwork ? { _type: "artwork", ...starter.artwork } : undefined,
          active: false,
          removed: true,
        });
      }
    } else if (existing) {
      await client.delete(existing._id);
    }
    return Response.json({ deleted: true });
  } catch (error) {
    console.error("Sanity product deletion failed", error);
    return Response.json({ error: "Could not delete this product from Sanity." }, { status: 502 });
  }
}