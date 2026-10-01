import Stripe from "stripe";
import CheckoutSuccess from "@/components/checkout-success";

export default async function SuccessPage({ searchParams }: PageProps<"/success">) {
  const { session_id: sessionId } = await searchParams;
  let verified = false;

  if (typeof sessionId === "string" && process.env.STRIPE_SECRET_KEY) {
    try {
      const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      verified = session.payment_status === "paid";
    } catch (error) {
      console.error("Stripe checkout verification failed", error);
    }
  }

  return <CheckoutSuccess verified={verified} />;
}