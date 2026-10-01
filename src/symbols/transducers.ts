import { ellipse, line, pin, polygon, rect, schematicLabels, text, LEFT, RIGHT } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// Later-tier transducers, each with two Pins.
const transducer = (name: string, shapes: Shape[], pins = [pin(0, 0, RIGHT), pin(80, 0, LEFT)]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Later",
  kind: "Schematic",
  shapes,
  pins,
});
const leadsTo = (left: number, right: number) => [line([0, 0], [left, 0]), line([right, 0], [80, 0])];

// IEC 60617: a magnet box with a cone. Both Pins on the left, at (0,0) and (0,40).
export const speaker = transducer(
  "Speaker",
  [
    line([0, 0], [20, 0]),
    line([0, 40], [20, 40]),
    rect(20, 0, 10, 40),
    polygon([[30, 0], [46, -12], [46, 52], [30, 40]]),
    ...schematicLabels(20, -12, "LS?", "8Ω"),
  ],
  [pin(0, 0, RIGHT), pin(0, 40, RIGHT)],
);

// IEC 60617: a circle with a bar along one side. Both Pins on the left, at (0,0) and (0,40).
export const microphone = transducer(
  "Microphone",
  [
    line([0, 0], [20, 0], [20, 6]),
    line([0, 40], [20, 40], [20, 34]),
    line([20, 6], [20, 34]),
    ellipse(34, 20, 14),
    ...schematicLabels(20, 0, "MK?", "electret"),
  ],
  [pin(0, 0, RIGHT), pin(0, 40, RIGHT)],
);

// IEC 60617 signal lamp: a crossed circle.
const k = 14 / Math.SQRT2;
export const lamp = transducer("Lamp", [
  ...leadsTo(26, 54),
  ellipse(40, 0, 14),
  line([40 - k, -k], [40 + k, k]),
  line([40 - k, k], [40 + k, -k]),
  ...schematicLabels(26, -14, "LA?", "12V"),
]);

// IEC 60617: a circle marked M.
export const motor = transducer("Motor", [
  ...leadsTo(20, 60),
  ellipse(40, 0, 20),
  text(40, -8.4, "M", "center"),
  ...schematicLabels(20, -20, "M?", "12V"),
]);
