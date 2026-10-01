import { line, text } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { block, box, leads, LINE_HEIGHT, sine, throughPins, variable } from "./blocks.ts";

// Later-tier 2-Pin boxes between 20px leads.
const later = (name: string, shapes: Shape[]): SymbolDefinition => ({
  ...block(name, [...leads, box, ...shapes], throughPins),
  tier: "Later",
});
const inside = (label: string, y = 4.8) => text(40, y, label, "center");
const below = (label: string) => text(40, 24, label, "center");

// --- Filter variants ---

// The band-pass marks, smaller and up-left, clear of the variable arrow through the box, so no
// stroke of the arrow reads as a strike. The label goes below.
export const tunableBandPassFilter = later("Tunable band-pass filter", [
  ...[-16, -11.5, -7].flatMap((y, i) => [sine(23, y, 14, 1.8), ...(i === 1 ? [] : [line([28, y + 4], [32, y - 4])])]),
  ...variable,
  text(40, 24, "BPF", "center"),
]);

// IEC 60617 has no notch mark, and three waves with the middle struck would be the band-stop
// filter, so this one shows its response: flat with one narrow dip. The label goes below.
export const notchFilter = later("Notch filter", [line([26, -4], [36, -4], [40, 8], [44, -4], [54, -4]), below("NOTCH")]);

// Two interdigital transducers filling the box: combs of fingers from a top and a bottom bar, side
// by side. The label goes below.
const transducer = (x: number) => [
  line([x, -12], [x + 15, -12]),
  ...[x + 1.5, x + 7.5, x + 13.5].map((fx) => line([fx, -12], [fx, 6])),
  line([x, 12], [x + 15, 12]),
  ...[x + 4.5, x + 10.5].map((fx) => line([fx, 12], [fx, -6])),
];
export const sawFilter = later("SAW/BAW filter", [...transducer(23), ...transducer(42), below("SAW")]);

// --- Digital processing: boxes named for their function ---

const digital = (name: string) => later(name, [inside(name, -LINE_HEIGHT / 2)]);
export const fpga = digital("FPGA");
export const dsp = digital("DSP");
export const nco = digital("NCO");
export const fft = digital("FFT");
