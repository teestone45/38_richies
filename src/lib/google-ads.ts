export const GOOGLE_ADS_PURCHASE_SEND_TO = "AW-18507081661/03tJCICkopkdEL3P7vhE";

export type GoogleAdsPurchase = {
  value: number;
  currency: string;
  transactionId: string;
};

export function buildGoogleAdsPurchaseScript(purchase: GoogleAdsPurchase, sendTo = GOOGLE_ADS_PURCHASE_SEND_TO): string | null {
  if (!Number.isFinite(purchase.value) || purchase.value <= 0 || !/^[A-Z]{3}$/.test(purchase.currency) || !purchase.transactionId.trim()) {
    throw new Error("Google Ads purchase requires a positive paid value, currency, and transaction ID.");
  }
  if (sendTo === "AW-18507081661/YOUR_LABEL_HERE") return null;
  if (!/^AW-18507081661\/[A-Za-z0-9_-]+$/.test(sendTo)) {
    throw new Error("Google Ads Purchase conversion destination is invalid.");
  }
  const event = JSON.stringify({
    send_to: sendTo,
    value: purchase.value,
    currency: purchase.currency,
    transaction_id: purchase.transactionId,
  }).replace(/</g, "\\u003c");

  return `
    window.dataLayer = window.dataLayer || [];
    (window.gtag || function(){ window.dataLayer.push(arguments); })('event', 'conversion', ${event});
  `;
}
