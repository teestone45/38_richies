import { hasAdminSession, isSameOriginRequest } from "@/lib/admin-auth";

export const maxDuration = 60;

const maximumPromptLength = 4000;
const maximumImageBytes = 3 * 1024 * 1024;

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return Response.json({ error: "Invalid request origin." }, { status: 403 });
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to generate product images." }, { status: 401 });

  const apiKey = process.env.VENICE_API_KEY;
  if (!apiKey) return Response.json({ error: "Image generation is not configured. Add VENICE_API_KEY to the server environment." }, { status: 503 });

  let body: { prompt?: unknown };
  try {
    body = await request.json() as { prompt?: unknown };
  } catch {
    return Response.json({ error: "Enter a clothing image prompt." }, { status: 400 });
  }

  const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > maximumPromptLength) {
    return Response.json({ error: `Write a prompt between 1 and ${maximumPromptLength} characters.` }, { status: 400 });
  }

  const productPhotoPrompt = [
    "Create one photorealistic, premium ecommerce product photograph of a single streetwear garment. Follow the clothing specification exactly; do not add unrequested logos, text, graphics, accessories, or extra garments. Show the complete garment from the front, centered and clearly visible, with realistic fabric texture and construction. Use clean, neutral studio lighting and a simple dark navy-blue studio background. Square product-catalog composition.",
    `Clothing specification: ${prompt}`,
  ].join("\n\n");

  try {
    const response = await fetch("https://api.venice.ai/api/v1/image/generate", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(55_000),
      body: JSON.stringify({
        model: process.env.VENICE_IMAGE_MODEL || "gpt-image-2-5-flare",
        prompt: productPhotoPrompt,
        aspect_ratio: "1:1",
        resolution: "1K",
        format: "webp",
        return_binary: false,
        safe_mode: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) return Response.json({ error: "Venice rejected the API key. Check VENICE_API_KEY in the server environment." }, { status: 502 });
      if (response.status === 402) return Response.json({ error: "Venice AI has insufficient credits for image generation." }, { status: 402 });
      if (response.status === 429) return Response.json({ error: "Venice AI is rate-limiting requests. Wait a moment and try again." }, { status: 429 });
      console.error("Venice image generation failed", response.status);
      return Response.json({ error: "Venice could not generate this image. Check the selected model and try again." }, { status: 502 });
    }

    const result = await response.json() as { images?: unknown[] };
    const firstImage = result.images?.[0];
    if (typeof firstImage !== "string" || !firstImage) {
      return Response.json({ error: "Venice returned no image. Try a more specific prompt." }, { status: 502 });
    }

    const base64 = firstImage.startsWith("data:") ? firstImage.slice(firstImage.indexOf(",") + 1) : firstImage;
    const image = Buffer.from(base64, "base64");
    if (!image.length) return Response.json({ error: "Venice returned an invalid image. Try again." }, { status: 502 });
    if (image.length > maximumImageBytes) return Response.json({ error: "The generated image is too large to preview. Try again with a simpler prompt." }, { status: 413 });

    return Response.json({ imageDataUrl: `data:image/webp;base64,${image.toString("base64")}` }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Venice image generation request failed", error);
    return Response.json({ error: "Could not reach Venice AI. Try again shortly." }, { status: 502 });
  }
}