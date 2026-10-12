import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { buildMetaPixelPurchaseScript } from "../src/lib/meta-pixel.ts";

const purchase = { value: 87, currency: "GHS", transactionId: "payment-123" };

test("Meta Purchase sends value, GHS currency and a dedup event ID", () => {
  const calls = [];
  const window = { fbq: (...args) => calls.push(args) };
  runInNewContext(buildMetaPixelPurchaseScript(purchase), { window, setTimeout });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["track", "Purchase", { value: 87, currency: "GHS" }, { eventID: "purchase-payment-123" }]]);
});

test("Meta Purchase waits for the base pixel to load", async () => {
  const calls = [];
  const window = {};
  runInNewContext(buildMetaPixelPurchaseScript(purchase), { window, setTimeout });
  window.fbq = (...args) => calls.push(args);
  await new Promise((resolve) => setTimeout(resolve, 250));
  assert.equal(calls.length, 1);
  assert.equal(calls[0][1], "Purchase");
});

test("invalid purchases are rejected and IDs cannot break out of the script", () => {
  for (const invalid of [{ ...purchase, value: 0 }, { ...purchase, currency: "" }, { ...purchase, transactionId: " " }]) {
    assert.throws(() => buildMetaPixelPurchaseScript(invalid));
  }
  assert.doesNotMatch(buildMetaPixelPurchaseScript({ ...purchase, transactionId: "</script>" }), /<\/script>/);
});
