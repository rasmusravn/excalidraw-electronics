import { line, pin, rect, text, LEFT, RIGHT } from "../primitives.ts";
import type { Shape } from "../primitives.ts";
import type { SymbolDefinition } from "../build.ts";
import { LINE_HEIGHT } from "./blocks.ts";

// RF connectors, one pair of Symbols per type, each a simplified side view of the real part with
// its mating face on the left. Gender is in the label ("SMA-F"), so the user edits the text to
// change it; a type not listed here is any of these with its label rewritten.
const connector = (name: string, shapes: Shape[], pins: SymbolDefinition["pins"]): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Later",
  kind: "Block",
  shapes,
  pins,
});

// --- Profile parts: each is a w×h section centred on the axis (y = 0), drawn from its left edge ---

type Part = { w: number; h: number; draw: (x: number, w: number, h: number) => Shape[] };
// Sizes below keep the real parts' proportions; everything is drawn 1.4 times them, so the
// threads and grooves stay readable beside 40×40 blocks.
const SCALE = 1.4;
const scaled =
  (part: (w: number, h: number) => Part) =>
  (w: number, h: number): Part =>
    part(w * SCALE, h * SCALE);
const plain = scaled((w: number, h: number): Part => ({ w, h, draw: (x) => [rect(x, -h / 2, w, h)] }));
// External thread: the outline with slanted crests across it.
const thread = scaled((w: number, h: number): Part => ({
  w,
  h,
  draw: (x) => {
    const crests: Shape[] = [];
    for (let t = x + 1.5; t + 2 <= x + w - 0.5; t += 3.5) crests.push(line([t, -h / 2], [t + 2, h / 2]));
    return [rect(x, -h / 2, w, h), ...crests];
  },
}));
// A hex nut seen across its flats: three faces.
const hex = scaled((w: number, h: number): Part => ({
  w,
  h,
  draw: (x) => [rect(x, -h / 2, w, h), line([x, -h / 6], [x + w, -h / 6]), line([x, h / 6], [x + w, h / 6])],
}));
// A knurled coupling sleeve: ribs along it.
const knurl = scaled((w: number, h: number): Part => ({
  w,
  h,
  draw: (x) => {
    const ribs: Shape[] = [];
    for (let t = x + 3; t <= x + w - 2; t += 3) ribs.push(line([t, -h / 2], [t, h / 2]));
    return [rect(x, -h / 2, w, h), ...ribs];
  },
}));
// The BNC jack's barrel with its two bayonet studs.
const bayonet = scaled((w: number, h: number): Part => ({
  w,
  h: h + 6,
  draw: (x) => [rect(x, -h / 2, w, h), rect(x + w / 2 - 2, -h / 2 - 3, 4, 3), rect(x + w / 2 - 2, h / 2, 4, 3)],
}));
// A smooth snap-on barrel with its locking groove.
const snap = scaled((w: number, h: number): Part => ({
  w,
  h,
  draw: (x) => [rect(x, -h / 2, w, h), line([x + w * 0.4, -h / 2], [x + w * 0.4, h / 2])],
}));
// A snap-on barrel with the raised detent ring at its mouth (SMP).
const detent = scaled((w: number, h: number): Part => ({
  w,
  h: h + 3,
  draw: (x) => [rect(x + 2.5, -h / 2, w - 2.5, h), rect(x, -h / 2 - 1.5, 2.5, h + 3)],
}));

// Lays the parts out left to right from x, returning the shapes and where the last one ends.
const profile = (parts: Part[], x = 0) => {
  const shapes: Shape[] = [];
  for (const p of parts) {
    shapes.push(...p.draw(x, p.w, p.h));
    x += p.w;
  }
  return { shapes, end: x, top: -Math.max(...parts.map((p) => p.h)) / 2 };
};
const toGrid = (x: number) => Math.ceil(x / 20) * 20;

// --- The types ---

// panel: the flange-mount jack, mating face first. inline: a mated plug and jack, the plug's cable
// on the left, the jack's on the right.
type Type = { type: string; label: string; gender: "F" | "M"; panel: Part[]; inline: Part[] };

// The SMA family: precision variants of the same threaded coupling, drawn alike.
const smaLike = (type: string, label: string): Type => ({
  type,
  label,
  gender: "F",
  panel: [thread(16, 12), plain(3, 28), plain(5, 6)],
  inline: [plain(8, 8), plain(5, 10), hex(12, 18), thread(4, 12), plain(5, 10), plain(8, 8)],
});

const types: Type[] = [
  smaLike("SMA", "SMA"),
  {
    type: "N",
    label: "N",
    gender: "F",
    panel: [thread(20, 24), plain(3, 34), plain(5, 10)],
    inline: [plain(8, 12), plain(6, 18), hex(16, 30), thread(4, 24), plain(6, 18), plain(8, 12)],
  },
  {
    type: "BNC",
    label: "BNC",
    gender: "F",
    panel: [bayonet(16, 16), plain(3, 32), plain(5, 8)],
    inline: [plain(8, 10), plain(5, 14), knurl(16, 22), bayonet(4, 16), plain(5, 14), plain(8, 10)],
  },
  smaLike("2.92 mm", "2.92"),
  smaLike("2.4 mm", "2.4"),
  smaLike("3.5 mm", "3.5"),
  {
    type: "TNC",
    label: "TNC",
    gender: "F",
    panel: [thread(16, 16), plain(3, 32), plain(5, 8)],
    inline: [plain(8, 10), plain(5, 14), hex(14, 22), thread(4, 16), plain(5, 14), plain(8, 10)],
  },
  {
    type: "SMB",
    label: "SMB",
    gender: "M",
    panel: [snap(10, 9), plain(10, 18)],
    inline: [plain(8, 6), plain(4, 8), plain(12, 12), snap(4, 9), plain(4, 8), plain(8, 6)],
  },
  {
    type: "SMP",
    label: "SMP",
    gender: "M",
    panel: [detent(9, 7), plain(10, 16)],
    inline: [plain(8, 6), plain(4, 7), plain(10, 11), detent(4, 7), plain(4, 7), plain(8, 6)],
  },
  {
    type: "MMCX",
    label: "MMCX",
    gender: "F",
    panel: [snap(8, 7), plain(10, 16)],
    inline: [plain(8, 5), plain(4, 7), plain(10, 10), snap(4, 7), plain(4, 7), plain(8, 5)],
  },
  // A low receptacle on its board pad; mated, the plug's flat cap sits over it.
  {
    type: "U.FL",
    label: "U.FL",
    gender: "M",
    panel: [plain(5, 9), plain(3, 16)],
    inline: [plain(8, 4), plain(9, 13), plain(3, 16), plain(8, 4)],
  },
];

// Panel connector: the jack, then a lead out to its Pin on the right. The port name and the type
// stack above the body.
const panel = ({ type, label, gender, panel: parts }: Type) => {
  const { shapes, end, top } = profile(parts);
  const at = toGrid(end + 20);
  return connector(
    `${type} connector`,
    [
      ...shapes,
      line([end, 0], [at, 0]),
      text(end / 2, top - 4 - 2 * LINE_HEIGHT, "RF IN", "center"),
      text(end / 2, top - 4 - LINE_HEIGHT, `${label}-${gender}`, "center"),
    ],
    [pin(at, 0, LEFT)],
  );
};

// Inline connector, a mated pair or an adapter: leads in from a Pin at (0,0) and out to one on the
// right, at least 20px each. The type goes above.
const inline = ({ type, label, inline: parts }: Type) => {
  const { shapes, end, top } = profile(parts, 20);
  const at = toGrid(end + 20);
  return connector(
    `${type} connector (inline)`,
    [line([0, 0], [20, 0]), ...shapes, line([end, 0], [at, 0]), text((20 + end) / 2, top - 4 - LINE_HEIGHT, `${label}-M/F`, "center")],
    [pin(0, 0, RIGHT), pin(at, 0, LEFT)],
  );
};

// Library order: each type's panel connector, then its inline one.
export const connectors: SymbolDefinition[] = types.flatMap((t) => [panel(t), inline(t)]);
