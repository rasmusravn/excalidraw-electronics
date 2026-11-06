import { ellipse, line, pin, rect, text, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Pin, Point, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { box, LINE_HEIGHT, sine } from "./blocks.ts";

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

// Port 1 and Port 2 out of the bottom at (20,40) and (60,40), for the device under test between
// them. The screen shows a band-pass response; the label goes inside, under it.
const response: Point[] = [[6, -8], [22, -8], [28, -28], [52, -28], [58, -8], [74, -8]];
export const networkAnalyzer = instrument(
  "Network analyzer",
  [
    rect(0, -40, 80, 60),
    rect(6, -34, 68, 30),
    line(...response),
    text(40, -2, "VNA", "center"),
    line([20, 20], [20, 40]),
    line([60, 20], [60, 40]),
    text(24, 22, "1"),
    text(64, 22, "2"),
  ],
  [pin(20, 40, UP), pin(60, 40, UP)],
);

// --- Sources ---

// A box with a ragged trace: a calibrated noise source for noise-figure measurement. Output on the
// right at (80,0); the label goes below.
const noise: Point[] = [[26, -6], [28, -12], [30, -3], [32, -9], [34, -1], [36, -11], [38, -5], [40, -13], [42, -2], [44, -8], [46, -4], [48, -12], [50, -6], [52, -10], [54, -4]];
export const noiseSource = instrument(
  "Noise source",
  [box, line(...noise), line([60, 0], [80, 0]), below("NOISE")],
  [pin(80, 0, LEFT)],
);
