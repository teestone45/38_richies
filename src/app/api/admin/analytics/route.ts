import { hasAdminSession } from "@/lib/admin-auth";
import { fetchGa4PerformanceReport, getGa4Config, parseRangeDays } from "@/lib/ga4-reports";

export async function GET(request: Request) {
  if (!hasAdminSession(request)) return Response.json({ error: "Sign in to view analytics." }, { status: 401 });
  const config = getGa4Config();
  if (!config) {
    return Response.json({
      configured: false,
      error: "Google Analytics reporting is not connected. Add GA4_PROPERTY_ID, GA4_CLIENT_EMAIL, and GA4_PRIVATE_KEY in Vercel.",
    }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  const rangeDays = parseRangeDays(new URL(request.url).searchParams.get("days"));
  try {
    const report = await fetchGa4PerformanceReport(config, rangeDays);
    return Response.json({ configured: true, report }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("GA4 report failed", error);
    return Response.json({
      configured: true,
      error: "Could not load Google Analytics. Confirm the service account has Viewer access to the GA4 property and the Analytics Data API is enabled.",
    }, { status: 502, headers: { "Cache-Control": "no-store" } });
  }
}
