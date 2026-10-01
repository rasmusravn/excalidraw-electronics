import { arcs, arrowhead, ellipse, INK, line, pin, polygon, rect, text, DOWN, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Point } from "../primitives.ts";
import { block, box, leads, LINE_HEIGHT, throughPins } from "./blocks.ts";

// Labels for 40×40 boxes: inside, centred; below, centred.
const inside = (label: string) => text(40, -LINE_HEIGHT / 2, label, "center");
const below = (label: string, x = 40) => text(x, 24, label, "center");

// --- Routing ---

// Input on the left at (0,0), outputs on the right at (80,-20) and (80,20); the paths fork inside a
// 40×60 box. Run backwards, it's a combiner.
export const splitter = block(
  "2-way splitter",
  [
    line([0, 0], [20, 0]),
    rect(20, -30, 40, 60),
    line([20, 0], [40, 0]),
    line([40, 0], [60, -20]),
    line([40, 0], [60, 20]),
    line([60, -20], [80, -20]),
    line([60, 20], [80, 20]),
    text(40, 34, "SPLIT", "center"),
  ],
  [pin(0, 0, RIGHT), pin(80, -20, LEFT), pin(80, 20, LEFT)],
);

// The main line runs through; the coupled line beside it turns down to the coupled port at (40,40).
export const coupler = block(
  "Directional coupler",
  [
    ...leads,
    box,
    line([20, 0], [60, 0]),
    line([26, 8], [40, 8], [40, 20]),
    arrowhead([40, 8], [40, 20], 1, 5),
    line([40, 20], [40, 40]),
    text(54, -20 - LINE_HEIGHT, "-20dB"),
  ],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT), pin(40, 40, UP)],
);

// A circle with a curved arrow for the direction of circulation; ports left, right and below.
const turn: Point[] = Array.from({ length: 13 }, (_, i): Point => {
  const a = Math.PI * (1 + (1.4 * i) / 12);
  return [40 + 10 * Math.cos(a), 10 * Math.sin(a)];
});
const circulation = [line(...turn), arrowhead(turn[11], turn[12], 1, 5)];
export const circulator = block(
  "Circulator",
  [...leads, ellipse(40, 0, 20), ...circulation, line([40, 20], [40, 40]), text(54, -20 - LINE_HEIGHT, "CIRC")],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT), pin(40, 40, UP)],
);

// A box with a one-way arrow and a bar against the reverse direction.
export const isolator = block(
  "Isolator",
  [...leads, box, line([26, 0], [54, 0]), arrowhead([26, 0], [54, 0], 1, 6), line([30, -8], [30, 8]), below("ISO")],
  throughPins,
);

// --- RF switches: the common on the left at (0,0), the blade resting off the first throw. ---

const rfSwitch = (name: string, throws: number[]) =>
  block(
    name,
    [
      line([0, 0], [20, 0]),
      line([20, 0], [57, throws[0] + 6]),
      ...throws.map((y) => line([60, y], [80, y])),
      text(20, Math.min(...throws) - 4 - LINE_HEIGHT, "SW"),
    ],
    [pin(0, 0, RIGHT), ...throws.map((y) => pin(80, y, LEFT))],
  );
export const rfSwitchSpdt = rfSwitch("SPDT RF switch", [-20, 20]);
export const rfSwitchSp4t = rfSwitch("SP4T RF switch", [-40, -20, 20, 40]);

// --- Conversion: 2-Pin 40×40 boxes between 20px leads ---

const converter = (name: string, from: string, to: string) =>
  block(
    name,
    [...leads, box, line([20, 20], [60, -20]), text(29, -16, from, "center"), text(51, -2, to, "center")],
    throughPins,
  );
export const adc = converter("ADC", "A", "D");
export const dac = converter("DAC", "D", "A");

export const phaseShifter = block("Phase shifter", [...leads, box, inside("Δφ")], throughPins);
export const multiplier = block("Frequency multiplier", [...leads, box, inside("×N")], throughPins);
export const divider = block("Frequency divider", [...leads, box, inside("÷N")], throughPins);

// The transfer characteristic: a ramp between two flats.
export const limiter = block(
  "Limiter",
  [...leads, box, line([26, 10], [34, 10], [46, -10], [54, -10]), below("LIM")],
  throughPins,
);

// A small diode inside the box.
export const detector = block(
  "Detector",
  [
    ...leads,
    box,
    line([20, 0], [32, 0]),
    polygon([[32, -6], [32, 6], [44, 0]], { backgroundColor: INK }),
    line([44, -6], [44, 6]),
    line([44, 0], [60, 0]),
    below("DET"),
  ],
  throughPins,
);

// --- Line components ---

// A resistor body ending in a ground, one Pin on the left.
export const termination = block(
  "50Ω termination",
  [
    line([0, 0], [20, 0]),
    rect(20, -7, 40, 14),
    line([60, 0], [66, 0]),
    line([66, -10], [66, 10]),
    line([70, -6], [70, 6]),
    line([74, -2], [74, 2]),
    text(40, 11, "50Ω", "center"),
  ],
  [pin(0, 0, RIGHT)],
);

// A series capacitor in the line.
export const dcBlock = block(
  "DC block",
  [line([0, 0], [35, 0]), line([35, -10], [35, 10]), line([45, -10], [45, 10]), line([45, 0], [80, 0]), below("DC")],
  throughPins,
);

// RF in on the left, RF+DC out on the right, DC in from below at (60,40): a series capacitor on
// the RF side, a choke down to the DC port.
export const biasTee = block(
  "Bias tee",
  [
    line([0, 0], [26, 0]),
    line([26, -10], [26, 10]),
    line([34, -10], [34, 10]),
    line([34, 0], [80, 0]),
    line([60, 0], [60, 8]),
    arcs([60, 8], DOWN, RIGHT, 3, 4),
    line([60, 32], [60, 40]),
    text(20, -14 - LINE_HEIGHT, "BIAS-T"),
  ],
  [pin(0, 0, RIGHT), pin(80, 0, LEFT), pin(60, 40, UP)],
);
