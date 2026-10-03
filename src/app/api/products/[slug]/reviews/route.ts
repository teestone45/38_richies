import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { isSameOriginRequest } from "@/lib/admin-auth";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type ReviewSubmission = { customerName?: unknown; rating?: unknown; comment?: unknown; website?: unknown };

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
  const rating = body.rating;
  if (customerName.length < 2 || customerName.length > 60 || !Number.isInteger(rating) || typeof rating !== "number" || rating < 1 || rating > 5 || comment.length < 10 || comment.length > 800) {
    return Response.json({ error: "Enter your name, select 1 to 5 stars, and write a review between 10 and 800 characters." }, { status: 400 });
  }

  const client = getSanityAdminClient();
  if (!client) return Response.json({ error: "Reviews are temporarily unavailable." }, { status: 503 });

  try {
    const product = await client.fetch<{ _id: string } | null>(`*[_type == "product" && slug.current == $slug && active != false && removed != true][0]{_id}`, { slug });
    if (!product) return Response.json({ error: "Product not found." }, { status: 404 });

    const review = { _key: randomUUID(), customerName, rating, comment, createdAt: new Date().toISOString() };
    await client.patch(product._id).setIfMissing({ reviews: [] }).append("reviews", [review]).commit();
    revalidatePath(`/product/${slug}`);
    return Response.json({ review }, { status: 201 });
  } catch (error) {
    console.error("Product review save failed", error);
    return Response.json({ error: "Could not save your review. Please try again." }, { status: 502 });
  }
}