// Turns Symbol definitions into the two Libraries, the catalog and the drawing template, and
// refuses to produce anything that would break in Excalidraw.
import { createHash } from "node:crypto";
import { FONT, GRID, INK, STROKE, bounds, ceilToGrid, floorToGrid, gridAnchor, pinShapes, text } from "./primitives.ts";
import type { Pin, Shape } from "./primitives.ts";

export type SymbolDefinition = {
  name: string;
  variant: "IEC" | "ANSI";
  tier: "Core" | "Later";
  kind: "Schematic" | "Block";
  shapes: Shape[];
  pins: Pin[];
};

export type Element = Shape & {
  id: string;
  index: string;
  seed: number;
  version: number;
  versionNonce: number;
  groupIds: string[];
  roughness: number;
  angle: number;
  frameId: null;
  boundElements: null;
  isDeleted: false;
  updated: number;
  link: null;
  locked: false;
};

export type LibraryItem = { id: string; status: "published"; created: number; name: string; elements: Element[] };
export type Library = { type: "excalidrawlib"; version: 2; source: string; libraryItems: LibraryItem[] };
export type Drawing = {
  type: "excalidraw";
  version: 2;
  source: string;
  elements: Element[];
  appState: Record<string, unknown>;
  files: Record<string, never>;
};

export const SOURCE = "https://github.com/rasmusravn/excalidraw-electronics";
const CREATED = Date.UTC(2026, 9, 1);

const digest = (key: string) => createHash("sha1").update(key).digest();
const hashId = (key: string) => digest(key).toString("hex").slice(0, 20);

// Valid, ascending fractional indices: "a0".."az", then "b00".."bzz".
const DIGITS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const fractionalIndex = (i: number) =>
  i < DIGITS.length
    ? `a${DIGITS[i]}`
    : `b${DIGITS[Math.floor((i - DIGITS.length) / DIGITS.length)]}${DIGITS[(i - DIGITS.length) % DIGITS.length]}`;

// Ids, seeds and nonces come from a key, so rebuilding replaces items in place.
const toElements = (shapes: Shape[], key: string, groupIds: string[]): Element[] =>
  shapes.map((shape, i) => {
    const h = digest(`${key}:${i}`);
    return {
      roughness: 0,
      angle: 0,
      frameId: null,
      boundElements: null,
      isDeleted: false,
      updated: 1,
      link: null,
      locked: false,
      ...shape,
      id: h.toString("hex").slice(0, 20),
      index: fractionalIndex(i),
      seed: h.readUInt32BE(10) >>> 1,
      version: 1,
      versionNonce: h.readUInt32BE(14) >>> 1,
      groupIds,
    };
  });

const itemName = (def: SymbolDefinition) => (def.variant === "ANSI" ? `${def.name} (ANSI)` : def.name);

const buildItem = (def: SymbolDefinition): LibraryItem => {
  const name = itemName(def);
  const shapes = [...def.shapes, ...def.pins.flatMap(pinShapes)];
  const { minX, minY, maxX, maxY } = bounds(shapes);
  const ax = floorToGrid(minX);
  const ay = floorToGrid(minY);
  // Excalidraw rotates about the bounding-box centre. With width and height the same parity in
  // grid cells, that centre is a grid point or the middle of a grid cell, so quarter turns keep
  // the Pins and the box's top-left on the grid.
  const bx = ceilToGrid(maxX);
  let by = ceilToGrid(maxY);
  if (((bx - ax) / GRID + (by - ay) / GRID) % 2 !== 0) by += GRID;

  for (const p of def.pins) {
    if ((p.x - ax) % GRID !== 0 || (p.y - ay) % GRID !== 0) {
      throw new Error(`${name}: Pin (${p.x}, ${p.y}) is off the ${GRID}px grid`);
    }
  }

  // Move everything so the grid anchor sits at the origin.
  const anchors = [gridAnchor(ax, ay), gridAnchor(bx - 1, by)];
  const normalised = [...anchors, ...shapes].map((s) => ({ ...s, x: s.x - ax, y: s.y - ay }));
  const key = `${def.name}:${def.variant}`;
  return {
    id: hashId(`${key}:item`),
    status: "published",
    created: CREATED,
    name,
    elements: toElements(normalised, key, [hashId(`${key}:group`)]),
  };
};

const library = (libraryItems: LibraryItem[]): Library => ({
  type: "excalidrawlib",
  version: 2,
  source: SOURCE,
  libraryItems,
});

// Every item laid out in a row with its name underneath, on the grid.
const buildCatalog = (items: LibraryItem[]): Drawing => {
  const shapes: { shape: Shape; key: string; groupIds: string[] }[] = [];
  const height = Math.max(0, ...items.map((item) => bounds(item.elements).maxY));
  const captionY = floorToGrid(height) + 2 * GRID;
  let x = 0;
  for (const item of items) {
    const group = [hashId(`catalog:${item.id}:group`)];
    for (const e of item.elements) {
      shapes.push({ shape: { ...e, x: e.x + x, y: e.y }, key: `catalog:${e.id}`, groupIds: group });
    }
    shapes.push({ shape: { ...text(x, captionY, item.name), strokeColor: "#868e96" }, key: `catalog:${item.id}:name`, groupIds: [] });
    x += floorToGrid(bounds(item.elements).maxX) + 4 * GRID;
  }
  return {
    type: "excalidraw",
    version: 2,
    source: SOURCE,
    elements: shapes.map(({ shape, key, groupIds }, i) => ({
      ...toElements([shape], key, groupIds)[0],
      index: fractionalIndex(i),
    })),
    appState: { gridSize: GRID, gridModeEnabled: true, viewBackgroundColor: "#ffffff" },
    files: {},
  };
};

// The drawing new Obsidian Excalidraw drawings start from: no elements, only settings. The grid
// is on, and the arrow tool draws Wires: elbow arrows without arrowheads.
const buildTemplate = () => {
  const drawing = {
    type: "excalidraw",
    version: 2,
    source: SOURCE,
    elements: [],
    appState: {
      gridSize: GRID,
      gridStep: 5,
      gridModeEnabled: true,
      viewBackgroundColor: "#ffffff",
      currentItemArrowType: "elbow",
      currentItemStartArrowhead: null,
      currentItemEndArrowhead: null,
      currentItemStrokeColor: INK,
      currentItemStrokeWidth: STROKE,
      currentItemRoughness: 0,
      currentItemFontFamily: FONT.family,
      currentItemFontSize: FONT.size,
    },
    files: {},
  };
  return [
    "---",
    "",
    "excalidraw-plugin: parsed",
    "tags: [excalidraw]",
    "",
    "---",
    "==⚠  Switch to EXCALIDRAW VIEW in the MORE OPTIONS menu of this document. ⚠==",
    "",
    "",
    "# Excalidraw Data",
    "",
    "## Text Elements",
    "%%",
    "## Drawing",
    "```json",
    JSON.stringify(drawing, null, 2),
    "```",
    "%%",
    "",
  ].join("\n");
};

export function build(definitions: SymbolDefinition[]) {
  const items = definitions.map((def) => ({ def, item: buildItem(def) }));
  const ofKind = (kind: SymbolDefinition["kind"]) => items.filter(({ def }) => def.kind === kind).map(({ item }) => item);
  const schematic = ofKind("Schematic");
  const rfBlocks = ofKind("Block");
  return {
    schematic: library(schematic),
    rfBlocks: library(rfBlocks),
    catalog: buildCatalog([...schematic, ...rfBlocks]),
    template: buildTemplate(),
  };
}
