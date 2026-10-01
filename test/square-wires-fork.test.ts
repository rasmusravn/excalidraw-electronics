import { test } from "node:test";
import assert from "node:assert/strict";
import { near, pinEnd, setup } from "./script-harness.ts";

test("fork: Square Wires turns an elbow Wire into a sharp one through the same points, still on its Pin", async () => {
  const { map, run } = await setup("Square Wires");
  const wire = map.get("wire")!;
  const points = structuredClone(wire.points);
  const binding = structuredClone(wire.endBinding);
  await run([wire]);
  assert.equal(wire.elbowed, false);
  assert.equal(wire.roundness, null);
  assert.deepEqual(wire.points, points);
  assert.deepEqual(wire.endBinding, binding);
});

test("fork: with nothing selected, Square Wires squares every Wire in the drawing", async () => {
  const { map, run } = await setup("Square Wires");
  await run([]);
  assert.equal(map.get("wire")!.elbowed, false);
});

test("fork: run on squared Wires, Square Wires turns them back into elbow Wires routed to their Pins", async () => {
  const { scene, map, run } = await setup("Square Wires");
  const wire = map.get("wire")!;
  const target = map.get(wire.endBinding.elementId)!;
  await run([wire]);
  // Move the Symbol while its Wire is squared.
  for (const e of scene) if (e.id !== "wire") Object.assign(e, { x: e.x + 40, y: e.y + 20 });
  await run([wire]);
  assert.equal(wire.elbowed, true);
  const [px, py] = pinEnd(target);
  const [ex, ey] = [wire.x + wire.points.at(-1)[0], wire.y + wire.points.at(-1)[1]];
  assert.ok(near(ex, px, 0.5) && near(ey, py, 0.5), `Wire ends at (${ex}, ${ey}), Pin at (${px}, ${py})`);
  for (let i = 1; i < wire.points.length; i++) {
    const [[x0, y0], [x1, y1]] = [wire.points[i - 1], wire.points[i]];
    assert.ok(near(x0, x1, 1e-6) || near(y0, y1, 1e-6), `segment ${i} is at a right angle`);
  }
});
