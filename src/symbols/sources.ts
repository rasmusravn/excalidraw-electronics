import { ellipse, FONT, line, pin, text, DOWN, UP } from "../primitives.ts";
import type { Point, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const LINE_HEIGHT = FONT.size * FONT.lineHeight;

// Sources stand upright, positive on top: Pins at (0,0) and (0,80), labels to the right.
const source = (name: string, shapes: Shape[], designator: string, value: string, labelX = 26): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [...shapes, text(labelX, 40 - LINE_HEIGHT, designator), text(labelX, 40, value)],
  pins: [pin(0, 0, DOWN), pin(0, 80, UP)],
});

const circled = [line([0, 0], [0, 20]), ellipse(0, 40, 20), line([0, 60], [0, 80])];
const plus = (x: number, y: number) => [line([x - 3, y], [x + 3, y]), line([x, y - 3], [x, y + 3])];

// IEC 60617: a circle with the conductor running through it.
export const dcSource = source("DC voltage source", [...circled, line([0, 20], [0, 60]), ...plus(10, 10)], "V?", "5V");

// The long plate is positive.
export const battery = source(
  "Battery",
  [line([0, 0], [0, 36]), line([-14, 36], [14, 36]), line([-7, 44], [7, 44]), line([0, 44], [0, 80]), ...plus(10, 28)],
  "BT?",
  "9V",
  20,
);

// A sine inside the circle.
const sine = line(...Array.from({ length: 17 }, (_, i): Point => [-12 + (24 * i) / 16, 40 - 6 * Math.sin((2 * Math.PI * i) / 16)]));
export const acSource = source("AC source", [...circled, sine], "V?", "1kHz");

// IEC 60617: a circle with a bar across the conductor.
export const currentSource = source("Current source", [...circled, line([-20, 40], [20, 40])], "I?", "1mA");
