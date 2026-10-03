import { createHmac, timingSafeEqual } from "node:crypto";
import { recordPaystackOrder, verifyPaystackTransaction } from "@/lib/paystack";

export async function POST(request: Request) {
  const secretKey = process.env.PAYSTACK_SECRET_KEY;
  const signature = request.headers.get("x-paystack-signature");
  if (!secretKey || !signature) return Response.json({ error: "Paystack webhook is not configured." }, { status: 503 });

  const rawBody = await request.text();
  const expected = Buffer.from(createHmac("sha512", secretKey).update(rawBody).digest("hex"), "hex");
  const received = Buffer.from(signature, "hex");
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return Response.json({ error: "Invalid Paystack signature." }, { status: 401 });
  }

  let event: { event?: string; data?: { reference?: string; status?: string } };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return Response.json({ error: "Invalid Paystack event." }, { status: 400 });
  }
  if (event.event !== "charge.success") return Response.json({ received: true });
  const reference = event.data?.reference;
  if (typeof reference !== "string" || event.data?.status !== "success") return Response.json({ error: "Invalid Paystack transaction event." }, { status: 400 });

  try {
    const transaction = await verifyPaystackTransaction(reference);
    if (!transaction) return Response.json({ error: "Paystack transaction is not verified." }, { status: 400 });
    await recordPaystackOrder(transaction);
    return Response.json({ received: true });
  } catch (error) {
    console.error("Paystack webhook processing failed", error);
    return Response.json({ error: "Paystack webhook processing failed." }, { status: 500 });
  }
}