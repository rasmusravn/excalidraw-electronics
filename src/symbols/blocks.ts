import { arrowhead, ellipse, FONT, INK, line, pin, polygon, rect, text, LEFT, RIGHT, UP } from "../primitives.ts";
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

// 2-Pin blocks: a 40×40 box between 20px leads, Pins at (0,0) and (80,0).
const leads = [line([0, 0], [20, 0]), line([60, 0], [80, 0])];
const box = rect(20, -20, 40, 40);
const throughPins = [pin(0, 0, RIGHT), pin(80, 0, LEFT)];
// A diagonal arrow across a body: the IEC mark for "variable".
const variable = [line([22, 18], [58, -18]), arrowhead([22, 18], [58, -18], 1, 6)];

// A triangle; the label goes below it.
const triangle = polygon([[20, -20], [60, 0], [20, 20]]);
export const vga = block("Variable-gain amplifier", [...leads, triangle, ...variable, text(40, 24, "VGA", "center")], throughPins);

// IEC wave marks: three sines for high, middle and low frequencies, top to bottom. Struck
// through: the bands the filter stops. The label goes inside, under the marks.
const filter = (name: string, struck: number[], label: string) =>
  block(
    name,
    [
      line([0, 0], [20, 0]),
      box,
      line([60, 0], [80, 0]),
      ...[-12.8, -7.2, -1.6].flatMap((y, i) => [
        sine(30, y, 20, 2.4),
        ...(struck.includes(i) ? [line([37, y + 5.3], [43, y - 5.3])] : []),
      ]),
      text(40, 4.8, label, "center"),
    ],
    throughPins,
  );
export const lowPassFilter = filter("Low-pass filter", [0], "LPF");
export const highPassFilter = filter("High-pass filter", [2], "HPF");
export const bandPassFilter = filter("Band-pass filter", [0, 2], "BPF");
export const bandStopFilter = filter("Band-stop filter", [1], "BSF");

// A box with a sine: the IEC generator. Output on the right, Pin at (80,0); the label inside.
const generatorWave = sine(30, -8, 20, 4);
export const oscillator = block(
  "Oscillator",
  [box, generatorWave, line([60, 0], [80, 0]), text(40, 4.8, "OSC", "center")],
  [pin(80, 0, LEFT)],
);
// A label above a box whose inside is taken by an arrow.
const labelAbove = (label: string) => text(40, -24 - LINE_HEIGHT, label, "center");

// Tuned by a control voltage from below, Pin at (40,40). The arrow fills the box, so the label goes above.
export const vco = block(
  "VCO",
  [box, sine(30, 0, 20, 4), ...variable, line([60, 0], [80, 0]), line([40, 20], [40, 40]), labelAbove("VCO")],
  [pin(80, 0, LEFT), pin(40, 40, UP)],
);
// Reference in on the left, output on the right.
export const pll = block("PLL synthesizer", [...leads, box, text(40, -8.4, "PLL", "center")], throughPins);

// A box marked in dB.
export const attenuator = block("Attenuator", [...leads, box, text(40, -8.4, "dB", "center")], throughPins);
export const variableAttenuator = block("Variable attenuator", [...leads, box, ...variable, labelAbove("dB")], throughPins);

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
