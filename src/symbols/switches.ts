import { FONT, line, pin, rect, text, DOWN, LEFT, RIGHT, UP } from "../primitives.ts";
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

// IEC 60617 push-button make contact: the SPST blade, linked by a dashed line to a push actuator.
export const pushButton = switchOf(
  "Push button",
  [...leads, line([20, 0], [57, -14]), { ...line([46, -9.8], [46, -24]), strokeStyle: "dashed" }, line([40, -24], [52, -24])],
  -24,
);

// --- Later ---

// A coil on the left (Pins (0,0) and (0,80)) driving a make contact on the right (Pins (60,0) and
// (60,80)) through a dashed mechanical link. The labels go to the right.
export const relay: SymbolDefinition = {
  name: "Relay",
  variant: "IEC",
  tier: "Later",
  kind: "Schematic",
  shapes: [
    line([0, 0], [0, 20]),
    rect(-10, 20, 20, 40),
    line([0, 60], [0, 80]),
    line([60, 0], [60, 20]),
    line([60, 60], [74, 23]),
    line([60, 60], [60, 80]),
    { ...line([10, 40], [67, 40]), strokeStyle: "dashed" },
    text(84, 40 - FONT.size * FONT.lineHeight, "K?"),
    text(84, 40, "12V"),
  ],
  pins: [pin(0, 0, DOWN), pin(0, 80, UP), pin(60, 0, DOWN), pin(60, 80, UP)],
};
