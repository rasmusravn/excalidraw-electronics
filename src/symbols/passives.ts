import { arcs, arrowhead, line, pin, polygon, rect, schematicLabels, text, DOWN, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Point, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const schematic = (name: string, shapes: Shape[], pins = [pin(0, 0, RIGHT), pin(80, 0, LEFT)]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes,
  pins,
});
const ansi = (iec: SymbolDefinition, shapes: Shape[]): SymbolDefinition => ({ ...iec, variant: "ANSI", shapes });
const leads = [line([0, 0], [20, 0]), line([60, 0], [80, 0])];

// IEC 60617: a 40×14 rectangle between 20px leads.
const body = rect(20, -7, 40, 14);
// ANSI: a six-peak zigzag in the same 40×14 span.
const zigzag = line([20, 0], ...[1, 2, 3, 4, 5, 6].map((i): Point => [20 + (40 * (2 * i - 1)) / 12, i % 2 ? -7 : 7]), [60, 0]);

export const resistor = schematic("Resistor", [...leads, body, ...schematicLabels(20, -7, "R?", "10k")]);
export const resistorAnsi = ansi(resistor, [...leads, zigzag, ...schematicLabels(20, -7, "R?", "10k")]);

// The resistor with a wiper from below, its arrow on the body; the wiper is the third Pin.
const wiper = [line([40, 40], [40, 8]), arrowhead([40, 40], [40, 8])];
export const potentiometer = schematic(
  "Potentiometer",
  [...leads, body, ...wiper, ...schematicLabels(20, -7, "RV?", "10k")],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT), pin(40, 40, UP)],
);
// The zigzag crosses the wiper's line at y=0, so its arrow reaches further up.
const ansiWiper = [line([40, 40], [40, 1]), arrowhead([40, 40], [40, 1])];
export const potentiometerAnsi = ansi(potentiometer, [...leads, zigzag, ...ansiWiper, ...schematicLabels(20, -7, "RV?", "10k")]);

// Two 28px plates 10px apart; the span is 60.
const plates = [line([0, 0], [25, 0]), line([25, -14], [25, 14]), line([35, -14], [35, 14]), line([35, 0], [60, 0])];
const capacitorPins = [pin(0, 0, RIGHT), pin(60, 0, LEFT)];
export const capacitor = schematic("Capacitor", [...plates, ...schematicLabels(0, -14, "C?", "100n")], capacitorPins);

// A plus sign at the positive (left) plate.
export const polarizedCapacitor = schematic(
  "Polarized capacitor",
  [...plates, line([14, -10], [20, -10]), line([17, -13], [17, -7]), ...schematicLabels(0, -14, "C?", "10µ")],
  capacitorPins,
);

// An arrow across the plates.
export const variableCapacitor = schematic(
  "Variable capacitor",
  [...plates, line([16, 16], [44, -16]), arrowhead([16, 16], [44, -16]), ...schematicLabels(0, -16, "C?", "2-20p")],
  capacitorPins,
);

// IEC 60617: four humps between 20px leads.
const winding = arcs([20, 0], RIGHT, UP, 4);
export const inductor = schematic("Inductor", [...leads, winding, ...schematicLabels(20, -5, "L?", "10µH")]);

// A core line along the winding.
export const coredInductor = schematic(
  "Cored inductor",
  [...leads, winding, line([20, -9], [60, -9]), ...schematicLabels(20, -12, "L?", "100µH")],
);

// A slanted bead on a straight wire.
export const ferriteBead = schematic("Ferrite bead", [
  line([0, 0], [80, 0]),
  polygon([[28, 9], [44, -11], [52, -5], [36, 15]]),
  ...schematicLabels(20, -11, "FB?", "600Ω"),
]);

// Two windings facing each other across a core; primary on the left, secondary on the right.
export const transformer = schematic(
  "Transformer",
  [
    line([0, 0], [30, 0], [30, 10]),
    arcs([30, 10], DOWN, RIGHT, 4),
    line([30, 50], [30, 60], [0, 60]),
    line([80, 0], [50, 0], [50, 10]),
    arcs([50, 10], DOWN, LEFT, 4),
    line([50, 50], [50, 60], [80, 60]),
    line([38, 8], [38, 52]),
    line([42, 8], [42, 52]),
    ...schematicLabels(30, 0, "T?", "1:1"),
  ],
  [pin(0, 0, RIGHT), pin(0, 60, RIGHT), pin(80, 0, LEFT), pin(80, 60, LEFT)],
);

// IEC 60617: a quartz plate between two electrodes.
export const crystal = schematic("Crystal", [
  line([0, 0], [28, 0]),
  line([28, -12], [28, 12]),
  rect(32, -10, 16, 20),
  line([52, -12], [52, 12]),
  line([52, 0], [80, 0]),
  ...schematicLabels(28, -12, "Y?", "10MHz"),
]);

// IEC 60617: the resistor body with the wire running through it.
export const fuse = schematic("Fuse", [line([0, 0], [80, 0]), body, ...schematicLabels(20, -7, "F?", "1A")]);
// ANSI: one S-shaped period of a sine between the leads.
const sCurve = line(...Array.from({ length: 17 }, (_, i): Point => [20 + (40 * i) / 16, -7 * Math.sin((2 * Math.PI * i) / 16)]));
export const fuseAnsi = ansi(fuse, [...leads, sCurve, ...schematicLabels(20, -7, "F?", "1A")]);

// --- Later ---

// The resistor with a bent diagonal through it (non-linear) and θ (by temperature).
export const thermistor: SymbolDefinition = {
  ...schematic("Thermistor", [
    ...leads,
    body,
    line([14, 13], [22, 13], [62, -13]),
    text(46, 8, "θ"),
    ...schematicLabels(20, -13, "RT?", "NTC 10k"),
  ]),
  tier: "Later",
};
