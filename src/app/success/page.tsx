import Stripe from "stripe";
import CheckoutSuccess from "@/components/checkout-success";
import { recordPaystackOrder, verifyPaystackTransaction } from "@/lib/paystack";
import { getSanityAdminClient } from "@/lib/sanity-admin";

type Passport = {
  orderNumber: string;
  createdAt: string;
  items: { title: string; size: string; color?: string; quantity: number; dropName?: string }[];
};

export default async function SuccessPage({ searchParams }: PageProps<"/success">) {
  const { session_id: sessionId, reference, trxref } = await searchParams;
  let verified = false;
  let paymentProvider: "Paystack" | "Stripe" = "Paystack";
  let orderReference = "";
  let passport: Passport | undefined;

  const paystackReference = typeof reference === "string" ? reference : typeof trxref === "string" ? trxref : "";
  if (paystackReference && process.env.PAYSTACK_SECRET_KEY) {
    try {
      const transaction = await verifyPaystackTransaction(paystackReference);
      if (transaction) {
        const result = await recordPaystackOrder(transaction);
        verified = true;
        orderReference = result.orderNumber ?? transaction.reference;
        const sanity = getSanityAdminClient();
        const order = sanity ? await sanity.fetch<{ orderNumber?: string; status?: string; createdAt?: string; items?: Passport["items"] } | null>(`*[_type == "order" && paymentReference == $reference][0]{orderNumber, status, createdAt, items[]{title, size, color, quantity, dropName}}`, { reference: transaction.reference }) : null;
        if (order?.status === "paid") passport = { orderNumber: order.orderNumber ?? orderReference, createdAt: order.createdAt ?? new Date().toISOString(), items: order.items ?? [] };
      }
    } catch (error) {
      console.error("Paystack checkout verification failed", error);
    }
  } else if (typeof sessionId === "string" && process.env.STRIPE_SECRET_KEY) {
    paymentProvider = "Stripe";
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verified = session.payment_status === "paid";
      if (verified) {
        const sanity = getSanityAdminClient();
        const orderRecord = sanity ? await sanity.fetch<{ orderNumber?: string; status?: string; createdAt?: string; items?: Passport["items"] } | null>(`*[_type == "order" && stripeSessionId == $sessionId][0]{orderNumber, status, createdAt, items[]{title, size, color, quantity, dropName}}`, { sessionId }) : null;
        orderReference = orderRecord?.orderNumber ?? session.id;
        if (orderRecord?.status === "paid") passport = { orderNumber: orderReference, createdAt: orderRecord.createdAt ?? new Date().toISOString(), items: orderRecord.items ?? [] };
      }
    } catch (error) {
      console.error("Stripe checkout verification failed", error);
    }
  }

  return <CheckoutSuccess verified={verified} paymentProvider={paymentProvider} orderReference={orderReference} passport={passport} />;
}