// Draws the README's example: a superheterodyne receiver chain, placed from the Library's own
// Symbols and wired with elbow Wires bound to their Pins, on the project's Template settings. Writes docs/images/receiver.excalidraw (open it in
// Excalidraw to edit), receiver.svg and, if Chromium is installed, receiver.png.
// Usage: node scripts/readme-image.ts
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { build } from "../src/build.ts";
import type { Element } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { loadExcalidraw } from "../test/excalidraw.ts";
import { INK, STROKE, text } from "../src/primitives.ts";

const out = "docs/images";
const { rfBlocks } = build(definitions, { version: "0" });
const item = (name: string) => rfBlocks.libraryItems.find((i) => i.name === name)!;

type Placed = { name: string; x: number; y: number; id: string };
const elements: any[] = [];
const place = (name: string, x: number, y: number, id: string): Placed => {
  for (const e of item(name).elements) elements.push({ ...structuredClone(e), id: `${id}-${e.id}`, x: e.x + x, y: e.y + y, groupIds: e.groupIds.map((g) => `${id}-${g}`) });
  return { name, x, y, id };
};

// The Pin target on one side of a placed Symbol, and where its Pin end is.
const SIDE = { left: [-1, 0], right: [1, 0], top: [0, -1], bottom: [0, 1] } as const;
const targetOf = ({ id }: Placed, side: keyof typeof SIDE) => {
  const [sx, sy] = SIDE[side];
  const t = elements.find((e) => e.id.startsWith(`${id}-`) && e.customData?.pinEnd && Math.sign(e.customData.pinEnd[0]) === sx && Math.sign(e.customData.pinEnd[1]) === sy);
  if (!t) throw new Error(`${id} has no ${side} Pin`);
  return t;
};
const pinEnd = (t: any) => [t.x + t.width / 2 + t.customData.pinEnd[0], t.y + t.height / 2 + t.customData.pinEnd[1]];

// A Wire as the template draws them: an elbow arrow without arrowheads, bound to a Pin target at each
// end the way Excalidraw binds one, the binding gap outside the target.
let wires = 0;
const bind = (t: any, side: keyof typeof SIDE, arrowId: string) => {
  const gap = 5 + t.strokeWidth / 2;
  const [sx, sy] = SIDE[side];
  t.boundElements = [...(t.boundElements ?? []), { type: "arrow", id: arrowId }];
  return { elementId: t.id, mode: "orbit", fixedPoint: [sx === 0 ? 0.5 : sx < 0 ? -gap / t.width : 1 + gap / t.width, sy === 0 ? 0.5 : sy < 0 ? -gap / t.height : 1 + gap / t.height] };
};
const wire = (from: [Placed, keyof typeof SIDE], to: [Placed, keyof typeof SIDE]) => {
  const [a, b] = [targetOf(...from), targetOf(...to)];
  const id = `wire-${wires++}`;
  const [x, y] = pinEnd(a);
  const [ex, ey] = pinEnd(b);
  elements.push({
    type: "arrow", id, x, y, width: Math.abs(ex - x), height: Math.abs(ey - y), angle: 0, strokeColor: INK, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: STROKE, strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null,
    index: null, roundness: { type: 3 }, seed: 1 + wires, version: 1, versionNonce: 1 + wires, isDeleted: false, boundElements: null,
    updated: 1, link: null, locked: false, points: [[0, 0], [ex - x, ey - y]], lastCommittedPoint: null,
    startBinding: bind(a, from[1], id), endBinding: bind(b, to[1], id), startArrowhead: null, endArrowhead: null, elbowed: true,
  });
};
const caption = (s: string, x: number, y: number, id: string) => elements.push({ ...text(x, y, s), id, strokeColor: "#868e96", index: null });

// The chain sits on y = 0. Pins are on the 20px grid, so every Wire runs on it.
const ant = place("Antenna", 0, -100, "ant");
const rf = place("Band-pass filter", 100, -20, "rf");
const lna = place("Amplifier", 240, -20, "lna");
const mix = place("Mixer", 380, -40, "mix");
const lo = place("Local oscillator", 400, 120, "lo");
const ifb = place("Band-pass filter", 520, -20, "if");
const vga = place("Variable-gain amplifier", 640, -20, "vga");
const adc = place("ADC", 780, -20, "adc");

wire([ant, "bottom"], [rf, "left"]);
wire([rf, "right"], [lna, "left"]);
wire([lna, "right"], [mix, "left"]);
wire([lo, "top"], [mix, "bottom"]);
wire([mix, "right"], [ifb, "left"]);
wire([ifb, "right"], [vga, "left"]);
wire([vga, "right"], [adc, "left"]);

caption("RF 1.1 GHz", 110, -50, "cap-rf");
caption("IF 100 MHz", 530, -50, "cap-if");
caption("Superheterodyne receiver, drawn from the Library", 0, -160, "title");

const L = await loadExcalidraw("fork");
// New drawings start from the project's Template, so the picture uses its settings: the 20px grid,
// elbow arrows without arrowheads, roughness 0, Cascadia 14, stroke 1.5.
const template = JSON.parse(build(definitions, { version: "0" }).template.match(/```json\n([\s\S]*?)\n```/)![1]);
const appState = { ...template.appState, viewBackgroundColor: "#ffffff", exportBackground: true };
const scene: any[] = L.restoreElements(elements, null, { repairBindings: true });
// Settle each Wire onto its bindings, as Excalidraw does when one is drawn.
const byId = new Map<string, any>(scene.map((e) => [e.id, e]));
for (const e of scene.filter((e) => e.type === "arrow")) L.mutateElement(e, byId, { points: e.points });
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/receiver.excalidraw`, `${JSON.stringify({ type: "excalidraw", version: 2, source: "https://github.com/rasmusravn/excalidraw-electronics", elements: scene, appState, files: {} }, null, 2)}\n`);

const svg: SVGElement = await (L as any).exportToSvg({ elements: scene, appState, files: null, exportPadding: 30, skipInliningFonts: true });
const fontFile = readFileSync("fonts/Cascadia.woff2").toString("base64");
// Excalidraw's export leaves the grid out, so draw the template's own: lines every 20px on scene
// coordinates (where the Pins sit), every fifth one stronger, behind everything else.
const [minX, minY] = L.getCommonBounds(scene);
const [offsetX, offsetY] = [30 - minX, 30 - minY];
const [width, height] = [Number(svg.getAttribute("width")), Number(svg.getAttribute("height"))];
const grid = (to: number, offset: number, vertical: boolean) => {
  const lines: string[] = [];
  for (let at = offset % 20, k = Math.round((at - offset) / 20); at <= to; at += 20, k++) {
    const colour = k % template.appState.gridStep === 0 ? "#d8dce0" : "#eceef0";
    lines.push(vertical ? `<line x1="${at}" y1="0" x2="${at}" y2="${height}" stroke="${colour}"/>` : `<line x1="0" y1="${at}" x2="${width}" y2="${at}" stroke="${colour}"/>`);
  }
  return lines.join("");
};
const gridSvg = `<g stroke-width="1" shape-rendering="crispEdges">${grid(width, offsetX, true)}${grid(height, offsetY, false)}</g>`;
const svgText = svg.outerHTML
  .replace(/font-family="[^"]*"/g, 'font-family="Cascadia Code, monospace"')
  .replace(/(<rect x="0" y="0"[^>]*><\/rect>)/, `$1${gridSvg}`);
writeFileSync(`${out}/receiver.svg`, svgText);

// PNG through headless Chromium, with the font the Symbols use.
const html = `<!doctype html><style>@font-face{font-family:"Cascadia Code";src:url(data:font/woff2;base64,${fontFile})}body{margin:0;background:#fff}svg{display:block}</style>${svgText}`;
const page = `${out}/.receiver.html`;
writeFileSync(page, html);
try {
  execFileSync("chromium", ["--headless", "--disable-gpu", "--force-device-scale-factor=2", `--window-size=${width},${height}`, `--screenshot=${out}/receiver.png`, `file://${process.cwd()}/${page}`], { stdio: "ignore" });
} finally {
  execFileSync("rm", ["-f", page]);
}
console.log(`wrote ${out}/receiver.excalidraw, .svg, .png (${width}x${height})`);
