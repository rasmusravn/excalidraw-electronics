import { arrowhead, ellipse, line, pin, polygon, schematicLabels, text, DOWN, FONT, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const LINE_HEIGHT = FONT.size * FONT.lineHeight;

// Transistors share one frame: a circle of radius 20, the control Pin on the left at (0,40), the
// other two at (40,0) and (40,80), and the labels to the right of the circle.
const transistor = (name: string, shapes: Shape[], value: string): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [...shapes, ellipse(34, 40, 20), text(60, 40 - LINE_HEIGHT, "Q?"), text(60, 40, value)],
  pins: [pin(0, 40, RIGHT), pin(40, 0, DOWN), pin(40, 80, UP)],
});

const base = [line([0, 40], [24, 40]), line([24, 26], [24, 54])];
const upper = line([24, 34], [40, 20], [40, 0]);
const lower = line([24, 46], [40, 60], [40, 80]);

// B (0,40), C (40,0), E (40,80). The emitter arrow points out.
export const npn = transistor("NPN transistor", [...base, upper, lower, arrowhead([24, 46], [40, 60], 0.8)], "BFR92");

// B (0,40), E (40,0), C (40,80). The emitter arrow points in, towards the base.
export const pnp = transistor("PNP transistor", [...base, upper, lower, arrowhead([40, 20], [24, 34], 0.7)], "BFT92");

// Enhancement MOSFETs: the gate apart from a channel broken in three, the gate at (0,40). The body
// arrow points into the channel for N, out of it for P; the body joins the source.
const gate = [line([0, 40], [20, 40]), line([20, 24], [20, 56])];
const channel = [line([26, 24], [26, 32]), line([26, 36], [26, 44]), line([26, 48], [26, 56])];
const drainAndSource = [line([26, 28], [40, 28], [40, 0]), line([26, 52], [40, 52], [40, 80])];
const body = line([26, 40], [40, 40]);
// N-channel: D (40,0), S (40,80).
export const nMosfet = transistor(
  "N-MOSFET",
  [...gate, ...channel, ...drainAndSource, body, line([40, 40], [40, 52]), arrowhead([40, 40], [26, 40], 1, 6)],
  "BSS138",
);
// P-channel: S (40,0), D (40,80); the source is on top, so the body joins upwards.
export const pMosfet = transistor(
  "P-MOSFET",
  [...gate, ...channel, ...drainAndSource, body, line([40, 40], [40, 28]), arrowhead([26, 40], [40, 40], 1, 6)],
  "BSS84",
);

// A single channel bar; the gate arrow points into it for N. G (0,40), D (40,0), S (40,80).
export const nJfet = transistor(
  "N-JFET",
  [line([0, 40], [26, 40]), arrowhead([0, 40], [26, 40], 1, 6), line([26, 24], [26, 56]), ...drainAndSource],
  "J310",
);

// Amplifiers are triangles, as every datasheet draws them. Inputs at (0,20) and (0,60), output at
// (100,40); − on top, + below.
const amplifierShapes = [
  line([0, 20], [20, 20]),
  line([0, 60], [20, 60]),
  polygon([[20, 0], [80, 40], [20, 80]]),
  line([80, 40], [100, 40]),
  line([25, 20], [31, 20]),
  line([25, 60], [31, 60]),
  line([28, 57], [28, 63]),
];
const amplifier = (name: string, shapes: Shape[], value: string): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [...amplifierShapes, ...shapes, ...schematicLabels(20, 0, "U?", value)],
  pins: [pin(0, 20, RIGHT), pin(0, 60, RIGHT), pin(100, 40, LEFT)],
});

export const opAmp = amplifier("Op-amp", [], "LM358");
// A step inside the triangle marks the comparator.
export const comparator = amplifier("Comparator", [line([36, 46], [42, 46], [42, 34], [48, 34])], "LM393");
