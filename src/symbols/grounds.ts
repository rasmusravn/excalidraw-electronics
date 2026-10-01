import { line, pin, polygon, DOWN } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// An open triangle pointing down under a 20px lead; the Pin is on top.
export const signalGround: SymbolDefinition = {
  name: "Signal ground",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 0], [0, 20]), polygon([[-10, 20], [10, 20], [0, 32]])],
  pins: [pin(0, 0, DOWN)],
};
