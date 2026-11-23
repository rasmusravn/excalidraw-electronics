import { ellipse, line, pin, rect, text, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Pin, Point, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { box, leads, LINE_HEIGHT, sine, throughPins } from "./blocks.ts";

// Test equipment: the instruments a bench setup connects to the device under test.
const instrument = (name: string, shapes: Shape[], pins: Pin[]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Later",
  kind: "Block",
  shapes,
  pins,
});
const input = line([0, 0], [20, 0]);
const below = (label: string, x = 40, y = 24) => text(x, y, label, "center");

// --- Meters: the IEC indicating instrument, a circle marked with the unit it reads ---

// Input on the left at (0,0); the unit mark is inside the circle.
const meter = (name: string, unit: string) =>
  instrument(name, [input, ellipse(40, 0, 20), text(40, -LINE_HEIGHT / 2, unit, "center")], [pin(0, 0, RIGHT)]);
export const powerMeter = meter("Power meter", "W");
export const frequencyCounter = meter("Frequency counter", "Hz");

// --- Analyzers: a 40×40 box with a screen showing what they display ---

// The screen fills the top of the box; the label goes below.
const screen = rect(24, -16, 32, 22);
const analyzer = (name: string, trace: Shape, label: string) =>
  instrument(name, [input, box, screen, trace, below(label)], [pin(0, 0, RIGHT)]);

// A noise floor with a carrier and a smaller spur: amplitude against frequency.
export const spectrumAnalyzer = analyzer(
  "Spectrum analyzer",
  line([26, 2], [29, 0.5], [32, 2], [35, 0.5], [38, 2], [40, -13], [42, 2], [45, 0.5], [47, 2], [49, -4], [51, 2], [54, 0.5]),
  "SA",
);
// A sine: voltage against time.
export const oscilloscope = analyzer("Oscilloscope", sine(26, -5, 28, 7), "SCOPE");

// Ports numbered from 1 out of the bottom at (20,40), (60,40), ...: one per 40px, for the device
// under test between them. The screen shows a band-pass response; the label goes inside, under it.
const response: Point[] = [[6, -8], [22, -8], [28, -28], [52, -28], [58, -8], [74, -8]];
const vna = (name: string, ports: number): SymbolDefinition => {
  const width = 40 * ports;
  const shift = (width - 80) / 2;
  const xs = Array.from({ length: ports }, (_, i) => 20 + 40 * i);
  return instrument(
    name,
    [
      rect(0, -40, width, 60),
      rect(6, -34, width - 12, 30),
      line(...response.map(([x, y]): Point => [x + shift, y])),
      text(width / 2, -2, "VNA", "center"),
      ...xs.flatMap((x, i) => [line([x, 20], [x, 40]), text(x + 4, 22, String(i + 1))]),
    ],
    xs.map((x) => pin(x, 40, UP)),
  );
};
export const networkAnalyzer = vna("Network analyzer", 2);
export const networkAnalyzer4 = vna("Network analyzer (4-port)", 4);

// --- Sources ---

// A box with a ragged trace: a calibrated noise source for noise-figure measurement. Output on the
// right at (80,0); the label goes below.
const noise: Point[] = [[26, -6], [28, -12], [30, -3], [32, -9], [34, -1], [36, -11], [38, -5], [40, -13], [42, -2], [44, -8], [46, -4], [48, -12], [50, -6], [52, -10], [54, -4]];
export const noiseSource = instrument(
  "Noise source",
  [box, line(...noise), line([60, 0], [80, 0]), below("NOISE")],
  [pin(80, 0, LEFT)],
);

// --- Device under test ---

// A box marked DUT between 20px leads, Pins at (0,0) and (80,0): what the instruments measure.
const dutLabel = text(40, -LINE_HEIGHT / 2, "DUT", "center");
export const dut = instrument("DUT", [...leads, box, dutLabel], throughPins);
// One Pin on the left at (0,0): a one-port device measured in reflection, such as an antenna or a load.
export const dutOnePort = instrument("DUT (one-port)", [input, box, dutLabel], [pin(0, 0, RIGHT)]);
