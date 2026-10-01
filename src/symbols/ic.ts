import { INK, line, pin, polygon, rect, schematicLabels, DOWN, LEFT, RIGHT, UP } from "../primitives.ts";
import type { Pin, Point } from "../primitives.ts";
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

// Where Wires meet: a filled dot with a 20px leg and a Pin in each direction. Arrows can't attach
// to other arrows, so joining Wires each attach to a leg, the same way they attach to a Symbol.
const centreDot: Point[] = Array.from({ length: 12 }, (_, i): Point => [4 * Math.cos((i * Math.PI) / 6), 4 * Math.sin((i * Math.PI) / 6)]);
const legs = { left: pin(-20, 0, RIGHT), right: pin(20, 0, LEFT), up: pin(0, -20, DOWN), down: pin(0, 20, UP) };
const junctionOf = (name: string, pins: Pin[]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [...pins.map((p) => line([0, 0], [p.x, p.y])), polygon(centreDot, { backgroundColor: INK })],
  pins,
});

export const junctionDot = junctionOf("Junction", [legs.left, legs.right, legs.up, legs.down]);
// The usual schematic node: three legs, the open side up. Ctrl/Cmd+R turns it.
export const junctionT = junctionOf("Junction (T)", [legs.left, legs.right, legs.down]);
