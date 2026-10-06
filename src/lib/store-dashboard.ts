export type StoreDashboardAction =
  | "search"
  | "filters"
  | "size"
  | "color"
  | "add-to-cart"
  | "availability"
  | "featured"
  | "new-arrivals"
  | "limited-drops";

export const storeDashboardEvent = "38-riches:store-dashboard-action";

export function requestStoreDashboardAction(action: StoreDashboardAction) {
  window.dispatchEvent(new CustomEvent<StoreDashboardAction>(storeDashboardEvent, { detail: action }));
}