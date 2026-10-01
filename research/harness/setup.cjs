// jsdom globals + stubs so the Excalidraw bundles load in Node.
const { JSDOM } = require("jsdom");
const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://localhost/",
  pretendToBeVisual: true,
});
const w = dom.window;
for (const k of Object.getOwnPropertyNames(w)) {
  if (k in globalThis) continue;
  try { globalThis[k] = w[k]; } catch {}
}
globalThis.window = w;
globalThis.self = globalThis;
globalThis.document = w.document;
try { globalThis.navigator = w.navigator; } catch {}
globalThis.localStorage = w.localStorage;
globalThis.devicePixelRatio = 1;
globalThis.requestAnimationFrame = (cb) => setTimeout(cb, 0);
globalThis.cancelAnimationFrame = (id) => clearTimeout(id);
w.requestAnimationFrame = globalThis.requestAnimationFrame;
w.cancelAnimationFrame = globalThis.cancelAnimationFrame;
const ctx = new Proxy({}, {
  get: (t, p) => p === "measureText"
    ? (s) => ({ width: String(s).length * 8, actualBoundingBoxAscent: 8, actualBoundingBoxDescent: 2 })
    : (p in t ? t[p] : () => {}),
  set: (t, p, v) => { t[p] = v; return true; },
});
w.HTMLCanvasElement.prototype.getContext = () => ctx;
class FontFace { constructor(f, s, d) { this.family = f; this.src = s; this.descriptors = d; this.status = "loaded"; } load() { return Promise.resolve(this); } }
globalThis.FontFace = FontFace; w.FontFace = FontFace;
const fonts = { add() {}, delete() {}, has() { return false; }, check() { return true; }, load() { return Promise.resolve([]); }, ready: Promise.resolve(), addEventListener() {}, removeEventListener() {}, [Symbol.iterator]: function* () {} };
Object.defineProperty(w.document, "fonts", { value: fonts });
globalThis.matchMedia = w.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
globalThis.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.EXCALIDRAW_ASSET_PATH = "/";
globalThis.React = require("react");
globalThis.ReactDOM = Object.assign({}, require("react-dom"), require("react-dom/client"));
globalThis.ReactJSXRuntime = require("react/jsx-runtime");
