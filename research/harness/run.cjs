// Usage: node run.cjs fork|up
require("./setup.cjs");
const which = process.argv[2] || "fork";
let L;
if (which === "fork") {
  require("./node_modules/@zsviczian/excalidraw/dist/obsidian/excalidraw.production.min.js");
  L = globalThis.ExcalidrawLib;
} else {
  L = null; // loaded below
}

const lamp = () => ({
  type: "excalidrawlib", version: 2,
  source: "https://github.com/rasmusravn/excalidraw-electronics",
  libraryItems: [{
    id: "lamp-iec", status: "unpublished", created: 1790812800000, name: "Lamp (IEC)",
    elements: [
      { id: "lamp-iec-wire", type: "line", index: "a0", version: 1, versionNonce: 1000, x: 0, y: 20, width: 80, height: 0, points: [[0, 0], [80, 0]], strokeColor: "#1e1e1e", strokeWidth: 2, roughness: 0, groupIds: ["lamp-iec-g"] },
      { id: "lamp-iec-body", type: "ellipse", index: "a1", version: 1, versionNonce: 1001, x: 20, y: 0, width: 40, height: 40, strokeColor: "#1e1e1e", backgroundColor: "transparent", strokeWidth: 2, roughness: 0, groupIds: ["lamp-iec-g"] },
      { id: "lamp-iec-ref", type: "text", index: "a2", version: 1, versionNonce: 1002, x: 30, y: -24, width: 20, height: 18.4, text: "L?", originalText: "L?", fontSize: 16, fontFamily: 2, lineHeight: 1.15, textAlign: "left", verticalAlign: "top", containerId: null, autoResize: true, strokeColor: "#1e1e1e", roughness: 0, groupIds: ["lamp-iec-g"] },
      { id: "lamp-iec-p1", type: "ellipse", index: "a3", version: 1, versionNonce: 1003, x: -5, y: 15, width: 10, height: 10, opacity: 0, backgroundColor: "transparent", roughness: 0, groupIds: ["lamp-iec-g"], boundElements: null },
    ],
  }],
});

const log = (k, v) => console.log(k.padEnd(52), typeof v === "string" ? v : JSON.stringify(v));

(async () => { if (!L) L = await import("./lib-up.mjs");
  log("exports present", ["loadLibraryFromBlob", "restoreLibraryItems", "restoreElements", "mergeLibraryItems", "getCommonBounds", "FONT_FAMILY"].map((n) => `${n}:${typeof L[n]}`).join(" "));
  const blob = (o) => new window.Blob([JSON.stringify(o)], { type: "application/vnd.excalidrawlib+json" });

  // 1. import via the same path as library "Open" (loadLibraryFromBlob -> parseLibraryJSON -> restoreLibraryItems)
  const items = await L.loadLibraryFromBlob(blob(lamp()), "unpublished");
  log("1 import: items", items.length);
  log("1 import: elements", items[0].elements.length);
  const t = items[0].elements.find((e) => e.type === "text");
  log("1 text fields after import", { rawText: t.rawText, hasTextLink: t.hasTextLink, fontFamily: t.fontFamily, lineHeight: t.lineHeight });
  const pin = items[0].elements.find((e) => e.id === "lamp-iec-p1");
  log("1 pin target after import", { opacity: pin.opacity, groupIds: pin.groupIds, bg: pin.backgroundColor });

  // 2. placement restore
  const placed = L.restoreElements(items[0].elements, null, { deleteInvisibleElements: true });
  log("2 placement: elements kept (non-deleted)", placed.filter((e) => !e.isDeleted).length);
  log("2 common bounds (minX,minY)", L.getCommonBounds(placed).slice(0, 2));

  // 3. zero-size text
  const z = lamp(); const zt = z.libraryItems[0].elements[2]; zt.width = 0; zt.height = 0;
  const zi = await L.loadLibraryFromBlob(blob(z), "unpublished");
  log("3 zero-size text: after import", zi[0].elements.length);
  log("3 zero-size text: after placement", L.restoreElements(zi[0].elements, null, { deleteInvisibleElements: true }).filter((e) => !e.isDeleted).length);

  // 4. dedupe
  const a = await L.loadLibraryFromBlob(blob(lamp()), "unpublished");
  const b = await L.loadLibraryFromBlob(blob(lamp()), "unpublished");
  log("4 dedupe with index+nonce: merged count", L.mergeLibraryItems(a, b).length);
  log("4 nonces equal across imports", JSON.stringify(a[0].elements.map((e) => e.versionNonce)) === JSON.stringify(b[0].elements.map((e) => e.versionNonce)));
  const bare = () => { const o = lamp(); o.libraryItems[0].elements.forEach((e) => { delete e.index; delete e.versionNonce; delete e.version; }); return o; };
  const c = await L.loadLibraryFromBlob(blob(bare()), "unpublished");
  const d = await L.loadLibraryFromBlob(blob(bare()), "unpublished");
  log("4 dedupe without index/nonce: merged count", L.mergeLibraryItems(c, d).length);

  // 5. fonts
  log("5 FONT_FAMILY", L.FONT_FAMILY);
  const f4 = lamp(); f4.libraryItems[0].elements[2].fontFamily = 4;
  const fi = await L.loadLibraryFromBlob(blob(f4), "unpublished");
  log("5 fontFamily 4 (Local Font) kept", fi[0].elements[2].fontFamily);

  // 6. fork-only: pruneOrphanGroupIds on a single-element group
  const one = { type: "excalidrawlib", version: 2, libraryItems: [{ id: "x", status: "unpublished", created: 1, elements: [{ id: "x1", type: "rectangle", index: "a0", x: 0, y: 0, width: 20, height: 20, groupIds: ["solo-g"] }] }] };
  const oi = await L.loadLibraryFromBlob(blob(one), "unpublished");
  log("6 single-member groupIds after import", oi[0].elements[0].groupIds);

  // 7. inside-bound arrow to a zero-opacity pin target survives restore with binding repair
  const scene = [
    ...placed,
    { id: "w1", type: "arrow", index: "b0", x: -40, y: 20, width: 40, height: 0, points: [[0, 0], [40, 0]], startArrowhead: null, endArrowhead: null, startBinding: null,
      endBinding: { elementId: "lamp-iec-p1", fixedPoint: [0.5, 0.5], mode: "inside" } },
  ];
  scene.find((e) => e.id === "lamp-iec-p1").boundElements = [{ type: "arrow", id: "w1" }];
  const rs = L.restoreElements(scene, null, { repairBindings: true });
  const arrow = rs.find((e) => e.id === "w1");
  log("7 arrow endBinding after restore", arrow.endBinding);
  log("7 pin boundElements after restore", rs.find((e) => e.id === "lamp-iec-p1").boundElements);
})().catch((e) => { console.error("FAIL", e); process.exit(1); });
