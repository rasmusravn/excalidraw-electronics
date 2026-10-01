// PROTOTYPE — throwaway. Answers "What do Symbols look like?" (issue #7).
// Three structurally different drawing conventions (A/B/C) for the same Symbols.
// Writes one .excalidrawlib per variant plus catalog.excalidraw showing all three.
// Run: node gen.mjs   (output in ./out)

import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
const fontkit = createRequire(import.meta.url)("fontkit");

const GRID = 20;
const INK = "#1e1e1e";

// ---------- variants ----------
const VARIANTS = {
  A: {
    title: "A: Compact (Nunito 16, stroke 1, small bodies, designator above / value below)",
    font: { id: 6, file: "Nunito", size: 16, lh: 1.25 },
    stroke: 1, s: 1, pinMarks: false, npnCircle: false, labels: "above-below", blockLabel: "below",
  },
  B: {
    title: "B: Roomy (Liberation Sans 20, stroke 2, large bodies, labels stacked below)",
    font: { id: 9, file: "LiberationSans", size: 20, lh: 1.15 },
    stroke: 2, s: 1.5, pinMarks: false, npnCircle: true, labels: "below", blockLabel: "below",
  },
  C: {
    title: "C: Datasheet (Cascadia 14, stroke 1.5, visible pin dots, labels stacked above, block labels inside)",
    font: { id: 3, file: "Cascadia", size: 14, lh: 1.2 },
    stroke: 1.5, s: 1, pinMarks: true, npnCircle: true, labels: "above", blockLabel: "inside",
  },
};

const fonts = {};
const measure = (f, str) => {
  fonts[f.file] ??= fontkit.openSync(new URL(`fonts/${f.file}.woff2`, import.meta.url).pathname);
  const fk = fonts[f.file];
  const w = fk.layout(str).advanceWidth / fk.unitsPerEm * f.size;
  return { w: Math.ceil(w), h: f.size * f.lh };
};

// ---------- element primitives ----------
let ctx; // { v, group, prefix, n }
const hash = (s) => createHash("sha1").update(s).digest();
const base = (type, x, y, w, h, extra = {}) => {
  const k = `${ctx.prefix}:${ctx.n++}`;
  const hb = hash(k);
  return {
    id: hb.toString("hex").slice(0, 20), type, x, y, width: w, height: h, angle: 0,
    strokeColor: INK, backgroundColor: "transparent", fillStyle: "solid",
    strokeWidth: ctx.v.stroke, strokeStyle: "solid", roughness: 0, opacity: 100,
    groupIds: [ctx.group], frameId: null, roundness: null,
    seed: hb.readUInt32BE(0) >>> 1, version: 1, versionNonce: hb.readUInt32BE(4) >>> 1,
    isDeleted: false, boundElements: null, updated: 1, link: null, locked: false,
    ...extra,
  };
};
const poly = (pts, extra = {}) => {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), y0 = Math.min(...ys);
  // line elements are anchored at their first point
  const [fx, fy] = pts[0];
  return base("line", fx, fy, Math.max(...xs) - x0, Math.max(...ys) - y0, {
    points: pts.map(([x, y]) => [x - fx, y - fy]), lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null, polygon: false,
    ...extra,
  });
};
const L = (...pts) => poly(pts);
const filled = (...pts) => poly([...pts, pts[0]], { backgroundColor: INK, polygon: true });
const rect = (x, y, w, h) => base("rectangle", x, y, w, h);
const circ = (cx, cy, r, extra = {}) => base("ellipse", cx - r, cy - r, 2 * r, 2 * r, extra);
const text = (x, y, str, align = "left") => {
  const f = ctx.v.font, m = measure(f, str);
  const ax = align === "center" ? x - m.w / 2 : x;
  return base("text", ax, y, m.w, m.h, {
    text: str, originalText: str, fontSize: f.size, fontFamily: f.id, textAlign: align,
    verticalAlign: "top", containerId: null, lineHeight: f.lh, autoResize: true,
  });
};
const pins = [];
const pin = (x, y) => {
  pins.push([x, y]);
  const out = [circ(x, y, 5, { opacity: 0, customData: { pin: true } })]; // Pin target
  if (ctx.v.pinMarks) out.push(circ(x, y, 2.5));
  return out;
};
const sine = (x0, cy, w, a) => {
  const pts = [];
  for (let i = 0; i <= 16; i++) pts.push([x0 + (w * i) / 16, cy - a * Math.sin((2 * Math.PI * i) / 16)]);
  return poly(pts);
};

// ---------- labels ----------
const th = () => ctx.v.font.size * ctx.v.font.lh;
const schemLabels = (x0, top, bottom, des, val) => {
  const v = ctx.v, out = [];
  if (v.labels === "above-below") {
    out.push(text(x0, top - th() - 2, des), text(x0, bottom + 2, val));
  } else if (v.labels === "below") {
    out.push(text(x0, bottom + 4, des), text(x0, bottom + 4 + th(), val));
  } else {
    out.push(text(x0, top - 2 * th() - 2, des), text(x0, top - th() - 2, val));
  }
  return out;
};
const blockLabel = (cx, top, bottom, str, insideOk = true) =>
  ctx.v.blockLabel === "inside" && insideOk
    ? [text(cx, (top + bottom) / 2 - th() / 2, str, "center")]
    : [text(cx, bottom + 4, str, "center")];

// ---------- symbols (pins always at multiples of GRID in local coords) ----------
const g = (n) => n * GRID;
const SYMBOLS = {
  "Resistor": () => {
    const s = ctx.v.s, len = g(Math.round(4 * s)), bw = len - g(2), bh = Math.round(14 * s), y = 0;
    return [L([0, y], [g(1), y]), rect(g(1), y - bh / 2, bw, bh), L([g(1) + bw, y], [len, y]),
      ...pin(0, y), ...pin(len, y), ...schemLabels(g(1), y - bh / 2, y + bh / 2, "R?", "10k")];
  },
  "Resistor (ANSI)": () => {
    const s = ctx.v.s, len = g(Math.round(4 * s)), bw = len - g(2), a = Math.round(7 * s), pts = [[g(1), 0]];
    for (let i = 1; i <= 6; i++) pts.push([g(1) + (bw * (2 * i - 1)) / 12, i % 2 ? -a : a]);
    pts.push([g(1) + bw, 0]);
    return [L([0, 0], [g(1), 0]), poly(pts), L([g(1) + bw, 0], [len, 0]),
      ...pin(0, 0), ...pin(len, 0), ...schemLabels(g(1), -a, a, "R?", "10k")];
  },
  "Capacitor": () => {
    const s = ctx.v.s, len = g(Math.round(3 * s)), c = len / 2, gap = Math.round(5 * s), h = Math.round(14 * s);
    return [L([0, 0], [c - gap, 0]), L([c - gap, -h], [c - gap, h]), L([c + gap, -h], [c + gap, h]),
      L([c + gap, 0], [len, 0]), ...pin(0, 0), ...pin(len, 0), ...schemLabels(0, -h, h, "C?", "100n")];
  },
  "NPN transistor": () => {
    // Pins B (0, 2u), C (2u, 0), E (2u, 4u) with u = 20*s; s ∈ {1, 1.5} keeps all three on the grid.
    const m = ctx.v.s, P = (x, y) => [x * m, y * m], out = [];
    const bx = 24, by = 40;
    out.push(L(P(0, by), P(bx, by)), L(P(bx, by - 14), P(bx, by + 14)));
    out.push(L(P(bx, by - 6), P(40, 20), P(40, 0)));
    out.push(L(P(bx, by + 6), P(40, 60), P(40, 80)));
    // emitter arrow head on the diagonal, pointing outward
    const [sx, sy] = P(bx, by + 6), [ex, ey] = P(40, 60), dx = ex - sx, dy = ey - sy, d = Math.hypot(dx, dy), ux = dx / d, uy = dy / d;
    const tx = sx + dx * 0.8, ty = sy + dy * 0.8, a = 7 * m;
    out.push(filled([tx, ty], [tx - a * ux + (a / 2) * uy, ty - a * uy - (a / 2) * ux], [tx - a * ux - (a / 2) * uy, ty - a * uy + (a / 2) * ux]));
    const [cx, cy] = P(34, 40), r = 20 * m;
    if (ctx.v.npnCircle) out.push(circ(cx, cy, r));
    out.push(...pin(...P(0, 40)), ...pin(...P(40, 0)), ...pin(...P(40, 80)));
    const lx = (ctx.v.npnCircle ? cx + r : 40 * m) + 6;
    out.push(text(lx, cy - th(), "Q?"), text(lx, cy, "BFR92"));
    return out;
  },
  "Amplifier": () => {
    const s = ctx.v.s, w = g(Math.round(2 * s)), lead = g(1), h = w; // triangle w×h
    return [L([0, 0], [lead, 0]), poly([[lead, -h / 2], [lead + w, 0], [lead, h / 2], [lead, -h / 2]], { polygon: true }),
      L([lead + w, 0], [2 * lead + w, 0]), ...pin(0, 0), ...pin(2 * lead + w, 0),
      ...blockLabel(lead + w / 2, -h / 2, h / 2, "LNA", false)];
  },
  "Mixer": () => {
    const s = ctx.v.s, r = g(Math.round(1 * s)), lead = g(1), cx = lead + r, k = r / Math.SQRT2;
    return [L([0, 0], [lead, 0]), circ(cx, 0, r), L([cx - k, -k], [cx + k, k]), L([cx - k, k], [cx + k, -k]),
      L([cx + r, 0], [cx + r + lead, 0]), L([cx, r], [cx, r + lead]),
      ...pin(0, 0), ...pin(cx + r + lead, 0), ...pin(cx, r + lead),
      text(cx + r / 2 + 4, -r - th(), "MIX")];
  },
  "Band-pass filter": () => {
    const s = ctx.v.s, w = g(Math.round(2 * s)), lead = g(1), x0 = lead, out = [];
    out.push(L([0, 0], [lead, 0]), rect(x0, -w / 2, w, w), L([x0 + w, 0], [x0 + w + lead, 0]));
    const ww = w * 0.5, wx = x0 + (w - ww) / 2, a = w * 0.06;
    const inside = ctx.v.blockLabel === "inside";
    const ys = inside ? [-w * 0.32, -w * 0.18, -w * 0.04] : [-w * 0.22, 0, w * 0.22];
    ys.forEach((y, i) => {
      out.push(sine(wx, y, ww, a));
      if (i !== 1) out.push(L([wx + ww * 0.35, y + a * 2.2], [wx + ww * 0.65, y - a * 2.2]));
    });
    if (inside) out.push(text(x0 + w / 2, w * 0.12, "BPF", "center"));
    else out.push(text(x0 + w / 2, w / 2 + 4, "BPF 2.4G", "center"));
    out.push(...pin(0, 0), ...pin(x0 + w + lead, 0));
    return out;
  },
};

// ---------- assembly ----------
const bounds = (els) => {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const e of els) { x0 = Math.min(x0, e.x, e.x + (e.points ? Math.min(...e.points.map((p) => p[0])) : 0));
    y0 = Math.min(y0, e.y, e.y + (e.points ? Math.min(...e.points.map((p) => p[1])) : 0));
    x1 = Math.max(x1, e.x + (e.points ? Math.max(...e.points.map((p) => p[0])) : e.width));
    y1 = Math.max(y1, e.y + (e.points ? Math.max(...e.points.map((p) => p[1])) : e.height)); }
  return { x0, y0, x1, y1 };
};
const floorG = (n) => Math.floor(n / GRID) * GRID;

function buildSymbol(vk, name) {
  ctx = { v: VARIANTS[vk], group: hash(`${vk}:${name}:group`).toString("hex").slice(0, 20), prefix: `${vk}:${name}`, n: 0 };
  pins.length = 0;
  const els = SYMBOLS[name]();
  // Grid anchor: an invisible 1px line at the grid point at/above-left of everything,
  // so the item's bounding-box top-left is on the same grid as the pins (pin targets and
  // labels protrude past the pins otherwise).
  const b = bounds(els);
  const ax = floorG(b.x0), ay = floorG(b.y0);
  els.unshift(base("line", ax, ay, 1, 0, { opacity: 0, points: [[0, 0], [1, 0]], lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null, polygon: false, customData: { gridAnchor: true } }));
  // normalise so the anchor sits at (0,0)
  for (const e of els) { e.x -= ax; e.y -= ay; }
  const p = pins.map(([x, y]) => [x - ax, y - ay]);
  const bad = p.filter(([x, y]) => x % GRID || y % GRID);
  if (bad.length) throw new Error(`${vk} ${name}: pins off grid ${JSON.stringify(bad)}`);
  return { els, pins: p };
}

const idx = (i) => "a" + "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"[i];
fs.mkdirSync(new URL("out/", import.meta.url), { recursive: true });
const catalog = [];
let row = 0;
const catCtx = (k) => ({ v: VARIANTS.A, group: `cat-${k}`, prefix: `cat:${k}`, n: 0 });

for (const vk of Object.keys(VARIANTS)) {
  const items = [];
  // row title
  ctx = catCtx(`title-${vk}`);
  const tTitle = text(0, row, VARIANTS[vk].title); tTitle.groupIds = []; catalog.push(tTitle);
  let col = 0, rowH = 0;
  const built = Object.keys(SYMBOLS).map((name) => [name, buildSymbol(vk, name).els]);
  const capY = row + g(3) + Math.max(...built.map(([, els]) => floorG(bounds(els).y1))) + g(2);
  for (const [name, els] of built) {
    els.forEach((e, i) => (e.index = idx(i)));
    items.push({ id: hash(`${vk}:${name}:item`).toString("hex").slice(0, 20), status: "published", created: 1,
      name: `${name} [${vk}]`, elements: els });
    const b = bounds(els);
    // catalog copy, placed on grid
    const dx = col, dy = row + g(3);
    for (const e of els) catalog.push({ ...structuredClone(e), id: `${e.id}c`, x: e.x + dx, y: e.y + dy, groupIds: [`${e.groupIds[0]}c`] });
    ctx = catCtx(`name-${vk}-${name}`);
    const t = text(dx, capY, name); t.groupIds = []; t.strokeColor = "#868e96"; catalog.push(t);
    col += floorG(b.x1) + g(4);
    rowH = Math.max(rowH, b.y1);
  }
  row = capY + g(4);
  fs.writeFileSync(new URL(`out/proto-${vk}.excalidrawlib`, import.meta.url),
    JSON.stringify({ type: "excalidrawlib", version: 2, source: "excalidraw-electronics prototype", libraryItems: items }, null, 2));
}
for (const e of catalog) delete e.index; // restore assigns valid fractional indices
fs.writeFileSync(new URL("out/proto-catalog.excalidraw", import.meta.url), JSON.stringify({
  type: "excalidraw", version: 2, source: "excalidraw-electronics prototype", elements: catalog,
  appState: { gridSize: GRID, gridModeEnabled: true, viewBackgroundColor: "#ffffff" }, files: {},
}, null, 2));
console.log("wrote out/proto-{A,B,C}.excalidrawlib and out/proto-catalog.excalidraw");
