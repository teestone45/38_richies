"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { formatCurrency } from "@/lib/currency";

type Coupon = {
  _id: string;
  code: string;
  discountType: "percentage" | "fixed";
  discountValue: number;
  active: boolean;
  usageCount: number;
  maxUses?: number;
  startsAt?: string;
  expiresAt?: string;
};

export default function AdminDiscounts() {
  const [isLoading, setIsLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percentage" | "fixed">("percentage");
  const [discountValue, setDiscountValue] = useState("10");
  const [maxUses, setMaxUses] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadCoupons() {
      const sessionResponse = await fetch("/api/admin/session", { cache: "no-store" });
      const session = await sessionResponse.json() as { authenticated?: boolean };
      if (cancelled) return;
      setAuthenticated(Boolean(session.authenticated));
      if (!session.authenticated) return;
      const response = await fetch("/api/admin/coupons", { cache: "no-store" });
      const result = await response.json() as { coupons?: Coupon[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not load discount codes.");
      if (!cancelled) setCoupons(result.coupons ?? []);
    }
    void loadCoupons().catch((loadError) => {
      if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load discount codes.");
    }).finally(() => {
      if (!cancelled) setIsLoading(false);
    });
    return () => { cancelled = true; };
  }, []);

  async function createCoupon(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    try {
      const response = await fetch("/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          discountType,
          discountValue: Number(discountValue),
          maxUses,
          startsAt: startsAt ? new Date(startsAt).toISOString() : "",
          expiresAt: expiresAt ? new Date(expiresAt).toISOString() : "",
        }),
      });
      const result = await response.json() as { coupon?: Coupon; error?: string };
      if (!response.ok || !result.coupon) throw new Error(result.error ?? "Could not create discount code.");
      setCoupons((current) => [result.coupon!, ...current]);
      setCode("");
      setDiscountValue(discountType === "percentage" ? "10" : "10.00");
      setMaxUses("");
      setStartsAt("");
      setExpiresAt("");
      setMessage(`${result.coupon.code} created.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not create discount code.");
    } finally {
      setIsSaving(false);
    }
  }

  async function setCouponActive(coupon: Coupon) {
    setError("");
    try {
      const response = await fetch(`/api/admin/coupons/${encodeURIComponent(coupon._id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !coupon.active }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Could not update discount code.");
      setCoupons((current) => current.map((item) => item._id === coupon._id ? { ...item, active: !item.active } : item));
    } catch (toggleError) {
      setError(toggleError instanceof Error ? toggleError.message : "Could not update discount code.");
    }
  }

  if (isLoading) return <main className="admin-page"><p className="admin-loading">Checking admin access...</p></main>;
  if (!authenticated) return <main className="admin-page"><section className="admin-login"><p className="eyebrow">38 RICHES / CONTROL ROOM</p><h1>SIGN IN.</h1><Link className="button button--lime" href="/admin">Open admin sign-in <span aria-hidden="true">↗</span></Link></section></main>;

  return (
    <main className="admin-page">
      <div className="admin-topline"><div><p className="eyebrow">38 RICHES / CONTROL ROOM</p><h1>DISCOUNTS.</h1></div><div className="admin-topline__actions"><Link href="/admin">Back to admin ↗</Link><Link href="/">View storefront ↗</Link></div></div>
      {error && <p className="admin-alert" role="alert">{error}</p>}
      {message && <p className="admin-notice" role="status">{message}</p>}

      <section className="admin-section" aria-labelledby="discount-create-title">
        <div className="admin-section__heading"><div><p className="eyebrow">PROMOTIONS / CREATE</p><h2 id="discount-create-title">NEW CODE</h2></div></div>
        <form className="discount-form" onSubmit={createCoupon}>
          <label>Code<input type="text" required minLength={3} maxLength={24} pattern="[A-Za-z0-9][A-Za-z0-9_-]{2,23}" value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="WELCOME10" /></label>
          <label>Type<select value={discountType} onChange={(event) => { const nextType = event.target.value as "percentage" | "fixed"; setDiscountType(nextType); setDiscountValue(nextType === "percentage" ? "10" : "10.00"); }}><option value="percentage">Percent off</option><option value="fixed">Fixed GHS off</option></select></label>
          <label>{discountType === "percentage" ? "Percent" : "Amount (GHS)"}<input type="number" required min="0.01" max={discountType === "percentage" ? "100" : "10000"} step="0.01" value={discountValue} onChange={(event) => setDiscountValue(event.target.value)} /></label>
          <label>Maximum uses<input type="number" min="1" max="100000" step="1" value={maxUses} onChange={(event) => setMaxUses(event.target.value)} placeholder="Unlimited" /></label>
          <label>Starts at<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
          <label>Expires at<input type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></label>
          <button className="button button--lime" type="submit" disabled={isSaving}>{isSaving ? "Creating..." : "Create discount code"}<span aria-hidden="true">↗</span></button>
        </form>
      </section>

      <section className="admin-section" aria-labelledby="discount-list-title">
        <div className="admin-section__heading"><div><p className="eyebrow">PROMOTIONS / ACTIVE</p><h2 id="discount-list-title">YOUR CODES</h2></div><span>{coupons.length} CODES</span></div>
        {coupons.length ? <div className="discount-list">{coupons.map((coupon) => <article className="discount-row" key={coupon._id}>
          <div><strong>{coupon.code}</strong><p>{coupon.discountType === "percentage" ? `${coupon.discountValue}% off` : `${formatCurrency(coupon.discountValue)} off`}</p></div>
          <span>{coupon.usageCount}{coupon.maxUses ? ` / ${coupon.maxUses}` : " used"}</span>
          <span className={coupon.active ? "discount-row__active" : "discount-row__inactive"}>{coupon.active ? "ACTIVE" : "PAUSED"}</span>
          <button type="button" onClick={() => setCouponActive(coupon)}>{coupon.active ? "Pause" : "Activate"}</button>
        </article>)}</div> : <p className="admin-empty">No discount codes yet.</p>}
      </section>
    </main>
  );
}