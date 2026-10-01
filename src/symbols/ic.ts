import { line, pin, rect, schematicLabels, RIGHT } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

// An 80×120 box with its corners on the grid. To resize it, double-click into the group and drag
// the box; Pin stubs supply its Pins, so one box serves any pin count.
export const icBox: SymbolDefinition = {
  name: "Generic IC",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [rect(0, 0, 80, 120), ...schematicLabels(0, 0, "U?", "IC")],
  pins: [],
};

// A 20px lead with its Pin at the left end. Its right end goes on the box edge.
export const pinStub: SymbolDefinition = {
  name: "Pin stub",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 0], [20, 0])],
  pins: [pin(0, 0, RIGHT)],
};
