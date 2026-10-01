import { line, pin, rect, schematicLabels, LEFT, RIGHT } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// IEC 60617: a 40×14 rectangle between 20px leads.
export const resistor: SymbolDefinition = {
  name: "Resistor",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [
    line([0, 0], [20, 0]),
    rect(20, -7, 40, 14),
    line([60, 0], [80, 0]),
    ...schematicLabels(20, -7, "R?", "10k"),
  ],
  pins: [pin(0, 0, RIGHT), pin(80, 0, LEFT)],
};
