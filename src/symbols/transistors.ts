import { ellipse, INK, line, pin, polygon, text, DOWN, FONT, RIGHT, UP } from "../primitives.ts";
import type { Point } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const LINE_HEIGHT = FONT.size * FONT.lineHeight;

// A filled arrowhead with its tip `at` a fraction of the way from `from` to `to`.
const arrowhead = (from: Point, to: Point, at: number, size = 7) => {
  const [dx, dy] = [to[0] - from[0], to[1] - from[1]];
  const d = Math.hypot(dx, dy);
  const [ux, uy] = [dx / d, dy / d];
  const tip: Point = [from[0] + dx * at, from[1] + dy * at];
  return polygon(
    [
      tip,
      [tip[0] - size * ux + (size / 2) * uy, tip[1] - size * uy - (size / 2) * ux],
      [tip[0] - size * ux - (size / 2) * uy, tip[1] - size * uy + (size / 2) * ux],
    ],
    { backgroundColor: INK },
  );
};

// In a circle of radius 20; B (0,40), C (40,0), E (40,80). The emitter arrow points out.
export const npn: SymbolDefinition = {
  name: "NPN transistor",
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [
    line([0, 40], [24, 40]),
    line([24, 26], [24, 54]),
    line([24, 34], [40, 20], [40, 0]),
    line([24, 46], [40, 60], [40, 80]),
    arrowhead([24, 46], [40, 60], 0.8),
    ellipse(34, 40, 20),
    text(60, 40 - LINE_HEIGHT, "Q?"),
    text(60, 40, "BFR92"),
  ],
  pins: [pin(0, 40, RIGHT), pin(40, 0, DOWN), pin(40, 80, UP)],
};
