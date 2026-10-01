// Turns Symbol definitions into the two Libraries, the catalog, the drawing template and the
// scripts, and refuses to produce anything that would break in Excalidraw.
import { createHash } from "node:crypto";
import { FONT, GRID, INK, STROKE, bounds, ceilToGrid, floorToGrid, gridAnchor, pinShapes, text } from "./primitives.ts";
import type { Pin, Shape } from "./primitives.ts";
import { rotateSelectionQuarterTurn } from "./rotate.ts";
import { squareWires } from "./square-wires.ts";

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

const SOURCE = "https://github.com/rasmusravn/excalidraw-electronics";
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
      // A shape may sit in inner groups of its own; Excalidraw lists the innermost first.
      groupIds: [...((shape.groupIds as string[] | undefined) ?? []), ...groupIds],
    };
  });

// The rules a Symbol must follow to survive Excalidraw's import and placement.
const check = (name: string, elements: Element[]) => {
  const fail = (problem: string) => {
    throw new Error(`${name}: ${problem}`);
  };
  const members = new Map<string, number>();
  for (const e of elements) {
    if (typeof e.roughness !== "number") fail(`element without an explicit roughness (${e.type})`);
    // Obsidian reads fontFamily 4 as each user's own local font.
    if (e.fontFamily === 4) fail(`fontFamily 4 on text "${e.text}"`);
    // Excalidraw drops zero-size text when an item is placed.
    if (e.type === "text" && !(e.width > 0 && e.height > 0)) fail(`zero-size text "${e.text}"`);
    for (const g of e.groupIds) members.set(g, (members.get(g) ?? 0) + 1);
  }
  // The plugin's fork strips a group with one member.
  for (const [g, n] of members) if (n < 2) fail(`group ${g} has only ${n} member`);
};

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
  const elements = toElements(normalised, key, [hashId(`${key}:group`)]);
  check(name, elements);
  return { id: hashId(`${key}:item`), status: "published", created: CREATED, name, elements };
};

const library = (libraryItems: LibraryItem[]): Library => ({
  type: "excalidrawlib",
  version: 2,
  source: SOURCE,
  libraryItems,
});

// Also in the README.
const HOW_TO_WIRE = `How to wire
- Draw Wires with the arrow tool set to elbow, with no arrowheads.
  Drawings started from the template already are.
- Drag each Wire end to a Pin along its lead. It ends on the Pin dot,
  stays attached and stays at right angles when the Symbol moves.
- Join Wires at a Junction: attach each Wire to one of its legs, like a Pin.
- Turn Symbols with Ctrl/Cmd+R (Rotate 90 degrees), not the rotate handle.
- Elbow Wires always have rounded bends. Alt+W (Square Wires) makes them sharp right angles;
  run it again to turn them back into elbow Wires, which re-route after moves.

Limits
- Approaching a Pin from the side leaves the Wire end about 10px off.
- Elbow bends may land between grid lines.
- Straight (non-elbow) arrows attach at an offset.
- Lines drawn with the Line tool never attach.`;

// The how-to-wire note, then one row per Library, every item with its name underneath, all on the grid.
const buildCatalog = (rows: LibraryItem[][]): Drawing => {
  const shapes: { shape: Shape; key: string; groupIds: string[] }[] = [];
  const note = text(0, 0, HOW_TO_WIRE);
  shapes.push({ shape: note, key: "catalog:how-to-wire", groupIds: [] });
  let top = floorToGrid(note.height) + 4 * GRID;
  for (const items of rows.filter((row) => row.length > 0)) {
    const height = Math.max(...items.map((item) => bounds(item.elements).maxY));
    const captionY = top + floorToGrid(height) + 2 * GRID;
    let x = 0;
    for (const item of items) {
      const group = [hashId(`catalog:${item.id}:group`)];
      for (const e of item.elements) {
        const shape = { ...e, x: e.x + x, y: e.y + top, groupIds: e.groupIds.slice(0, -1) };
        shapes.push({ shape, key: `catalog:${e.id}`, groupIds: group });
      }
      const caption = { ...text(x, captionY, item.name), strokeColor: "#868e96" };
      shapes.push({ shape: caption, key: `catalog:${item.id}:name`, groupIds: [] });
      x += floorToGrid(Math.max(bounds(item.elements).maxX, caption.width)) + 4 * GRID;
    }
    top = captionY + 4 * GRID;
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

// Frontmatter key that marks a template as the Generator's. The plugin compresses the drawing
// when it saves the file, but keeps the frontmatter readable.
export const TEMPLATE_MARKER = "excalidraw-electronics-template";

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
    `${TEMPLATE_MARKER}: true`,
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

// Marks the scripts the Generator installs, so --install never replaces a script of the user's.
export const SCRIPT_MARKER = "// excalidraw-electronics script";

// A script ships its function's source text, so the tests run exactly what is installed.
const script = (fn: (ea: unknown) => Promise<void>) => [SCRIPT_MARKER, fn.toString(), `await ${fn.name}(ea);`, ""].join("\n");

export function build(definitions: SymbolDefinition[]) {
  const items = definitions.map((def) => ({ def, item: buildItem(def) }));
  const ids = new Set<string>();
  for (const { item } of items) {
    for (const e of item.elements) {
      if (ids.has(e.id)) throw new Error(`${item.name}: duplicate element id ${e.id}`);
      ids.add(e.id);
    }
  }
  const ofKind = (kind: SymbolDefinition["kind"]) => items.filter(({ def }) => def.kind === kind).map(({ item }) => item);
  const schematic = ofKind("Schematic");
  const rfBlocks = ofKind("Block");
  return {
    schematic: library(schematic),
    rfBlocks: library(rfBlocks),
    catalog: buildCatalog([schematic, rfBlocks]),
    template: buildTemplate(),
    // By command name: the plugin names a script's command after its file.
    scripts: { "Rotate 90 degrees": script(rotateSelectionQuarterTurn), "Square Wires": script(squareWires) },
  };
}
