import { FONT, line, pin, text, LEFT, RIGHT } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";

const leads = [line([0, 0], [20, 0]), line([60, 0], [80, 0])];
const switchOf = (name: string, shapes: Shape[], bodyTop: number, pins = [pin(0, 0, RIGHT), pin(80, 0, LEFT)]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  // A switch has a designator but no value.
  shapes: [...shapes, text(20, bodyTop - FONT.size * FONT.lineHeight - 2, "S?")],
  pins,
});

// IEC 60617 make contact: the blade lifted off the right contact.
export const spst = switchOf("SPST switch", [...leads, line([20, 0], [57, -14])], -14);

// The common on the left at (0,20); throws at (80,0) and (80,40), the blade resting between them.
export const spdt = switchOf(
  "SPDT switch",
  [line([0, 20], [20, 20]), line([60, 0], [80, 0]), line([60, 40], [80, 40]), line([20, 20], [57, 6])],
  0,
  [pin(0, 20, RIGHT), pin(80, 0, LEFT), pin(80, 40, LEFT)],
);

// A push-to-make contact: a bridging bar lifted above the gap, with its plunger.
export const pushButton = switchOf(
  "Push button",
  [...leads, line([20, -6], [60, -6]), line([40, -6], [40, -18]), line([33, -18], [47, -18])],
  -18,
);
