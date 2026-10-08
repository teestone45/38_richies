import assert from "node:assert/strict";
import * as crypto from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../src/app/api/support/route.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;

function handler({ configured = true, count = 0, mailStatus = 200 } = {}) {
  const deliveries = [];
  const records = [];
  const client = {
    fetch: async () => count ? { _rev: "test-revision", startedAt: Date.now(), count } : null,
    create: async (record) => records.push(record),
    patch: () => ({ ifRevisionId() { return this; }, set() { return this; }, async commit() {} }),
  };
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require: (id) => {
      if (id === "@/lib/sanity-admin") return { getSanityAdminClient: () => client };
      if (id === "node:crypto") return crypto;
      throw new Error(`Unexpected dependency: ${id}`);
    },
    process: { env: configured ? { RESEND_API_KEY: "test-only", SUPPORT_EMAIL_FROM: "support@example.com" } : {} },
    console: { error() {} },
    Response, Date, AbortSignal, URL,
    fetch: async (url, options) => {
      deliveries.push({ url, ...JSON.parse(options.body) });
      return new Response(null, { status: mailStatus });
    },
  });
  return { post: exports.POST, deliveries, records };
}

function request(fields = {}, origin = "https://shop.example.com") {
  return new Request("https://shop.example.com/api/support", {
    method: "POST",
    headers: { origin, "content-type": "application/json", "x-forwarded-for": "192.0.2.1" },
    body: JSON.stringify({ name: "Test Customer", email: "customer@example.com", message: "Please help with my order.", ...fields }),
  });
}

test("sends to the shop with customer Reply-To and plain text", async () => {
  const { post, deliveries, records } = handler();
  const response = await post(request({ message: "<b>Help with my order</b>" }));
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { sent: true });
  assert.deepEqual(deliveries[0].to, ["38richiesclothing@gmail.com"]);
  assert.equal(deliveries[0].reply_to, "customer@example.com");
  assert.ok(deliveries[0].text.includes("<b>Help with my order</b>"));
  assert.equal(deliveries[0].html, undefined);
  assert.equal(records[0].count, 1);
  assert.ok(!records[0]._id.includes("192.0.2.1"));
});

test("rejects other origins before sending", async () => {
  const { post, deliveries } = handler();
  assert.equal((await post(request({}, "https://untrusted.example"))).status, 403);
  assert.equal(deliveries.length, 0);
});

test("rejects malformed inputs and honeypot submissions", async () => {
  const { post, deliveries } = handler();
  for (const fields of [{ email: "invalid" }, { message: "short" }, { website: "spam" }, { reference: "order\ninjected" }]) {
    assert.equal((await post(request(fields))).status, 400);
  }
  assert.equal(deliveries.length, 0);
});

test("missing mail configuration reports unavailable, not success", async () => {
  const { post, deliveries } = handler({ configured: false });
  assert.equal((await post(request())).status, 503);
  assert.equal(deliveries.length, 0);
});

test("rate limit blocks further emails", async () => {
  const { post, deliveries } = handler({ count: 5 });
  assert.equal((await post(request())).status, 429);
  assert.equal(deliveries.length, 0);
});

test("Resend rejection never returns a success message", async () => {
  const { post } = handler({ mailStatus: 403 });
  const response = await post(request());
  assert.equal(response.status, 502);
  assert.ok((await response.json()).error);
});
