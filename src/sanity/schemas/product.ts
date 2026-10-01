const productSchema = {
  name: "product",
  title: "Product",
  type: "document",
  fields: [
    { name: "title", title: "Title", type: "string", validation: (rule: { required: () => unknown }) => rule.required() },
    { name: "slug", title: "Slug", type: "slug", options: { source: "title", maxLength: 96 }, validation: (rule: { required: () => unknown }) => rule.required() },
    { name: "price", title: "Price (USD)", type: "number", validation: (rule: { required: () => { positive: () => unknown } }) => rule.required().positive() },
    { name: "description", title: "Description", type: "text", rows: 4 },
    { name: "image", title: "External image URL", type: "url" },
    { name: "images", title: "Product images", type: "array", of: [{ type: "image", options: { hotspot: true } }] },
    { name: "category", title: "Category", type: "string" },
    { name: "badge", title: "Drop label", type: "string" },
    { name: "sizes", title: "Available sizes", type: "array", of: [{ type: "string" }], options: { layout: "tags" } },
    {
      name: "inventory",
      title: "Stock by size",
      type: "array",
      of: [{
        type: "object",
        fields: [
          { name: "size", title: "Size", type: "string", validation: (rule: { required: () => unknown }) => rule.required() },
          { name: "quantity", title: "Units on hand", type: "number", validation: (rule: { required: () => { integer: () => { min: (value: number) => unknown } } }) => rule.required().integer().min(0) },
        ],
        preview: { select: { title: "size", subtitle: "quantity" } },
      }],
    },
    { name: "featured", title: "Feature on storefront", type: "boolean", initialValue: false },
    { name: "active", title: "Store status", type: "boolean", initialValue: true },
    { name: "dtfPlacement", title: "Print / decoration placement", type: "string" },
    { name: "fabric", title: "Fabric / weight", type: "string" },
    { name: "printMethod", title: "Print method", type: "string", options: { list: ["DTF", "DTG", "Embroidered"] } },
    {
      name: "artwork",
      title: "Graphic artwork",
      type: "object",
      fields: [
        { name: "top", title: "Top line", type: "string" },
        { name: "center", title: "Main graphic text", type: "string" },
        { name: "bottom", title: "Bottom line", type: "string" },
        { name: "palette", title: "Graphic palette", type: "string" },
      ],
    },
    { name: "removed", title: "Removed from catalog", type: "boolean", initialValue: false },
  ],
};

export const orderSchema = {
  name: "order",
  title: "Order",
  type: "document",
  fields: [
    { name: "stripeSessionId", title: "Stripe Checkout Session", type: "string" },
    { name: "email", title: "Customer email", type: "string" },
    { name: "items", title: "Items", type: "array", of: [{ type: "object", fields: [{ name: "productId", type: "string" }, { name: "title", type: "string" }, { name: "size", type: "string" }, { name: "quantity", type: "number" }, { name: "unitAmount", type: "number" }] }] },
    { name: "amountTotal", title: "Total (cents)", type: "number" },
    { name: "currency", title: "Currency", type: "string" },
    { name: "stripePaymentIntentId", title: "Stripe payment intent", type: "string" },
    { name: "status", title: "Fulfillment status", type: "string", options: { list: ["paid", "packing", "shipped", "cancelled", "inventory_issue"] } },
    { name: "shippingAddress", title: "Shipping address", type: "text" },
    { name: "trackingNumber", title: "Tracking number", type: "string" },
    { name: "createdAt", title: "Created at", type: "datetime" },
    { name: "emailNotifiedAt", title: "Confirmation email sent at", type: "datetime" },
  ],
};

export default productSchema;