import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/clothing-rack.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const products = Array.from({ length: 6 }, (_, i) => ({ slug: `piece-${i}`, title: `Piece ${i}`, description: `Description ${i}`, category: "Tee", priceCents: 32000 }));

function rack(items = products) {
  const state = [];
  let cursor = 0;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "react") return { useId: () => "id", useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], (value) => { state[slot] = value; }]; } };
      if (id === "next/link") return { __esModule: true, default: "a" };
      if (id === "@/lib/currency") return { formatCurrency: (price) => `GH₵${price}` };
      if (id.endsWith(".module.css")) return { __esModule: true, default: new Proxy({}, { get: (_, key) => key }) };
      throw new Error(`Unexpected dependency: ${id}`);
    },
  });
  return () => { cursor = 0; return exports.default({ products: items }); };
}

function elements(node) {
  if (!node || typeof node !== "object") return [];
  if (Array.isArray(node)) return node.flatMap(elements);
  return [node, ...elements(node.props?.children)];
}
function buttons(tree) { return elements(tree).filter((element) => element.type === "button"); }
function detail(tree) { return elements(tree).find((element) => element.props?.id === "rack-product-details"); }
function title(tree) { return elements(detail(tree)).find((element) => element.type === "h2").props.children; }

test("six selectable garments expose the selected product and real catalog link", () => {
  const render = rack();
  const tree = render();
  assert.equal(buttons(tree).length, 6);
  assert.equal(buttons(tree)[1].props["aria-pressed"], true);
  assert.equal(title(tree), "Piece 1");
  assert.ok(elements(detail(tree)).some((element) => element.props?.href === "/product/piece-1"));
});

test("hover previews a garment; leaving restores selection; click persists it", () => {
  const render = rack();
  buttons(render())[4].props.onMouseEnter();
  assert.equal(title(render()), "Piece 4");
  elements(render()).find((element) => element.props?.["aria-label"] === "Select a garment").props.onMouseLeave();
  assert.equal(title(render()), "Piece 1");
  buttons(render())[3].props.onClick();
  assert.equal(title(render()), "Piece 3");
  assert.equal(buttons(render())[3].props["aria-pressed"], true);
});

test("keyboard wraps the rack and moves focus to the selected control", () => {
  const render = rack();
  let focused = -1;
  let prevented = false;
  const controls = Array.from({ length: 6 }, (_, index) => ({ focus: () => { focused = index; } }));
  buttons(render())[0].props.onKeyDown({ key: "ArrowLeft", preventDefault() { prevented = true; }, currentTarget: { parentElement: { querySelectorAll: () => controls } } });
  assert.equal(prevented, true);
  assert.equal(focused, 5);
  assert.equal(title(render()), "Piece 5");
});

test("empty catalog still shows six clearly identified concepts without invented product links", () => {
  const render = rack([]);
  const tree = render();
  assert.equal(buttons(tree).length, 6);
  assert.equal(title(tree), "Heavy Hoodie");
  assert.ok(!elements(detail(tree)).some((element) => element.props?.href?.startsWith("/product/")));
  assert.ok(elements(tree).some((element) => element.props?.href === "#shop"));
});
