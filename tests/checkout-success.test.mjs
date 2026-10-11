import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const source = readFileSync(new URL("../src/components/checkout-success.tsx", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
});
const componentModule = { exports: {} };
const componentRequire = (name) => {
  if (name === "next/link") return { default: ({ children, ...props }) => React.createElement("a", props, children) };
  if (name === "@/lib/cart-store") return { useCartStore: (selector) => selector({ clearCart() {} }) };
  return require(name);
};
new Function("require", "module", "exports", outputText)(componentRequire, componentModule, componentModule.exports);
const CheckoutSuccess = componentModule.exports.default;

test("verified payments show thanks, tracking code, and shopping actions", () => {
  const html = renderToStaticMarkup(React.createElement(CheckoutSuccess, {
    verified: true,
    paymentProvider: "Paystack",
    orderReference: "RCH-261011-ABCD",
  }));
  assert.match(html, /THANK YOU<br\/>FOR YOUR ORDER\./);
  assert.match(html, /Your Paystack payment is confirmed/);
  assert.match(html, /checkout email/);
  assert.match(html, /<code>RCH-261011-ABCD<\/code>/);
  assert.match(html, /href="\/track\?reference=RCH-261011-ABCD"/);
  assert.match(html, /href="\/#shop"/);
  assert.match(html, /Continue shopping/);
});

test("unconfirmed payments never show thanks or tracking and retain the return-to-bag action", () => {
  const html = renderToStaticMarkup(React.createElement(CheckoutSuccess, {
    verified: false,
    paymentProvider: "Paystack",
    orderReference: "unverified-reference",
  }));
  assert.match(html, /PAYMENT<br\/>UNCONFIRMED\./);
  assert.match(html, /Your bag is still saved/);
  assert.match(html, /href="\/cart"/);
  assert.doesNotMatch(html, /THANK YOU|<code>|Continue shopping|href="\/track\?/);
});

test("pre-order thank-you messages preserve the full-payment and shipping-date notice", () => {
  const html = renderToStaticMarkup(React.createElement(CheckoutSuccess, {
    verified: true,
    paymentProvider: "Paystack",
    orderReference: "RCH-261011-ABCD",
    passport: {
      orderNumber: "RCH-261011-ABCD",
      createdAt: "2026-10-11T12:00:00Z",
      items: [{ title: "Pre-order tee", size: "XL", quantity: 1, preOrder: true }],
    },
  }));
  assert.match(html, /Pre-order items are paid in full; their shipping date will be announced later/);
  assert.match(html, /PRE-ORDER \/ SHIPPING DATE TO BE ANNOUNCED/);
});
