export const META_PIXEL_ID = "2482324055623655";

export type MetaPixelPurchase = {
  value: number;
  currency: string;
  transactionId: string;
};

export function buildMetaPixelPurchaseScript(purchase: MetaPixelPurchase): string {
  if (!Number.isFinite(purchase.value) || purchase.value <= 0 || !/^[A-Z]{3}$/.test(purchase.currency) || !purchase.transactionId.trim()) {
    throw new Error("Meta Pixel purchase requires a positive paid value, currency, and transaction ID.");
  }
  const data = JSON.stringify({ value: purchase.value, currency: purchase.currency }).replace(/</g, "\\u003c");
  // eventID lets Meta deduplicate the Purchase if the success page is reloaded.
  const options = JSON.stringify({ eventID: `purchase-${purchase.transactionId}` }).replace(/</g, "\\u003c");

  // Waits briefly for the base pixel (loaded in the root layout) to define fbq.
  return `
    (function send(attempt){
      if (typeof window.fbq === 'function') { window.fbq('track', 'Purchase', ${data}, ${options}); return; }
      if (attempt < 50) setTimeout(function(){ send(attempt + 1); }, 100);
    })(0);
  `;
}
