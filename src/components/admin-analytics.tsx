"use client";

import { useEffect, useState } from "react";
import type { Ga4PerformanceReport, Ga4RangeDays, Ga4Row } from "@/lib/ga4-reports";

const ranges: Ga4RangeDays[] = [7, 28, 90];
const number = new Intl.NumberFormat("en-GH");
const money = new Intl.NumberFormat("en-GH", { style: "currency", currency: "GHS" });

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60).toString().padStart(2, "0")}s`;
}

function formatDate(value: string) {
  if (!/^\d{8}$/.test(value)) return value;
  return new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}T00:00:00`).toLocaleDateString("en-GH", { month: "short", day: "numeric" });
}

function RankedList({ title, rows, unit, secondaryUnit }: { title: string; rows: Ga4Row[]; unit: string; secondaryUnit?: string }) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <section className="admin-analytics__panel">
      <h3>{title}</h3>
      {rows.length ? <ol>
        {rows.map((row) => (
          <li key={row.label}>
            <div><span title={row.label}>{row.label}</span><strong>{number.format(row.value)} <small>{unit}</small>{secondaryUnit && row.secondary !== undefined && <small> · {number.format(row.secondary)} {secondaryUnit}</small>}</strong></div>
            <i style={{ width: `${(row.value / max) * 100}%` }} aria-hidden="true" />
          </li>
        ))}
      </ol> : <p className="admin-analytics__empty">No data yet for this period.</p>}
    </section>
  );
}

export default function AdminAnalytics() {
  const [days, setDays] = useState<Ga4RangeDays>(28);
  const [report, setReport] = useState<Ga4PerformanceReport | null>(null);
  const [error, setError] = useState("");
  const [notConfigured, setNotConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/admin/analytics?days=${days}`, { cache: "no-store" });
        const result = await response.json().catch(() => ({}));
        if (cancelled) return;
        setNotConfigured(result.configured === false);
        if (!response.ok) throw new Error(result.error ?? "Could not load analytics.");
        setReport(result.report);
      } catch (loadError) {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : "Could not load analytics.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [days, reloadKey]);

  const maxDaily = Math.max(1, ...(report?.daily ?? []).map((row) => row.value));
  const totals = report?.totals;
  const cards = totals ? [
    ["VISITORS", number.format(totals.activeUsers)],
    ["NEW VISITORS", number.format(totals.newUsers)],
    ["SESSIONS", number.format(totals.sessions)],
    ["PAGE VIEWS", number.format(totals.pageViews)],
    ["ENGAGEMENT", `${(totals.engagementRate * 100).toFixed(1)}%`],
    ["AVG. SESSION", formatDuration(totals.averageSessionDuration)],
    ["PURCHASES", number.format(totals.purchases)],
    ["REVENUE", money.format(totals.revenue)],
  ] : [];

  return (
    <section className="admin-section admin-analytics" aria-labelledby="analytics-title">
      <div className="admin-section__heading">
        <div><p className="eyebrow">GOOGLE ANALYTICS 4 / LIVE DATA</p><h2 id="analytics-title">PERFORMANCE</h2></div>
        <div className="admin-analytics__controls">
          {ranges.map((range) => <button key={range} type="button" aria-pressed={days === range} onClick={() => setDays(range)}>{range} days</button>)}
          <button type="button" onClick={() => setReloadKey((key) => key + 1)} disabled={isLoading}>Refresh</button>
        </div>
      </div>

      {isLoading && <p className="admin-analytics__empty" role="status">Loading website performance…</p>}
      {!isLoading && error && <div className="admin-alert" role="alert">
        <p>{error}</p>
        {notConfigured && <ol className="admin-analytics__setup">
          <li>Google Cloud Console → enable the <strong>Google Analytics Data API</strong>.</li>
          <li>Create a service account and download a JSON key.</li>
          <li>GA4 Admin → Property access management → add the service account email as <strong>Viewer</strong>.</li>
          <li>In Vercel add <code>GA4_PROPERTY_ID</code>, <code>GA4_CLIENT_EMAIL</code>, and <code>GA4_PRIVATE_KEY</code>, then redeploy.</li>
        </ol>}
      </div>}

      {!isLoading && !error && report && <>
        <div className="admin-analytics__cards">
          {cards.map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        <section className="admin-analytics__panel">
          <h3>Daily visitors</h3>
          {report.daily.length ? <div className="admin-analytics__chart" role="img" aria-label={`Daily visitors for the last ${days} days`}>
            {report.daily.map((row) => (
              <div key={row.label} title={`${formatDate(row.label)}: ${number.format(row.value)} visitors, ${number.format(row.secondary ?? 0)} sessions`}>
                <i style={{ height: `${Math.max(2, (row.value / maxDaily) * 100)}%` }} />
              </div>
            ))}
          </div> : <p className="admin-analytics__empty">No visits recorded yet. GA4 data can take 24–48 hours to appear.</p>}
          {report.daily.length > 1 && <div className="admin-analytics__axis"><span>{formatDate(report.daily[0].label)}</span><span>{formatDate(report.daily[report.daily.length - 1].label)}</span></div>}
        </section>
        <div className="admin-analytics__grid">
          <RankedList title="Top pages" rows={report.topPages} unit="views" secondaryUnit="visitors" />
          <RankedList title="Traffic sources" rows={report.sources} unit="sessions" secondaryUnit="visitors" />
          <RankedList title="Visitor actions" rows={report.events} unit="events" />
          <RankedList title="Countries" rows={report.countries} unit="visitors" />
          <RankedList title="Devices" rows={report.devices} unit="visitors" />
        </div>
      </>}
    </section>
  );
}
