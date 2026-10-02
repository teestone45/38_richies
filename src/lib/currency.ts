export function formatCurrency(amount: number, currency = "GHS") {
  return new Intl.NumberFormat("en-GH", { style: "currency", currency }).format(amount);
}