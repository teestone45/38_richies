import Stripe from "stripe";
import CheckoutSuccess from "@/components/checkout-success";
import { recordPaystackOrder, verifyPaystackTransaction } from "@/lib/paystack";

export default async function SuccessPage({ searchParams }: PageProps<"/success">) {
  const { session_id: sessionId, reference, trxref } = await searchParams;
  let verified = false;
  let paymentProvider: "Paystack" | "Stripe" = "Paystack";
  let orderReference = "";

  const paystackReference = typeof reference === "string" ? reference : typeof trxref === "string" ? trxref : "";
  if (paystackReference && process.env.PAYSTACK_SECRET_KEY) {
    try {
      const transaction = await verifyPaystackTransaction(paystackReference);
      if (transaction) {
        await recordPaystackOrder(transaction);
        verified = true;
        orderReference = transaction.reference;
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
      if (verified) orderReference = session.id;
    } catch (error) {
      console.error("Stripe checkout verification failed", error);
    }
  }

  return <CheckoutSuccess verified={verified} paymentProvider={paymentProvider} orderReference={orderReference} />;
}