// Runs a generated script the way the Obsidian Excalidraw plugin does: as the body of an async
// function of `ea`, against the fork's own element code, on a Resistor with a Wire bound to its
// left Pin.
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { GRID } from "../src/primitives.ts";
import { loadExcalidraw } from "./excalidraw.ts";

export type El = Record<string, any>;


// Where a Pin target's Pin end is, turned with the target.
export const pinEnd = (e: El) => {
  const [dx, dy] = e.customData.pinEnd;
  const [cos, sin] = [Math.cos(e.angle), Math.sin(e.angle)];
  return [e.x + e.width / 2 + dx * cos - dy * sin, e.y + e.height / 2 + dx * sin + dy * cos];
};
export const near = (a: number, b: number, tolerance: number) => Math.abs(a - b) < tolerance;
export const onGrid = (n: number) => near(n, Math.round(n / GRID) * GRID, 1e-6);

export async function setup(script: keyof ReturnType<typeof build>["scripts"]) {
  const L = await loadExcalidraw("fork");
  const { schematic, scripts } = build(definitions);
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
    // The Symbol, unless a test selects something else.
    getViewSelectedElements: () => selection ?? scene.filter((e) => e.id !== "wire"),
    getBoundingBox: (els: El[]) => {
      const [minX, minY, maxX, maxY] = L.getCommonBounds(els);
      return { topX: minX, topY: minY, width: maxX - minX, height: maxY - minY };
    },
  };
  const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<void>;
  let selection: El[] | undefined;
  const run = (selected?: El[]) => {
    selection = selected;
    return new AsyncFunction("ea", "utils", scripts[script])(ea, {});
  };
  return { L, scene, map, run };
}

