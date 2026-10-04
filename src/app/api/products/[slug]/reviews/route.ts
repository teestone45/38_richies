import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type ReviewSubmission = { customerName?: unknown; rating?: unknown; comment?: unknown; email?: unknown; orderReference?: unknown; sizePurchased?: unknown; height?: unknown; fitFeedback?: unknown; website?: unknown };

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });

  const { slug } = await params;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return Response.json({ error: "Product not found." }, { status: 404 });

  let parsedBody: unknown;
  try {
    parsedBody = await request.json() as unknown;
  } catch {
    return Response.json({ error: "Invalid review submission." }, { status: 400 });
  }
  if (typeof parsedBody !== "object" || parsedBody === null || Array.isArray(parsedBody)) return Response.json({ error: "Invalid review submission." }, { status: 400 });
  const body = parsedBody as ReviewSubmission;

  if (typeof body.website === "string" && body.website.trim()) return Response.json({ submitted: true }, { status: 201 });
  const customerName = typeof body.customerName === "string" ? body.customerName.trim().replace(/\s+/g, " ") : "";
  const comment = typeof body.comment === "string" ? body.comment.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const orderReference = typeof body.orderReference === "string" ? body.orderReference.trim() : "";
  const sizePurchased = typeof body.sizePurchased === "string" ? body.sizePurchased.trim() : "";
  const heightValue = typeof body.height === "string" || typeof body.height === "number" ? String(body.height).trim() : "";
  const heightNumber = heightValue ? Number(heightValue) : undefined;
  const fitFeedback = body.fitFeedback;
  const rating = body.rating;
  if (customerName.length < 2 || customerName.length > 60 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !/^[A-Za-z0-9_-]{5,128}$/.test(orderReference) || !sizePurchased || (heightNumber !== undefined && (!Number.isInteger(heightNumber) || heightNumber < 120 || heightNumber > 220)) || !["runs-small", "true-to-size", "oversized"].includes(String(fitFeedback)) || !Number.isInteger(rating) || typeof rating !== "number" || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 800) {
    return Response.json({ error: "Enter your name, checkout email, order reference, purchased size, fit, rating, and a review between 10 and 800 characters." }, { status: 400 });
  }

  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });

  try {
    const order = await client.fetch<{ _id: string; _rev: string; email?: string; status?: string; items?: { productId: string; size?: string }[]; reviewedProductSlugs?: string[] } | null>(`*[_type == "order" && (paymentReference == $reference || stripeSessionId == $reference || orderNumber == $reference)][0]{_id, _rev, email, status, items[]{productId, size}, reviewedProductSlugs}`, { reference: orderReference });
    const eligibleStatuses = ["paid", "packing", "shipped", "delivered"];
    const purchasedProduct = order?.items?.some((item) => item.productId === slug && item.size === sizePurchased);
    if (!order || order.email?.trim().toLowerCase() !== email || !eligibleStatuses.includes(order.status ?? "") || !purchasedProduct) {
      return Response.json({ error: "We couldn't verify a completed purchase of this product with those details." }, { status: 403 });
    }
    if (order.reviewedProductSlugs?.includes(slug)) return Response.json({ error: "This order has already reviewed this product." }, { status: 409 });

    const product = await client.fetch<{ _id: string; _rev: string; reviews?: { orderId?: string }[] } | null>(`*[_type == "product" && slug.current == $slug && active != false && removed != true][0]{_id, _rev, reviews[]{orderId}}`, { slug });
    if (!product) return Response.json({ error: "Product not found." }, { status: 404 });
    if (product.reviews?.some((review) => review.orderId === order._id)) return Response.json({ error: "This order has already reviewed this product." }, { status: 409 });

    const review = { _key: randomUUID(), orderId: order._id, verifiedPurchase: true, customerName, rating, comment, sizePurchased, ...(heightNumber ? { height: `${heightNumber} cm` } : {}), fitFeedback, createdAt: new Date().toISOString() };
    await client.transaction()
      .patch(client.patch(order._id).ifRevisionId(order._rev).setIfMissing({ reviewedProductSlugs: [] }).append("reviewedProductSlugs", [slug]))
      .patch(client.patch(product._id).ifRevisionId(product._rev).setIfMissing({ reviews: [] }).append("reviews", [review]))
      .commit();
    revalidatePath(`/product/${slug}`);
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Product review save failed", error);
    return Response.json({ error: "Could not save your review. Please try again." }, { status: 502 });
  }
}