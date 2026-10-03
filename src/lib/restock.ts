import { createHash } from "node:crypto";
import { getSanityAdminClient } from "@/lib/sanity-admin";

export async function notifyRestockSubscribers(productSlug: string, size: string) {
  const client = getSanityAdminClient();
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ORDER_EMAIL_FROM;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL;
  if (!client || !apiKey || !from || !siteOrigin) return;

  const alerts = await client.fetch<Array<{ _id: string; email: string; productTitle: string }>>(
    `*[_type == "restockAlert" && productSlug == $productSlug && size == $size && active == true && verified == true][0...20]{_id, email, productTitle}`,
    { productSlug, size },
  );

  await Promise.all(alerts.map(async (alert) => {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [alert.email],
          subject: `${alert.productTitle} / ${size} is back in stock`,
          text: `${alert.productTitle} in size ${size} is available again at ${siteOrigin}. Shop now: ${siteOrigin}/product/${productSlug}`,
        }),
      });
      if (response.ok) await client.patch(alert._id).set({ active: false, notifiedAt: new Date().toISOString() }).commit();
      else console.error("Restock email returned", response.status);
    } catch (error) {
      console.error("Restock notification failed", error);
    }
  }));
}

export function hashRestockValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}