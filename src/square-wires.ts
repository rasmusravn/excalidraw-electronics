// The "Square Wires" command. Excalidraw always rounds the bends of elbow arrows, so this turns
// elbow Wires into sharp arrows through the same points, and squared Wires back into elbow Wires.
// Like the rotate command, the plugin runs it as a script with `ea`, so it must not use anything
// from outside itself.
type El = Record<string, any>;

export async function squareWires(ea: any) {
  const api = ea.getExcalidrawAPI();
  const scene: El[] = api.getSceneElements();
  const isWire = (e: El) => e.type === "arrow" && !e.startArrowhead && !e.endArrowhead;
  const selected: El[] = ea.getViewSelectedElements();
  // With nothing selected, every Wire in the drawing.
  const wires = (selected.length > 0 ? selected : scene).filter(isWire);
  const elbow = wires.filter((w) => w.elbowed);

  if (elbow.length > 0) {
    // Without arrowheads, Excalidraw keeps a bound end exactly on its binding's fixed point, so the
    // ends stay on their Pins. Only a moved Symbol's segment goes diagonal.
    for (const w of elbow) {
      api.mutateElement(w, {
        elbowed: false,
        roundness: null,
        fixedSegments: null,
        startIsSpecial: null,
        endIsSpecial: null,
        customData: { ...w.customData, squaredWire: true },
      });
    }
  } else {
    // Back to elbow Wires, re-routed from their bindings.
    for (const w of wires.filter((w) => w.customData?.squaredWire)) {
      const { squaredWire, ...customData } = w.customData;
      api.mutateElement(w, { elbowed: true, roundness: null, fixedSegments: [], customData });
      api.mutateElement(w, { points: w.points });
    }
  }
  api.updateScene({ elements: scene, captureUpdate: "IMMEDIATELY" });
}
