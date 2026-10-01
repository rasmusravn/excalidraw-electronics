// Runs the generated "Rotate 90 degrees" script the way the Obsidian Excalidraw plugin does: as
// the body of an async function of `ea`, against the fork's own element code.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { GRID } from "../src/primitives.ts";
import { loadExcalidraw } from "./excalidraw.ts";

type El = Record<string, any>;

// Where a Pin target's Pin end is, turned with the target.
const pinEnd = (e: El) => {
  const [dx, dy] = e.customData.pinEnd;
  const [cos, sin] = [Math.cos(e.angle), Math.sin(e.angle)];
  return [e.x + e.width / 2 + dx * cos - dy * sin, e.y + e.height / 2 + dx * sin + dy * cos];
};
const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) < tolerance;
const onGrid = (n: number) => near(n, Math.round(n / GRID) * GRID, 1e-6);

async function setup() {
  const L = await loadExcalidraw("fork");
  const { schematic, rotateScript } = build(definitions);
  const symbol: El[] = L.restoreElements(structuredClone(schematic.libraryItems[0].elements), null);
  // A Wire from the left, bound the way Excalidraw binds an elbow arrow: to the side of the Pin
  // target facing the Pin end, the binding gap outside it.
  const target = symbol.filter((e) => e.customData?.pinEnd).sort((a, b) => a.x - b.x)[0];
  const [px, py] = pinEnd(target);
  const gap = 5 + target.strokeWidth / 2;
  const wire = {
    id: "wire", type: "arrow", elbowed: true, x: px - 80, y: py + 40, width: 80, height: 40,
    points: [[0, 0], [80, -40]], startArrowhead: null, endArrowhead: null, startBinding: null,
    endBinding: { elementId: target.id, fixedPoint: [-gap / target.width, 0.5], mode: "orbit" },
  };
  target.boundElements = [{ type: "arrow", id: "wire" }];
  const scene: El[] = L.restoreElements([...symbol, wire], null, { repairBindings: true });
  const map = new Map<string, El>(scene.map((e) => [e.id, e]));
  // Settle the Wire onto its binding, as Excalidraw does when it is drawn.
  const placed = map.get("wire")!;
  L.mutateElement(placed, map, { points: placed.points });

  const api = {
    getSceneElements: () => scene,
    mutateElement: (e: El, updates: El) => L.mutateElement(e, map, updates),
    updateScene: () => {},
  };
  const ea = {
    getExcalidrawAPI: () => api,
    getViewSelectedElements: () => scene.filter((e) => e.id !== "wire"),
    getBoundingBox: (els: El[]) => {
      const [minX, minY, maxX, maxY] = L.getCommonBounds(els);
      return { topX: minX, topY: minY, width: maxX - minX, height: maxY - minY };
    },
  };
  const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<void>;
  const run = () => new AsyncFunction("ea", "utils", rotateScript.replace(/^---\n[\s\S]*?\n---\n/, ""))(ea, {});
  return { L, scene, map, run };
}

test("fork: the rotate script turns a Symbol a quarter turn and keeps it on the grid", async () => {
  const { L, scene, run } = await setup();
  const symbol = scene.filter((e) => e.id !== "wire");
  const before = symbol.map((e) => [e.x, e.y]);
  for (const turn of [1, 2, 3, 4]) {
    await run();
    const angle = symbol.find((e) => e.type === "rectangle")!.angle;
    assert.ok(near(angle, ((turn * Math.PI) / 2) % (2 * Math.PI), 1e-9), `turn ${turn}: angle ${angle}`);
    const [minX, minY] = L.getCommonBounds(symbol);
    assert.ok(onGrid(minX) && onGrid(minY), `turn ${turn}: top-left (${minX}, ${minY})`);
    for (const t of symbol.filter((e) => e.customData?.pinEnd)) {
      const [x, y] = pinEnd(t);
      assert.ok(onGrid(x) && onGrid(y), `turn ${turn}: Pin (${x}, ${y})`);
    }
  }
  symbol.forEach((e, i) => assert.ok(near(e.x, before[i][0], 1e-6) && near(e.y, before[i][1], 1e-6), "four turns are a full turn"));
});

test("fork: a Wire bound to a Pin follows the turn and still ends on the Pin", async () => {
  const { map, run } = await setup();
  const wire = map.get("wire")!;
  const target = map.get(wire.endBinding.elementId)!;
  for (const turn of [1, 2, 3, 4]) {
    await run();
    const [px, py] = pinEnd(target);
    const [ex, ey] = [wire.x + wire.points.at(-1)[0], wire.y + wire.points.at(-1)[1]];
    assert.ok(near(ex, px, 0.5) && near(ey, py, 0.5), `turn ${turn}: Wire ends at (${ex}, ${ey}), Pin at (${px}, ${py})`);
  }
});
