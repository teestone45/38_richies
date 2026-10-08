const fallbackSiteOrigin = "https://38-richies.vercel.app";

export function getSiteUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const productionHost = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim().replace(/^https?:\/\//, "");
  const siteOrigin = configuredUrl || (productionHost ? `https://${productionHost}` : fallbackSiteOrigin);

  try {
    return new URL(siteOrigin);
  } catch {
    return new URL(fallbackSiteOrigin);
  }
}