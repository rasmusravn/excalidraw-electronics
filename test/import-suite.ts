import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { GRID, LEFT, RIGHT, line, pin } from "../src/primitives.ts";
import type { Library, SymbolDefinition } from "../src/build.ts";
import { libraryBlob, loadExcalidraw } from "./excalidraw.ts";
import type { Excalidraw } from "./excalidraw.ts";

export function importSuite(which: "fork" | "upstream") {
  const blob = (lib: Library) => libraryBlob(lib);

  const libraries = () => {
    const { schematic, rfBlocks } = build(definitions);
    const sketchy = build(definitions, { sketchy: true });
    return [schematic, rfBlocks, sketchy.schematic, sketchy.rfBlocks].filter((lib) => lib.libraryItems.length > 0);
  };

  // Pin targets record where their Pin end is, relative to their own centre.
  const pinEnds = (elements: Record<string, any>[]) =>
    elements
      .filter((e) => e.customData?.pinEnd)
      .map((e) => [e.x + e.width / 2 + e.customData.pinEnd[0], e.y + e.height / 2 + e.customData.pinEnd[1]]);

  test(`${which}: import keeps every element of every item`, async () => {
    const L = await loadExcalidraw(which);
    for (const lib of libraries()) {
      const items = await L.loadLibraryFromBlob(blob(lib), "unpublished");
      assert.equal(items.length, lib.libraryItems.length);
      for (const [i, item] of items.entries()) {
        const expected = lib.libraryItems[i];
        assert.equal(item.name, expected.name);
        assert.deepEqual(item.elements.map((e) => e.id), expected.elements.map((e) => e.id), expected.name);
        const placed = L.restoreElements(item.elements, null, { deleteInvisibleElements: true });
        assert.equal(placed.filter((e) => !e.isDeleted).length, expected.elements.length, `${expected.name} after placement`);
      }
    }
  });

  test(`${which}: after placement every Pin is on the grid relative to the item's top-left`, async () => {
    const L = await loadExcalidraw(which);
    for (const lib of libraries()) {
      for (const item of await L.loadLibraryFromBlob(blob(lib), "unpublished")) {
        const placed = L.restoreElements(item.elements, null, { deleteInvisibleElements: true });
        const [minX, minY] = L.getCommonBounds(placed);
        const pins = pinEnds(placed);
        const def = definitions.find((d) => item.name === (d.variant === "ANSI" ? `${d.name} (ANSI)` : d.name))!;
        assert.equal(pins.length, def.pins.length, `${item.name} Pins`);
        for (const [x, y] of pins) {
          assert.ok((x - minX) % GRID === 0 && (y - minY) % GRID === 0,
            `${item.name}: Pin (${x}, ${y}) is not on the grid from top-left (${minX}, ${minY})`);
        }
      }
    }
  });

  // What Excalidraw's rotateMultipleElements does: every element's centre turns about the centre of
  // the selection's bounding box, and the element takes on the angle.
  const rotate = (L: Excalidraw, elements: Record<string, any>[], angle: number) => {
    const [minX, minY, maxX, maxY] = L.getCommonBounds(elements);
    const [cx, cy] = [(minX + maxX) / 2, (minY + maxY) / 2];
    const [cos, sin] = [Math.round(Math.cos(angle)), Math.round(Math.sin(angle))];
    const turn = (x: number, y: number) => [cx + (x - cx) * cos - (y - cy) * sin, cy + (x - cx) * sin + (y - cy) * cos];
    return elements.map((e) => {
      const [x1, y1, x2, y2] = L.getCommonBounds([{ ...e, angle: 0 }]);
      const [ex, ey] = [(x1 + x2) / 2, (y1 + y2) / 2];
      const [rx, ry] = turn(ex, ey);
      const pinEnd = e.customData?.pinEnd && [e.customData.pinEnd[0] * cos - e.customData.pinEnd[1] * sin, e.customData.pinEnd[0] * sin + e.customData.pinEnd[1] * cos];
      return { ...e, x: e.x + rx - ex, y: e.y + ry - ey, angle: e.angle + angle, ...(pinEnd && { customData: { pinEnd } }) };
    });
  };

  test(`${which}: a quarter turn keeps every Pin and the item's top-left on the grid`, async () => {
    const L = await loadExcalidraw(which);
    // Its box is 5 grid cells wide and 2 high, so it needs padding to turn on the grid.
    const oddBox: SymbolDefinition = {
      name: "Odd box", variant: "IEC", tier: "Core", kind: "Schematic",
      shapes: [line([0, 0], [60, 0])], pins: [pin(0, 0, RIGHT), pin(60, 0, LEFT)],
    };
    for (const lib of [...libraries(), build([oddBox]).schematic]) {
      for (const item of await L.loadLibraryFromBlob(blob(lib), "unpublished")) {
        let elements = L.restoreElements(item.elements, null);
        for (const turn of [1, 2, 3]) {
          elements = L.restoreElements(rotate(L, elements, Math.PI / 2), null);
          const [minX, minY] = L.getCommonBounds(elements);
          // Excalidraw's own trigonometry leaves noise far below a pixel.
          const onGrid = (n: number) => Math.abs(n - Math.round(n / GRID) * GRID) < 1e-9;
          assert.ok(onGrid(minX) && onGrid(minY), `${item.name} after ${turn} turns: top-left (${minX}, ${minY})`);
          for (const [x, y] of pinEnds(elements)) {
            assert.ok(onGrid(x) && onGrid(y), `${item.name} after ${turn} turns: Pin (${x}, ${y})`);
          }
        }
      }
    }
  });

  test(`${which}: each item is one group and its Pin targets stay invisible bindable ellipses`, async () => {
    const L = await loadExcalidraw(which);
    for (const lib of libraries()) {
      for (const item of await L.loadLibraryFromBlob(blob(lib), "unpublished")) {
        const groups = new Set(item.elements.map((e) => JSON.stringify(e.groupIds)));
        assert.equal(groups.size, 1, `${item.name} groups`);
        assert.equal(item.elements[0].groupIds.length, 1, `${item.name} group depth`);
        const targets = item.elements.filter((e) => e.customData?.pinEnd);
        for (const t of targets) {
          assert.equal(t.type, "ellipse");
          assert.equal(t.opacity, 0);
        }
      }
    }
  });

  test(`${which}: an arrow bound to a Pin target survives restore`, async () => {
    const L = await loadExcalidraw(which);
    const [item] = await L.loadLibraryFromBlob(blob(libraries()[0]), "unpublished");
    const elements = L.restoreElements(item.elements, null);
    const target = elements.find((e) => e.customData?.pinEnd)!;
    target.boundElements = [{ type: "arrow", id: "wire" }];
    const wire = {
      id: "wire", type: "arrow", x: target.x - 40, y: target.y + target.height / 2, width: 40, height: 0,
      points: [[0, 0], [40, 0]], startArrowhead: null, endArrowhead: null, startBinding: null,
      endBinding: { elementId: target.id, fixedPoint: [0.5, 0.5], mode: "inside" },
    };
    const restored = L.restoreElements([...elements, wire], null, { repairBindings: true });
    assert.equal(restored.find((e) => e.id === "wire")!.endBinding?.elementId, target.id);
    assert.deepEqual(restored.find((e) => e.id === target.id)!.boundElements, [{ type: "arrow", id: "wire" }]);
  });

  test(`${which}: a drawing started from the template has the grid on and draws Wires`, async () => {
    const L = await loadExcalidraw(which);
    const drawing = JSON.parse(build(definitions).template.match(/```json\n([\s\S]*?)\n```/)![1]);
    const appState = L.restoreAppState(drawing.appState, null);
    assert.equal(appState.gridModeEnabled, true);
    assert.equal(appState.gridSize, GRID);
    assert.equal(appState.currentItemArrowType, "elbow");
    assert.equal(appState.currentItemStartArrowhead, null);
    assert.equal(appState.currentItemEndArrowhead, null);
    assert.equal(appState.currentItemRoughness, 0);
    assert.equal(appState.currentItemFontFamily, 3);
    assert.deepEqual(drawing.elements, []);
  });
}
