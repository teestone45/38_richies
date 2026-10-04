export function normalizeOrderReference(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return trimmed.replace(/^order-/i, "");
}

export function generateOrderReference(seed = ""): string {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const suffixSeed = String(seed || Date.now()).replace(/[^A-Za-z0-9]/g, "").toUpperCase();
  const suffix = suffixSeed.length >= 4 ? suffixSeed.slice(-8) : `${suffixSeed}${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  return `RCH-${timestamp}-${suffix.slice(0, 8).padEnd(4, "0")}`;
}

export function getOrderTrackingUrl(orderNumber: string): string | null {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  if (!siteUrl) return null;

  try {
    const url = new URL("/track", siteUrl);
    url.searchParams.set("reference", orderNumber);
    return url.toString();
  } catch {
    return null;
  }
}
