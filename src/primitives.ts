// Shared style values and the drawing helpers every Symbol is built from.
// Helpers return Shapes: geometry and style only. `build` gives them ids, groups and indices.
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import type { Font } from "fontkit";

export const GRID = 20;
export const INK = "#1e1e1e";
export const STROKE = 1.5;
// Cascadia. Never fontFamily 4: in Obsidian it means each user's own local font.
export const FONT = { family: 3, size: 14, lineHeight: 1.2 };

export type Point = [number, number];
export type Shape = {
  type: "line" | "rectangle" | "ellipse" | "text";
  x: number;
  y: number;
  width: number;
  height: number;
  [property: string]: unknown;
};
export type Pin = { x: number; y: number; dir: Point };

// Directions from a Pin end inward along its lead.
export const RIGHT: Point = [1, 0];
export const LEFT: Point = [-1, 0];
export const DOWN: Point = [0, 1];
export const UP: Point = [0, -1];

const style = {
  strokeColor: INK,
  backgroundColor: "transparent",
  fillStyle: "solid",
  strokeWidth: STROKE,
  strokeStyle: "solid",
  opacity: 100,
  roundness: null,
};

const linear = (points: Point[], extra: Record<string, unknown> = {}): Shape => {
  const [fx, fy] = points[0];
  const xs = points.map((p) => p[0]);
  const ys = points.map((p) => p[1]);
  // Line elements are anchored at their first point.
  return {
    ...style,
    type: "line",
    x: fx,
    y: fy,
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
    points: points.map(([x, y]) => [x - fx, y - fy]),
    lastCommittedPoint: null,
    startBinding: null,
    endBinding: null,
    startArrowhead: null,
    endArrowhead: null,
    polygon: false,
    ...extra,
  };
};

export const line = (...points: Point[]): Shape => linear(points);

export const polygon = (points: Point[], extra: Record<string, unknown> = {}): Shape =>
  linear([...points, points[0]], { polygon: true, ...extra });

export const rect = (x: number, y: number, width: number, height: number): Shape => ({
  ...style,
  type: "rectangle",
  x,
  y,
  width,
  height,
});

export const ellipse = (cx: number, cy: number, r: number, extra: Record<string, unknown> = {}): Shape => ({
  ...style,
  type: "ellipse",
  x: cx - r,
  y: cy - r,
  width: 2 * r,
  height: 2 * r,
  ...extra,
});

let font: Font | undefined;
const measure = (str: string) => {
  font ??= createRequire(import.meta.url)("fontkit").openSync(
    fileURLToPath(new URL("../fonts/Cascadia.woff2", import.meta.url)),
  ) as Font;
  return {
    width: Math.ceil((font.layout(str).advanceWidth / font.unitsPerEm) * FONT.size),
    height: FONT.size * FONT.lineHeight,
  };
};

export const text = (x: number, y: number, str: string, align: "left" | "center" = "left"): Shape => {
  const { width, height } = measure(str);
  return {
    ...style,
    type: "text",
    x: align === "center" ? x - width / 2 : x,
    y,
    width,
    height,
    text: str,
    originalText: str,
    fontSize: FONT.size,
    fontFamily: FONT.family,
    lineHeight: FONT.lineHeight,
    textAlign: align,
    verticalAlign: "top",
    containerId: null,
    autoResize: true,
  };
};

const LINE_HEIGHT = FONT.size * FONT.lineHeight;

// Designator and value stacked above the body, left-aligned with it.
export const schematicLabels = (x: number, bodyTop: number, designator: string, value: string): Shape[] => [
  text(x, bodyTop - 2 * LINE_HEIGHT - 2, designator),
  text(x, bodyTop - LINE_HEIGHT - 2, value),
];

// Records a Pin end. `dir` points from the Pin end inward along its lead.
export const pin = (x: number, y: number, dir: Point): Pin => ({ x, y, dir });

export const pinShapes = ({ x, y, dir }: Pin): Shape[] => {
  // Pin target: invisible and bindable. Elbow arrows snap to the target's nearest side midpoint,
  // then sit BASE_BINDING_GAP (5) + strokeWidth/2 outside it, so inset the target by that much
  // plus its radius and the Wire end lands on the Pin end.
  const r = 5;
  const sw = 0.5;
  const inset = r + 5 + sw / 2;
  const target = ellipse(x + dir[0] * inset, y + dir[1] * inset, r, {
    opacity: 0,
    strokeWidth: sw,
    customData: { pinEnd: [-dir[0] * inset, -dir[1] * inset] },
  });
  // Pin dot: a closed line polygon. Lines aren't bindable, so the dot can't steal a Wire.
  const dot: Point[] = [];
  for (let i = 0; i < 12; i++) {
    dot.push([x + 2.5 * Math.cos((i * Math.PI) / 6), y + 2.5 * Math.sin((i * Math.PI) / 6)]);
  }
  return [target, polygon(dot)];
};

// An invisible 1px line. Placement snaps an item's bounding-box top-left to the grid; with one
// at a grid point above-left of everything, that top-left is the anchor and Pins stay on the grid.
// A second one at the bottom-right fixes the box's centre, which rotation turns about.
// Always smooth: Excalidraw measures a line by its drawn path, so a sketchy anchor would move the box.
export const gridAnchor = (x: number, y: number): Shape => linear([[x, y], [x + 1, y]], { opacity: 0, roughness: 0 });

export const bounds = (shapes: Shape[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of shapes) {
    const pts = (s.points as Point[] | undefined)?.map(([px, py]) => [s.x + px, s.y + py]) ?? [
      [s.x, s.y],
      [s.x + s.width, s.y + s.height],
    ];
    for (const [px, py] of pts) {
      minX = Math.min(minX, px);
      minY = Math.min(minY, py);
      maxX = Math.max(maxX, px);
      maxY = Math.max(maxY, py);
    }
  }
  return { minX, minY, maxX, maxY };
};

export const floorToGrid = (n: number) => Math.floor(n / GRID) * GRID;
export const ceilToGrid = (n: number) => Math.ceil(n / GRID) * GRID;
