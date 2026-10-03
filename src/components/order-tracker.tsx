"use client";

import { useState, type FormEvent } from "react";

type TrackedOrder = {
  reference: string;
  items: { title: string; size: string; color?: string; quantity: number }[];
  status: string;
  trackingNumber: string;
  createdAt: string;
};

const progressSteps = ["paid", "packing", "shipped"];

export default function OrderTracker() {
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  async function findOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSearching(true);
    setError("");
    setOrder(null);
    try {
      const response = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reference, email }),
      });
      const result = await response.json() as { order?: TrackedOrder; error?: string };
      if (!response.ok || !result.order) throw new Error(result.error ?? "Order lookup failed.");
      setOrder(result.order);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "Order lookup failed.");
    } finally {
      setIsSearching(false);
    }
  }

  const progressIndex = order ? progressSteps.indexOf(order.status) : -1;
  const exceptionalStatus = order && !progressSteps.includes(order.status);

  return (
    <main className="track-page">
      <p className="eyebrow">38 RICHES / FULFILLMENT</p>
      <h1>TRACK<br />YOUR ORDER.</h1>
      <p className="track-page__intro">Enter the payment reference and the email used at checkout.</p>
      <form className="track-form" onSubmit={findOrder}>
        <label>Order reference<input required minLength={5} maxLength={128} autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label>Checkout email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="button button--lime" type="submit" disabled={isSearching}>{isSearching ? "Looking up order..." : "Find order"}<span aria-hidden="true">↗</span></button>
        {error && <p className="track-form__error" role="alert">{error}</p>}
      </form>

      {order && <section className="track-result" aria-live="polite">
        <div className="track-result__heading"><div><p className="eyebrow">ORDER STATUS</p><h2>{order.status.replaceAll("_", " ")}</h2></div><span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" }) : ""}</span></div>
        {!exceptionalStatus && <ol className="track-steps" aria-label="Order progress">{progressSteps.map((step, index) => <li className={index <= progressIndex ? "is-complete" : ""} key={step}><span>{index < progressIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>}
        {order.trackingNumber && <p className="track-result__tracking">Tracking number <strong>{order.trackingNumber}</strong></p>}
        <ul className="track-result__items">{order.items.map((item, index) => <li key={`${item.title}-${item.size}-${index}`}><span>{item.title} / {item.size}{item.color ? ` / ${item.color}` : ""}</span><strong>× {item.quantity}</strong></li>)}</ul>
      </section>}
    </main>
  );
}