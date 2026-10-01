import { line, pin, rect, schematicLabels, LEFT, RIGHT } from "../primitives.ts";
import type { Point } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// IEC 60617: a 40×14 rectangle between 20px leads.
export const resistor: SymbolDefinition = {
  name: "Resistor",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [
    line([0, 0], [20, 0]),
    rect(20, -7, 40, 14),
    line([60, 0], [80, 0]),
    ...schematicLabels(20, -7, "R?", "10k"),
  ],
  pins: [pin(0, 0, RIGHT), pin(80, 0, LEFT)],
};

// ANSI: a six-peak zigzag in the same 40×14 span.
const zigzag: Point[] = [[20, 0], ...[1, 2, 3, 4, 5, 6].map((i): Point => [20 + (40 * (2 * i - 1)) / 12, i % 2 ? -7 : 7]), [60, 0]];
export const resistorAnsi: SymbolDefinition = {
  ...resistor,
  variant: "ANSI",
  shapes: [line([0, 0], [20, 0]), line(...zigzag), line([60, 0], [80, 0]), ...schematicLabels(20, -7, "R?", "10k")],
};

// Two 28px plates 10px apart; the span is 60.
export const capacitor: SymbolDefinition = {
  name: "Capacitor",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [
    line([0, 0], [25, 0]),
    line([25, -14], [25, 14]),
    line([35, -14], [35, 14]),
    line([35, 0], [60, 0]),
    ...schematicLabels(0, -14, "C?", "100n"),
  ],
  pins: [pin(0, 0, RIGHT), pin(60, 0, LEFT)],
};
