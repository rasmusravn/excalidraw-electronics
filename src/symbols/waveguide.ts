import { ellipse, INK, line, pin, polygon, rect, text, RIGHT, UP } from "../primitives.ts";
import type { Pin, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { throughPins } from "./blocks.ts";

const later = (name: string, shapes: Shape[], pins: Pin[]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Later",
  kind: "Block",
  shapes,
  pins,
});
const below = (label: string, x = 40, y = 24) => text(x, y, label, "center");

// --- Antennas ---

// Three antenna elements on a feed bar, the feed Pin at the foot (0,0).
const element = (x: number) => [line([x, -30], [x, -48]), polygon([[x - 7, -60], [x + 7, -60], [x, -48]])];
export const arrayAntenna = later(
  "Array antenna",
  [line([0, 0], [0, -30]), line([-20, -30], [20, -30]), ...[-20, 0, 20].flatMap(element), text(32, -58, "ARRAY")],
  [pin(0, 0, UP)],
);

// A waveguide stub flaring into a horn, fed from the left at (0,0).
export const hornAntenna = later(
  "Horn antenna",
  [line([0, 0], [20, 0]), rect(20, -6, 12, 12), polygon([[32, -6], [56, -20], [56, 20], [32, 6]]), below("HORN", 44)],
  [pin(0, 0, RIGHT)],
);

// --- Waveguide line components ---

// A length of waveguide: a broad, flat pipe with a flange at each end, between 20px leads.
export const waveguideSection = later(
  "Waveguide section",
  [
    line([0, 0], [20, 0]),
    rect(20, -8, 40, 16),
    line([20, -12], [20, 12]),
    line([60, -12], [60, 12]),
    line([60, 0], [80, 0]),
    below("WG", 40, 16),
  ],
  throughPins,
);

// Coax on the left (a circle with its centre conductor), tapering into waveguide on the right.
const centre = Array.from({ length: 12 }, (_, i): [number, number] => [26 + 2 * Math.cos((i * Math.PI) / 6), 2 * Math.sin((i * Math.PI) / 6)]);
export const waveguideTransition = later(
  "Waveguide-to-coax transition",
  [
    line([0, 0], [20, 0]),
    ellipse(26, 0, 6),
    polygon(centre, { backgroundColor: INK }),
    polygon([[32, -4], [46, -10], [46, 10], [32, 4]]),
    rect(46, -10, 14, 20),
    line([60, 0], [80, 0]),
    below("WG-COAX", 40, 14),
  ],
  throughPins,
);

// Waveguide ending in a tapered absorbing load, the Pin on the left.
export const waveguideTermination = later(
  "Waveguide termination",
  [line([0, 0], [20, 0]), rect(20, -10, 24, 20), polygon([[24, -10], [44, 0], [24, 10]], { backgroundColor: INK }), below("LOAD", 32, 14)],
  [pin(0, 0, RIGHT)],
);

