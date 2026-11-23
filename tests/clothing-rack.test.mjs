import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import * as jsxRuntime from "react/jsx-runtime";
import ts from "typescript";

const source = readFileSync(new URL("../src/components/clothing-rack.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } }).outputText;
const products = Array.from({ length: 6 }, (_, i) => ({ slug: `piece-${i}`, title: `Piece ${i}`, description: `Description ${i}`, category: "Tee", priceCents: 32000, image: `/images/existing-product-${i}.jpg` }));

function rack(items = products, reducedMotion = false) {
  const state = [];
  let cursor = 0;
  const exports = {};
  runInNewContext(compiled, {
    exports,
    window: { matchMedia: () => ({ matches: reducedMotion }) },
    require(id) {
      if (id === "react/jsx-runtime") return jsxRuntime;
      if (id === "react") return { useId: () => "id", useState(initial) { const slot = cursor++; if (!(slot in state)) state[slot] = initial; return [state[slot], (value) => { state[slot] = value; }]; } };
      if (id === "next/image") return { __esModule: true, default: "img" };
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

test("empty catalog leaves six disabled positions without invented product photos or links", () => {
  const render = rack([]);
  const tree = render();
  assert.equal(buttons(tree).length, 6);
  assert.equal(title(tree), "New pieces coming soon");
  assert.ok(buttons(tree).every((button) => button.props.disabled));
  assert.ok(!elements(detail(tree)).some((element) => element.props?.href?.startsWith("/product/")));
  assert.ok(elements(tree).some((element) => element.props?.href === "#shop"));
});


test("rack uses existing catalog photos without fabricated garment artwork", () => {
  const tree = rack()();
  const photos = elements(tree).filter((element) => typeof element.type === "function" && element.props?.product);
  assert.equal(photos.length, 6);
  for (let index = 0; index < photos.length; index++) {
    const photoTree = photos[index].type(photos[index].props);
    const image = elements(photoTree).find((element) => element.type === "img");
    assert.equal(image.props.src, products[index].image);
    assert.equal(image.props.alt, `${products[index].title} — catalog photograph`);
    assert.equal(image.props.draggable, false);
  }
});

test("photo error exposes a readable fallback instead of a broken image", () => {
  const render = rack([products[0]]);
  const photo = elements(render()).find((element) => typeof element.type === "function" && element.props?.product);
  const image = elements(photo.type(photo.props)).find((element) => element.type === "img");
  image.props.onError();
  render();
  const fallback = elements(photo.type(photo.props));
  assert.ok(!fallback.some((element) => element.type === "img"));
  assert.ok(fallback.some((element) => element.props?.children === "Photo unavailable"));
});

test("mouse motion applies bounded 3D tilt and pointer leave resets it", () => {
  const button = buttons(rack()())[0];
  const values = new Map();
  const event = { pointerType: "mouse", clientX: 200, clientY: -50, currentTarget: { getBoundingClientRect: () => ({ left: 0, top: 0, width: 100, height: 100 }), style: { setProperty: (key, value) => values.set(key, value), removeProperty: (key) => values.delete(key) } } };
  button.props.onPointerMove(event);
  assert.equal(values.get("--tilt-x"), "5deg");
  assert.equal(values.get("--tilt-y"), "8deg");
  button.props.onPointerLeave(event);
  assert.equal(values.size, 0);
  button.props.onPointerMove({ ...event, pointerType: "touch" });
  assert.equal(values.size, 0);
});

test("reduced motion never applies pointer tilt", () => {
  const button = buttons(rack(products, true)())[0];
  button.props.onPointerMove({ pointerType: "mouse", currentTarget: { getBoundingClientRect() { assert.fail("must not calculate motion"); } } });
});

test("a short catalog selects the first product and keyboard wraps only existing pieces", () => {
  const render = rack([products[0]]);
  assert.equal(title(render()), "Piece 0");
  let focused = false;
  buttons(render())[0].props.onKeyDown({ key: "ArrowRight", preventDefault() {}, currentTarget: { parentElement: { querySelectorAll: () => [{ focus() { focused = true; } }] } } });
  assert.equal(title(render()), "Piece 0");
  assert.equal(focused, true);
});
