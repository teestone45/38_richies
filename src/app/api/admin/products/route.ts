import { revalidatePath } from "next/cache";
import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";
import { getProducts, getStarterProducts } from "@/lib/products";
import { getSanityAdminClient } from "@/lib/sanity-admin";

const adminProductsQuery = `*[_type == "product"] | order(_createdAt desc) {
  _id,
  "slug": slug.current,
  title,
  price,
  description,
  "image": coalesce(images[0].asset->url, image.asset->url),
  "images": array::compact(images[].asset->url) + select(defined(image) => [image], []),
  category,
  badge,
  colors,
  sizes,
  inventory,
  featured,
  dtfPlacement,
  fabric,
  dropName,
  storyTitle,
  story,
  stylingNotes,
  printMethod,
  artwork,
  "active": active != false,
  "removed": removed == true
}`;

function textField(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export async function GET(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage products." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) {
    const products = await getProducts();
    return Response.json({
      products: products.map((product) => ({
        ...product,
        _id: `local-${product.slug}`,
        price: product.priceCents / 100,
        active: true,
      })),
      canManageProducts: false,
      storageMessage: "Showing the starter catalog. Connect Sanity to save product edits, uploads, or deletions.",
    }, { headers: { "Cache-Control": "no-store" } });
  }

  try {
    const storedProducts = await client.fetch<Array<Record<string, unknown> & { _id: string; slug: string; removed?: boolean }>>(adminProductsQuery);
    const storedBySlug = new Map(storedProducts.map((product) => [product.slug, product]));
    const starterProducts = getStarterProducts();
    const starterSlugs = new Set(starterProducts.map((product) => product.slug));
    const products: Array<Record<string, unknown>> = [];

    for (const starter of starterProducts) {
      const stored = storedBySlug.get(starter.slug);
      if (stored?.removed) continue;
      products.push(stored ?? {
        ...starter,
        _id: `local-${starter.slug}`,
        price: starter.priceCents / 100,
        active: true,
      });
    }

    for (const product of storedProducts) {
      if (!starterSlugs.has(product.slug) && !product.removed) products.push(product);
    }

    return Response.json({ products, canManageProducts: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Sanity admin product list failed", error);
    return Response.json({ error: "Could not load products from Sanity." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to manage products." }, { status: 401 });
  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Add Sanity project, dataset, and write token settings to enable product management." }, { status: 503 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ error: "Invalid product form." }, { status: 400 });
  }

  const title = textField(form, "title");
  const slug = textField(form, "slug").toLowerCase();
  const price = Number(textField(form, "price"));
  const category = textField(form, "category");
  const badge = textField(form, "badge") || "NEW DROP";
  const description = textField(form, "description");
  const colors = textField(form, "colors").split(",").map((color) => color.trim()).filter(Boolean);
  const sizes = textField(form, "sizes").split(",").map((size) => size.trim()).filter(Boolean);
  const inventory = textField(form, "stock").split(",").map((entry) => {
    const [size, quantity] = entry.split(":").map((value) => value.trim());
    return { _key: size, size, quantity: Number(quantity) };
  }).filter((entry) => entry.size && Number.isInteger(entry.quantity));
  const dtfPlacement = textField(form, "dtfPlacement");
  const fabric = textField(form, "fabric");
  const printMethod = textField(form, "printMethod") || "DTF";
  const active = form.get("active") === "true";
  const featured = form.get("featured") === "true";
  const images = [...form.getAll("images"), ...form.getAll("image")].filter((file): file is File => file instanceof File && file.size > 0);

  if (!title || title.length > 120 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || !Number.isFinite(price) || price <= 0 || price > 10000 || Number(price.toFixed(2)) !== price || !category || sizes.length === 0 || sizes.length > 12 || colors.length > 12 || !["DTF", "DTG", "Embroidered"].includes(printMethod)) {
    return Response.json({ error: "Check the title, URL slug, price, category, and available sizes." }, { status: 400 });
  }
  if (images.length === 0) return Response.json({ error: "Choose at least one product photo to upload." }, { status: 400 });
  if (images.length > 8 || images.some((image) => image.size > 8 * 1024 * 1024)) return Response.json({ error: "Upload up to 8 product photos, each 8 MB or smaller." }, { status: 413 });
  if (images.some((image) => !["image/jpeg", "image/png", "image/webp"].includes(image.type))) return Response.json({ error: "Use JPG, PNG, or WebP product photos." }, { status: 415 });
  if (inventory.some((entry) => !sizes.includes(entry.size) || entry.quantity < 0) || inventory.length > 12 || (inventory.length > 0 && (inventory.length !== sizes.length || sizes.some((size) => !inventory.some((entry) => entry.size === size))))) {
    return Response.json({ error: "Enter non-negative stock for every available size, for example M:4, L:2." }, { status: 400 });
  }

  try {
    const duplicate = await client.fetch<boolean>(`count(*[_type == "product" && slug.current == $slug]) > 0`, { slug });
    if (duplicate) return Response.json({ error: "That product URL slug is already in use." }, { status: 409 });
    const assets = await Promise.all(images.map(async (image) => client.assets.upload("image", Buffer.from(await image.arrayBuffer()), {
      filename: image.name,
      contentType: image.type,
    })));
    const product = await client.create({
      _type: "product",
      _id: `product-${slug}`,
      title,
      slug: { _type: "slug", current: slug },
      price,
      description,
      images: assets.map((asset) => ({ _type: "image", asset: { _type: "reference", _ref: asset._id } })),
      category,
      badge,
      ...(colors.length ? { colors } : {}),
      sizes,
      ...(inventory.length ? { inventory } : {}),
      dtfPlacement,
      fabric,
      printMethod,
      featured,
      active,
    });
    revalidatePath("/");
    revalidatePath(`/product/${slug}`);
    return Response.json({ productId: product._id }, { status: 201 });
  } catch (error) {
    console.error("Sanity product creation failed", error);
    return Response.json({ error: "Could not save the product. Check the Sanity write token and schema." }, { status: 502 });
  }
}