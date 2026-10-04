import assert from "node:assert/strict";
import test from "node:test";

import { generateOrderReference, getOrderTrackingUrl, normalizeOrderReference } from "../src/lib/order-reference.ts";

test("customer order references are easy to track and normalize", () => {
  const orderNumber = generateOrderReference("paystack-ref-123");

  assert.match(orderNumber, /^RCH-\d{6}-[A-Z0-9]{4,8}$/);
  assert.equal(normalizeOrderReference("order-RCH-240101-ABCD"), "RCH-240101-ABCD");
  assert.equal(normalizeOrderReference("RCH-240101-ABCD"), "RCH-240101-ABCD");
});

test("tracking URL contains the order number but no customer email", () => {
  const previousSiteUrl = process.env.NEXT_PUBLIC_SITE_URL;
  process.env.NEXT_PUBLIC_SITE_URL = "https://38riches.example/";

  try {
    assert.equal(getOrderTrackingUrl("RCH-241004-ABCD"), "https://38riches.example/track?reference=RCH-241004-ABCD");
  } finally {
    if (previousSiteUrl === undefined) delete process.env.NEXT_PUBLIC_SITE_URL;
    else process.env.NEXT_PUBLIC_SITE_URL = previousSiteUrl;
  }
});