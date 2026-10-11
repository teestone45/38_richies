import assert from "node:assert/strict";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { buildGoogleAdsPurchaseScript } from "../src/lib/google-ads.ts";

const purchase = { value: 87, currency: "GHS", transactionId: "payment-123" };
const testDestination = "AW-18507081661/test-label";

test("placeholder destination never generates a conversion script", () => {
  assert.equal(buildGoogleAdsPurchaseScript(purchase, "AW-18507081661/YOUR_LABEL_HERE"), null);
});

test("default destination uses the real Google Ads Purchase conversion label", () => {
  const window = {};
  runInNewContext(buildGoogleAdsPurchaseScript(purchase), { window });
  assert.equal(window.dataLayer[0][2].send_to, "AW-18507081661/03tJCICkopkdEL3P7vhE");
});

test("conversion sends the actual value, currency, and stable transaction ID", () => {
  const calls = [];
  const window = { gtag: (...args) => calls.push(args) };
  runInNewContext(buildGoogleAdsPurchaseScript(purchase, testDestination), { window });
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [["event", "conversion", {
    send_to: testDestination, value: 87, currency: "GHS", transaction_id: "payment-123",
  }]]);
});

test("conversion queues safely before the global Google tag initializes", () => {
  const window = {};
  runInNewContext(buildGoogleAdsPurchaseScript(purchase, testDestination), { window });
  const queued = Array.from(window.dataLayer[0]);
  assert.equal(queued[0], "event");
  assert.equal(queued[1], "conversion");
  assert.equal(queued[2].transaction_id, "payment-123");
});

test("invalid paid amounts, currency, transaction IDs, and destinations are rejected", () => {
  for (const invalid of [
    { ...purchase, value: 0 }, { ...purchase, value: NaN }, { ...purchase, value: -1 },
    { ...purchase, currency: "" }, { ...purchase, transactionId: " " },
  ]) assert.throws(() => buildGoogleAdsPurchaseScript(invalid, testDestination));
  assert.throws(() => buildGoogleAdsPurchaseScript(purchase, "AW-other/invalid"));
});

test("transaction IDs cannot break out of the inline script", () => {
  const script = buildGoogleAdsPurchaseScript({ ...purchase, transactionId: "</script>" }, testDestination);
  assert.doesNotMatch(script, /<\/script>/);
  const window = {};
  runInNewContext(script, { window });
  assert.equal(window.dataLayer[0][2].transaction_id, "</script>");
});
