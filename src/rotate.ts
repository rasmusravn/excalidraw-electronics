// The "Rotate 90 degrees" command. The Obsidian Excalidraw plugin runs it as a script, with the
// plugin's Excalidraw Automate object as `ea`, so the function must not use anything from outside
// itself: build() ships its source text.
declare const Notice: new (message: string) => unknown;

type El = Record<string, any>;

export async function rotateSelectionQuarterTurn(ea: any) {
  const api = ea.getExcalidrawAPI();
  const selected: El[] = ea.getViewSelectedElements();
  if (selected.length === 0) {
    new Notice("Select a Symbol to rotate");
    return;
  }
  const isWire = (e: El) => e.type === "arrow" && e.elbowed;
  const scene: El[] = api.getSceneElements();
  const byId = new Map(scene.map((e) => [e.id, e]));

  // Turn about the centre of the selection's bounding box, as Excalidraw's rotate handle does.
  const box = ea.getBoundingBox(selected);
  const cx = box.topX + box.width / 2;
  const cy = box.topY + box.height / 2;

  const wires = new Set<El>();
  for (const e of selected) {
    if (isWire(e)) {
      wires.add(e);
      continue;
    }
    // The element's own centre: Excalidraw turns each element about it.
    const xs = e.points ? e.points.map((p: number[]) => e.x + p[0]) : [e.x, e.x + e.width];
    const ys = e.points ? e.points.map((p: number[]) => e.y + p[1]) : [e.y, e.y + e.height];
    const ex = (Math.min(...xs) + Math.max(...xs)) / 2;
    const ey = (Math.min(...ys) + Math.max(...ys)) / 2;
    // A quarter turn clockwise (y points down).
    const rx = cx - (ey - cy);
    const ry = cy + (ex - cx);
    api.mutateElement(e, { x: e.x + rx - ex, y: e.y + ry - ey, angle: (e.angle + Math.PI / 2) % (2 * Math.PI) });
    for (const bound of e.boundElements ?? []) {
      const wire = byId.get(bound.id);
      if (wire && isWire(wire)) wires.add(wire);
    }
  }
  // Re-route every Wire attached to what moved, from its binding.
  for (const wire of wires) api.mutateElement(wire, { points: wire.points });
  api.updateScene({ elements: scene, captureUpdate: "IMMEDIATELY" });
}
