import assert from "node:assert/strict";
import test from "node:test";
import { getGa4Config, parseRangeDays } from "../src/lib/ga4-reports.ts";

test("range days accept only supported values and default to 28", () => {
  assert.equal(parseRangeDays("7"), 7);
  assert.equal(parseRangeDays("90"), 90);
  assert.equal(parseRangeDays("365"), 28);
  assert.equal(parseRangeDays(null), 28);
});

test("GA4 config requires every server-side credential", () => {
  assert.equal(getGa4Config({}), null);
  assert.equal(getGa4Config({ GA4_PROPERTY_ID: "558419828", GA4_CLIENT_EMAIL: "a@b.com" }), null);
  assert.equal(getGa4Config({ GA4_PROPERTY_ID: "G-MTSJWE7Y7", GA4_CLIENT_EMAIL: "a@b.com", GA4_PRIVATE_KEY: "k" }), null);
});

test("GA4 private key escaped newlines are restored", () => {
  const config = getGa4Config({
    GA4_PROPERTY_ID: " 558419828 ", GA4_CLIENT_EMAIL: "a@b.com", GA4_PRIVATE_KEY: "line1\\nline2",
  });
  assert.deepEqual(config, { propertyId: "558419828", clientEmail: "a@b.com", privateKey: "line1\nline2" });
});
