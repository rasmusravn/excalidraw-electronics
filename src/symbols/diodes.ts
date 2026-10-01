import { arrowhead, INK, line, pin, polygon, rect, schematicLabels, LEFT, RIGHT } from "../primitives.ts";
import type { Point, Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// Anode on the left Pin, cathode on the right. A filled 20×20 triangle points at the cathode bar.
const triangle = polygon([[30, -10], [30, 10], [50, 0]], { backgroundColor: INK });
const anodeLead = line([0, 0], [30, 0]);
const bar = line([50, -10], [50, 10]);

// `cathode`: where the cathode lead starts, after the last bar.
const diode = (name: string, shapes: Shape[], bodyTop: number, designator: string, value: string, cathode = 50): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [anodeLead, triangle, line([cathode, 0], [80, 0]), ...shapes, ...schematicLabels(30, bodyTop, designator, value)],
  pins: [pin(0, 0, RIGHT), pin(80, 0, LEFT)],
});

// Two small arrows, from `from` towards `to`, side by side: light leaving or reaching the diode.
const lightArrows = (from: Point, to: Point) =>
  [0, 8].flatMap((dx) => {
    const a: Point = [from[0] + dx, from[1]];
    const b: Point = [to[0] + dx, to[1]];
    return [line(a, b), arrowhead(a, b, 1, 5)];
  });

export const plainDiode = diode("Diode", [bar], -10, "D?", "1N4148");

// The cathode bar with its ends bent: up-left at the top, down-right at the bottom.
export const zener = diode("Zener diode", [line([46, -13], [50, -10], [50, 10], [54, 13])], -13, "D?", "5V1");

// The cathode bar with hooked ends.
export const schottky = diode("Schottky diode", [line([55, -6], [55, -10], [50, -10], [50, 10], [45, 10], [45, 6])], -10, "D?", "BAT54");

// Light leaving: two arrows pointing up and away.
export const led = diode("LED", [bar, ...lightArrows([38, -12], [46, -20])], -24, "D?", "red");

// The cathode bar doubled into a capacitor's plates.
export const varactor = diode("Varactor", [bar, line([55, -10], [55, 10])], -10, "D?", "BB857", 55);

// Light arriving: two arrows pointing down onto the diode.
export const photodiode = diode("Photodiode", [bar, ...lightArrows([46, -22], [38, -14])], -26, "D?", "BPW34");

// --- Later ---

// A slab of intrinsic region between the triangle and the cathode.
export const pinDiode: SymbolDefinition = {
  ...diode("PIN diode", [bar, rect(50, -10, 5, 20), line([55, -10], [55, 10])], -10, "D?", "BAP64", 55),
  tier: "Later",
};

// The cathode bar with both ends bent back towards the anode.
export const tunnelDiode: SymbolDefinition = {
  ...diode("Tunnel diode", [line([46, -10], [50, -10], [50, 10], [46, 10])], -10, "D?", "1N3716"),
  tier: "Later",
};
