// Draws the README's example: a superheterodyne receiver chain, placed from the Library's own
// Symbols and wired with square Wires. Writes docs/images/receiver.excalidraw (open it in
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

// Where a Pin target's Pin end is, relative to its item's grid anchor.
const pinEnd = (e: Element & { customData?: { pinEnd: number[] } }) => [e.x + e.width / 2 + e.customData!.pinEnd[0], e.y + e.height / 2 + e.customData!.pinEnd[1]];
const pinsOf = (name: string) =>
  item(name).elements.filter((e: any) => e.customData?.pinEnd).map((e: any) => pinEnd(e)).sort((a, b) => a[0] - b[0] || a[1] - b[1]);

type Placed = { name: string; x: number; y: number; id: string };
const elements: any[] = [];
const place = (name: string, x: number, y: number, id: string): Placed => {
  const p = { name, x, y, id };
  for (const e of item(name).elements) elements.push({ ...structuredClone(e), id: `${id}-${e.id}`, x: e.x + x, y: e.y + y, groupIds: e.groupIds.map((g) => `${id}-${g}`) });
  return p;
};
const pin = ({ name, x, y }: Placed, which: "left" | "right" | "top" | "bottom") => {
  const pins = pinsOf(name);
  const pick = { left: (a: number[], b: number[]) => a[0] - b[0], right: (a: number[], b: number[]) => b[0] - a[0], top: (a: number[], b: number[]) => a[1] - b[1], bottom: (a: number[], b: number[]) => b[1] - a[1] }[which];
  const [px, py] = [...pins].sort(pick)[0];
  return [x + px, y + py];
};
let wires = 0;
const wire = (...points: number[][]) => {
  const [x, y] = points[0];
  elements.push({
    type: "arrow", id: `wire-${wires++}`, x, y, width: 1, height: 1, angle: 0, strokeColor: INK, backgroundColor: "transparent",
    fillStyle: "solid", strokeWidth: STROKE, strokeStyle: "solid", roughness: 0, opacity: 100, groupIds: [], frameId: null,
    index: null, roundness: null, seed: 1 + wires, version: 1, versionNonce: 1 + wires, isDeleted: false, boundElements: null,
    updated: 1, link: null, locked: false, points: points.map(([px, py]) => [px - x, py - y]), lastCommittedPoint: null,
    startBinding: null, endBinding: null, startArrowhead: null, endArrowhead: null, elbowed: false,
  });
};
const caption = (s: string, x: number, y: number, id: string) => elements.push({ ...text(x, y, s), id, strokeColor: "#868e96", index: null });

// The chain sits on y = 0. Pins are on the 20px grid, so every Wire runs on it.
const ant = place("Antenna", 0, -80, "ant");
const rf = place("Band-pass filter", 100, -20, "rf");
const lna = place("Amplifier", 240, -20, "lna");
const mix = place("Mixer", 380, -40, "mix");
const lo = place("Local oscillator", 400, 120, "lo");
const ifb = place("Band-pass filter", 520, -20, "if");
const vga = place("Variable-gain amplifier", 640, -20, "vga");
const adc = place("ADC", 780, -20, "adc");

const [ax, ay] = pin(ant, "bottom");
wire([ax, ay], [ax, 0], pin(rf, "left"));
wire(pin(rf, "right"), pin(lna, "left"));
wire(pin(lna, "right"), pin(mix, "left"));
wire(pin(lo, "top"), pin(mix, "bottom"));
wire(pin(mix, "right"), pin(ifb, "left"));
wire(pin(ifb, "right"), pin(vga, "left"));
wire(pin(vga, "right"), pin(adc, "left"));
const [adcX] = pin(adc, "right");
wire(pin(adc, "right"), [adcX + 40, 0]);

caption("RF 1.1 GHz", 110, -50, "cap-rf");
caption("IF 100 MHz", 530, -50, "cap-if");
caption("Superheterodyne receiver, drawn from the Library", 0, -140, "title");

const L = await loadExcalidraw("fork");
const scene = L.restoreElements(elements, null);
const appState = { viewBackgroundColor: "#ffffff", exportBackground: true, gridModeEnabled: false };
mkdirSync(out, { recursive: true });
writeFileSync(`${out}/receiver.excalidraw`, `${JSON.stringify({ type: "excalidraw", version: 2, source: "https://github.com/rasmusravn/excalidraw-electronics", elements: scene, appState, files: {} }, null, 2)}\n`);

const svg: SVGElement = await (L as any).exportToSvg({ elements: scene, appState, files: null, exportPadding: 30, skipInliningFonts: true });
const fontFile = readFileSync("fonts/Cascadia.woff2").toString("base64");
const svgText = svg.outerHTML.replace(/font-family="[^"]*"/g, 'font-family="Cascadia Code, monospace"');
writeFileSync(`${out}/receiver.svg`, svgText);

// PNG through headless Chromium, with the font the Symbols use.
const html = `<!doctype html><style>@font-face{font-family:"Cascadia Code";src:url(data:font/woff2;base64,${fontFile})}body{margin:0;background:#fff}svg{display:block}</style>${svgText}`;
const page = `${out}/.receiver.html`;
writeFileSync(page, html);
const width = Number(svg.getAttribute("width"));
const height = Number(svg.getAttribute("height"));
try {
  execFileSync("chromium", ["--headless", "--disable-gpu", "--force-device-scale-factor=2", `--window-size=${width},${height}`, `--screenshot=${out}/receiver.png`, `file://${process.cwd()}/${page}`], { stdio: "ignore" });
} finally {
  execFileSync("rm", ["-f", page]);
}
console.log(`wrote ${out}/receiver.excalidraw, .svg, .png (${width}x${height})`);
