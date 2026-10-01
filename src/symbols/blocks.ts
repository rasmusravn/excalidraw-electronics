import { ellipse, FONT, INK, line, pin, polygon, rect, text, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Point } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const LINE_HEIGHT = FONT.size * FONT.lineHeight;
const block = (name: string, shapes: SymbolDefinition["shapes"], pins: SymbolDefinition["pins"]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Block",
  shapes,
  pins,
});

// A sine wave `width` wide, centred vertically on `y`.
const sine = (x: number, y: number, width: number, amplitude: number) =>
  line(...Array.from({ length: 17 }, (_, i): Point => [x + (width * i) / 16, y - amplitude * Math.sin((2 * Math.PI * i) / 16)]));

// A 40×40 triangle between 20px leads; the label goes below it.
export const amplifier = block(
  "Amplifier",
  [line([0, 0], [20, 0]), polygon([[20, -20], [60, 0], [20, 20]]), line([60, 0], [80, 0]), text(40, 24, "LNA", "center")],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT)],
);

// A crossed circle of radius 20 with the LO input from below; the label goes above-right.
const k = 20 / Math.SQRT2;
export const mixer = block(
  "Mixer",
  [
    line([0, 0], [20, 0]),
    ellipse(40, 0, 20),
    line([40 - k, -k], [40 + k, k]),
    line([40 - k, k], [40 + k, -k]),
    line([60, 0], [80, 0]),
    line([40, 20], [40, 40]),
    text(54, -20 - LINE_HEIGHT, "MIX"),
  ],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT), pin(40, 40, UP)],
);

// IEC wave marks: three sines, the outer two struck through (both stop bands); the label inside.
const bandPassMarks = [-12.8, -7.2, -1.6].flatMap((y, i) => [
  sine(30, y, 20, 2.4),
  ...(i === 1 ? [] : [line([37, y + 5.3], [43, y - 5.3])]),
]);
export const bandPassFilter = block(
  "Band-pass filter",
  [line([0, 0], [20, 0]), rect(20, -20, 40, 40), line([60, 0], [80, 0]), ...bandPassMarks, text(40, 4.8, "BPF", "center")],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT)],
);

// A mast with an open triangle on top; the Pin is at the foot.
export const antenna = block(
  "Antenna",
  [line([0, 0], [0, -60]), polygon([[-14, -60], [14, -60], [0, -38]]), text(18, -58, "ANT")],
  [pin(0, 0, UP)],
);

// A coax connector: a circle with a filled centre, and a lead out to the right.
const centre: Point[] = Array.from({ length: 12 }, (_, i): Point => [3 * Math.cos((i * Math.PI) / 6), 3 * Math.sin((i * Math.PI) / 6)]);
export const rfPort = block(
  "RF port",
  [ellipse(0, 0, 10), polygon(centre, { backgroundColor: INK }), line([10, 0], [40, 0]), text(0, -14 - LINE_HEIGHT, "RF IN", "center")],
  [pin(40, 0, LEFT)],
);
