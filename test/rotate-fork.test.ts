import { test } from "node:test";
import assert from "node:assert/strict";
import { near, onGrid, pinEnd, setup } from "./script-harness.ts";

test("fork: the rotate script turns a Symbol a quarter turn and keeps it on the grid", async () => {
  const { L, scene, run } = await setup("Rotate 90 degrees");
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
  const { map, run } = await setup("Rotate 90 degrees");
  const wire = map.get("wire")!;
  const target = map.get(wire.endBinding.elementId)!;
  for (const turn of [1, 2, 3, 4]) {
    await run();
    const [px, py] = pinEnd(target);
    const [ex, ey] = [wire.x + wire.points.at(-1)[0], wire.y + wire.points.at(-1)[1]];
    assert.ok(near(ex, px, 0.5) && near(ey, py, 0.5), `turn ${turn}: Wire ends at (${ex}, ${ey}), Pin at (${px}, ${py})`);
  }
});
