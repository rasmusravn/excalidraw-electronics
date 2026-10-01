import { line, pin, polygon, text, DOWN, FONT, UP } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// Grounds hang from a Pin on top under a 20px lead, and carry no labels.
const ground = (name: string, shapes: Shape[]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 0], [0, 20]), ...shapes],
  pins: [pin(0, 0, DOWN)],
});

// An open triangle pointing down.
export const signalGround = ground("Signal ground", [polygon([[-10, 20], [10, 20], [0, 32]])]);

// A bar with three strokes slanting down to the left.
export const chassisGround = ground("Chassis ground", [
  line([-12, 20], [12, 20]),
  ...[-12, 0, 12].map((x) => line([x, 20], [x - 5, 28])),
]);

// Three bars, each shorter.
export const earthGround = ground("Earth ground", [line([-12, 20], [12, 20]), line([-8, 25], [8, 25]), line([-4, 30], [4, 30])]);

// A bar on a 20px lead, the Pin at the bottom, with its rail name above as editable text.
export const supplyRail: SymbolDefinition = {
  name: "Supply rail",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 20], [0, 0]), line([-12, 0], [12, 0]), text(0, -4 - FONT.size * FONT.lineHeight, "VCC", "center")],
  pins: [pin(0, 20, UP)],
};
