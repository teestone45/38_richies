import { createSign } from "node:crypto";

export const ga4RangeOptions = [7, 28, 90] as const;
export type Ga4RangeDays = (typeof ga4RangeOptions)[number];

export type Ga4Row = { label: string; value: number; secondary?: number };
export type Ga4PerformanceReport = {
  propertyId: string;
  rangeDays: Ga4RangeDays;
  totals: {
    activeUsers: number;
    newUsers: number;
    sessions: number;
    pageViews: number;
    engagementRate: number;
    averageSessionDuration: number;
    purchases: number;
    revenue: number;
  };
  daily: Ga4Row[];
  topPages: Ga4Row[];
  sources: Ga4Row[];
  devices: Ga4Row[];
  countries: Ga4Row[];
  events: Ga4Row[];
};

type ReportResponse = {
  rows?: { dimensionValues?: { value?: string }[]; metricValues?: { value?: string }[] }[];
};

type Ga4Config = { propertyId: string; clientEmail: string; privateKey: string };

export function getGa4Config(env: NodeJS.ProcessEnv = process.env): Ga4Config | null {
  const propertyId = env.GA4_PROPERTY_ID?.trim();
  const clientEmail = env.GA4_CLIENT_EMAIL?.trim();
  const privateKey = env.GA4_PRIVATE_KEY?.replace(/\\n/g, "\n").trim();
  if (!propertyId || !/^\d+$/.test(propertyId) || !clientEmail || !privateKey) return null;
  return { propertyId, clientEmail, privateKey };
}

export function parseRangeDays(value: string | null): Ga4RangeDays {
  const days = Number(value);
  return (ga4RangeOptions as readonly number[]).includes(days) ? (days as Ga4RangeDays) : 28;
}

function base64Url(input: string | Buffer) {
  return Buffer.from(input).toString("base64url");
}

async function getAccessToken({ clientEmail, privateKey }: Ga4Config) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/analytics.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const assertion = `${header}.${claims}.${base64Url(signer.sign(privateKey))}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string; error_description?: string };
  if (!response.ok || !result.access_token) throw new Error(result.error_description ?? "Google authentication failed.");
  return result.access_token;
}

const toNumber = (value?: string) => Number(value ?? 0) || 0;

function toRows(report: ReportResponse): Ga4Row[] {
  return (report.rows ?? []).map((row) => ({
    label: row.dimensionValues?.[0]?.value || "(not set)",
    value: toNumber(row.metricValues?.[0]?.value),
    ...(row.metricValues?.[1] ? { secondary: toNumber(row.metricValues[1].value) } : {}),
  }));
}

export async function fetchGa4PerformanceReport(config: Ga4Config, rangeDays: Ga4RangeDays): Promise<Ga4PerformanceReport> {
  const token = await getAccessToken(config);
  const dateRanges = [{ startDate: `${rangeDays}daysAgo`, endDate: "today" }];
  const metric = (name: string) => ({ name });
  const dimension = (name: string) => ({ name });
  const byMetric = (name: string) => [{ metric: { metricName: name }, desc: true }];
  const requests = [
    { dateRanges, metrics: ["activeUsers", "newUsers", "sessions", "screenPageViews", "engagementRate", "averageSessionDuration", "ecommercePurchases", "purchaseRevenue"].map(metric) },
    { dateRanges, dimensions: [dimension("date")], metrics: [metric("activeUsers"), metric("sessions")], orderBys: [{ dimension: { dimensionName: "date" } }] },
    { dateRanges, dimensions: [dimension("pagePath")], metrics: [metric("screenPageViews"), metric("activeUsers")], orderBys: byMetric("screenPageViews"), limit: 10 },
    { dateRanges, dimensions: [dimension("sessionSourceMedium")], metrics: [metric("sessions"), metric("activeUsers")], orderBys: byMetric("sessions"), limit: 8 },
    { dateRanges, dimensions: [dimension("deviceCategory")], metrics: [metric("activeUsers")], orderBys: byMetric("activeUsers"), limit: 5 },
  ];
  const secondBatch = [
    { dateRanges, dimensions: [dimension("country")], metrics: [metric("activeUsers")], orderBys: byMetric("activeUsers"), limit: 8 },
    { dateRanges, dimensions: [dimension("eventName")], metrics: [metric("eventCount")], orderBys: byMetric("eventCount"), limit: 10 },
  ];

  async function batch(body: unknown[]) {
    const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${config.propertyId}:batchRunReports`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ requests: body }),
      cache: "no-store",
    });
    const result = await response.json() as { reports?: ReportResponse[]; error?: { message?: string } };
    if (!response.ok) throw new Error(result.error?.message ?? "Google Analytics report failed.");
    return result.reports ?? [];
  }

  // GA4 batchRunReports accepts at most five requests per call.
  const [first, second] = await Promise.all([batch(requests), batch(secondBatch)]);
  const totals = first[0]?.rows?.[0]?.metricValues ?? [];
  return {
    propertyId: config.propertyId,
    rangeDays,
    totals: {
      activeUsers: toNumber(totals[0]?.value),
      newUsers: toNumber(totals[1]?.value),
      sessions: toNumber(totals[2]?.value),
      pageViews: toNumber(totals[3]?.value),
      engagementRate: toNumber(totals[4]?.value),
      averageSessionDuration: toNumber(totals[5]?.value),
      purchases: toNumber(totals[6]?.value),
      revenue: toNumber(totals[7]?.value),
    },
    daily: toRows(first[1] ?? {}),
    topPages: toRows(first[2] ?? {}),
    sources: toRows(first[3] ?? {}),
    devices: toRows(first[4] ?? {}),
    countries: toRows(second[0] ?? {}),
    events: toRows(second[1] ?? {}),
  };
}
