import { line, pin, rect, text, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Pin, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { LINE_HEIGHT } from "./blocks.ts";

// Later-tier multi-port blocks: tall boxes with Pins on the 20px grid.
const later = (name: string, shapes: Shape[], pins: Pin[]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Later",
  kind: "Block",
  shapes,
  pins,
});
const small = (x: number, y: number, mark: string) => text(x, y - LINE_HEIGHT / 2, mark, "center");

// I/Q modulator: I and Q in on the left at (0,-20) and (0,20), the LO from below at (40,60), RF
// out on the right at (80,0). The demodulator is its mirror. Labels go above-right, as on the mixer.
const iqBox = rect(20, -40, 40, 80);
// The LO mark sits beside its lead, away from the Q mark.
const lo = (markX: number) => [line([40, 40], [40, 60]), small(markX, 30, "LO")];
export const iqModulator = later(
  "I/Q modulator",
  [
    iqBox,
    line([0, -20], [20, -20]),
    line([0, 20], [20, 20]),
    line([60, 0], [80, 0]),
    small(28, -20, "I"),
    small(28, 20, "Q"),
    ...lo(46),
    text(54, -40 - LINE_HEIGHT, "IQ MOD"),
  ],
  [pin(0, -20, RIGHT), pin(0, 20, RIGHT), pin(40, 60, UP), pin(80, 0, LEFT)],
);
export const iqDemodulator = later(
  "I/Q demodulator",
  [
    iqBox,
    line([0, 0], [20, 0]),
    line([60, -20], [80, -20]),
    line([60, 20], [80, 20]),
    small(52, -20, "I"),
    small(52, 20, "Q"),
    ...lo(34),
    text(54, -40 - LINE_HEIGHT, "IQ DEMOD"),
  ],
  [pin(0, 0, RIGHT), pin(80, -20, LEFT), pin(80, 20, LEFT), pin(40, 60, UP)],
);

// Four-port hybrids: ports at (0,±20) and (80,±20), the phase marked inside.
const fourPorts = [-20, 20].flatMap((y) => [line([0, y], [20, y]), line([60, y], [80, y])]);
const hybrid = (name: string, mark: string) =>
  later(name, [rect(20, -30, 40, 60), ...fourPorts, small(40, 0, mark)], [
    pin(0, -20, RIGHT),
    pin(0, 20, RIGHT),
    pin(80, -20, LEFT),
    pin(80, 20, LEFT),
  ]);
export const hybrid90 = hybrid("90° hybrid", "90°");
export const hybrid180 = hybrid("180° hybrid", "180°");

// Common port on the left at (0,0); the low and high bands out on the right at (80,-20) and (80,20).
export const diplexer = later(
  "Diplexer/duplexer",
  [
    rect(20, -30, 40, 60),
    line([0, 0], [20, 0]),
    line([60, -20], [80, -20]),
    line([60, 20], [80, 20]),
    small(40, 0, "DPX"),
    small(52, -20, "L"),
    small(52, 20, "H"),
  ],
  [pin(0, 0, RIGHT), pin(80, -20, LEFT), pin(80, 20, LEFT)],
);
