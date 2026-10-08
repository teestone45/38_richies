"use client";

import { useEffect, useState, type FormEvent } from "react";

type TrackedOrder = {
  orderNumber?: string;
  reference: string;
  items: { title: string; size: string; color?: string; quantity: number }[];
  status: string;
  trackingNumber: string;
  createdAt: string;
  gpsLocation?: { latitude: number; longitude: number; accuracy?: number; updatedAt?: string } | null;
};

const progressSteps = ["paid", "packing", "shipped", "delivered"];

export default function OrderTracker({ initialReference = "" }: { initialReference?: string }) {
  const [reference, setReference] = useState(initialReference);
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
      if (!response.ok || !result.order) throw new Error(result.error ?? "We couldn't find an order with those details.");
      setOrder(result.order);
    } catch (lookupError) {
      setError(lookupError instanceof Error ? lookupError.message : "We couldn't find an order with those details.");
    } finally {
      setIsSearching(false);
    }
  }

  useEffect(() => {
    if (!order?.reference || !email) return;

    let isActive = true;
    const refreshOrder = async () => {
      try {
        const response = await fetch("/api/orders/track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reference: order.reference, email }),
        });
        const result = await response.json() as { order?: TrackedOrder };
        if (isActive && response.ok && result.order) setOrder(result.order);
      } catch {
        // Keep the last known status when a background refresh is temporarily unavailable.
      }
    };

    const intervalId = window.setInterval(() => void refreshOrder(), 15_000);
    return () => {
      isActive = false;
      window.clearInterval(intervalId);
    };
  }, [order?.reference, email]);

  const progressIndex = order ? progressSteps.indexOf(order.status) : -1;
  const exceptionalStatus = order && !progressSteps.includes(order.status);

  return (
    <main className="track-page">
      <p className="eyebrow">38 RICHES / FULFILLMENT</p>
      <h1>TRACK<br />YOUR ORDER.</h1>
      <p className="track-page__intro">Enter your order reference number and the email used at checkout.</p>
      <form className="track-form" onSubmit={findOrder}>
        <label>Order reference<input required minLength={5} maxLength={128} autoComplete="off" value={reference} onChange={(event) => setReference(event.target.value)} /></label>
        <label>Checkout email<input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="button button--lime" type="submit" disabled={isSearching}>{isSearching ? "Looking up order..." : "Find order"}<span aria-hidden="true">↗</span></button>
        {error && <div className="track-form__status track-form__status--error" role="alert"><strong>Order not found</strong><span>{error}</span></div>}
      </form>

      {order && <section className="track-result" aria-live="polite">
        <div className="track-result__heading"><div><p className="eyebrow">ORDER STATUS</p><h2>{order.status.replaceAll("_", " ")}</h2></div><span>{order.createdAt ? new Date(order.createdAt).toLocaleDateString("en-GH", { year: "numeric", month: "short", day: "numeric" }) : ""}</span></div>
        {!exceptionalStatus && <ol className="track-steps" aria-label="Order progress">{progressSteps.map((step, index) => <li className={index <= progressIndex ? "is-complete" : ""} key={step}><span>{index < progressIndex ? "✓" : String(index + 1).padStart(2, "0")}</span>{step}</li>)}</ol>}
        <p className="track-result__tracking">Order reference <strong>{order.orderNumber ?? order.reference}</strong></p>
        {order.trackingNumber && <p className="track-result__tracking">Tracking number <strong>{order.trackingNumber}</strong></p>}
        {order.gpsLocation && <section className="track-gps" aria-label="Latest courier GPS update">
          <div className="track-gps__heading"><div><p className="eyebrow">LATEST GPS UPDATE</p><p>{order.gpsLocation.updatedAt ? new Date(order.gpsLocation.updatedAt).toLocaleString("en-GH", { dateStyle: "medium", timeStyle: "short" }) : "Location shared"}</p></div><span>±{Math.round(order.gpsLocation.accuracy ?? 0)} m</span></div>
          <iframe title="Map showing the latest shared courier location" loading="lazy" referrerPolicy="no-referrer" src={`https://www.openstreetmap.org/export/embed.html?bbox=${order.gpsLocation.longitude - 0.012}%2C${order.gpsLocation.latitude - 0.008}%2C${order.gpsLocation.longitude + 0.012}%2C${order.gpsLocation.latitude + 0.008}&layer=mapnik&marker=${order.gpsLocation.latitude}%2C${order.gpsLocation.longitude}`} />
          <div className="track-gps__links">
            <a href={`https://www.google.com/maps/search/?api=1&query=${order.gpsLocation.latitude}%2C${order.gpsLocation.longitude}`} target="_blank" rel="noreferrer">Open in Google Maps ↗</a>
            <a href={`https://www.openstreetmap.org/?mlat=${order.gpsLocation.latitude}&mlon=${order.gpsLocation.longitude}#map=16/${order.gpsLocation.latitude}/${order.gpsLocation.longitude}`} target="_blank" rel="noreferrer">Open larger map ↗</a>
          </div>
        </section>}
        <ul className="track-result__items">{order.items.map((item, index) => <li key={`${item.title}-${item.size}-${index}`}><span>{item.title} / {item.size}{item.color ? ` / ${item.color}` : ""}</span><strong>× {item.quantity}</strong></li>)}</ul>
      </section>}
    </main>
  );
}