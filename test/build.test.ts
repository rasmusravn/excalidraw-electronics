import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { line, pin, text, RIGHT, LEFT } from "../src/primitives.ts";
import type { SymbolDefinition } from "../src/build.ts";

test("the schematic Library and the catalog contain the Resistor", () => {
  const { schematic, catalog } = build(definitions);
  assert.ok(schematic.libraryItems.some((item) => item.name === "Resistor"));
  assert.ok(catalog.elements.some((e) => e.type === "text" && e.text === "Resistor"));
});

test("two builds produce identical ids, item ids and nonces", () => {
  const fingerprint = () => {
    const { schematic, rfBlocks, catalog } = build(definitions);
    return [...schematic.libraryItems, ...rfBlocks.libraryItems].flatMap((item) => [
      item.id,
      ...item.elements.flatMap((e) => [e.id, e.seed, e.versionNonce, e.index]),
    ]).concat(catalog.elements.flatMap((e) => [e.id, e.seed, e.versionNonce]));
  };
  assert.deepEqual(fingerprint(), fingerprint());
});

test("build throws when a Symbol puts a Pin off the 20px grid", () => {
  const offGrid: SymbolDefinition = {
    name: "Off-grid wire",
    variant: "IEC",
    tier: "Core",
    kind: "Schematic",
    shapes: [line([0, 0], [45, 0])],
    pins: [pin(0, 0, RIGHT), pin(45, 0, LEFT)],
  };
  assert.throws(() => build([offGrid]), /Off-grid wire: Pin \(45, 0\) is off the 20px grid/);
});

test("the template is an Obsidian Excalidraw drawing the plugin can start from", () => {
  const { template } = build(definitions);
  assert.match(template, /^---\n\nexcalidraw-plugin: parsed\n/);
  // Marks it as the Generator's, readable even after the plugin compresses the drawing.
  assert.match(template, /\nexcalidraw-electronics-template: true\n[\s\S]*\n---\n/);
  assert.match(template, /## Drawing\n```json\n[\s\S]*\n```\n%%\n$/);
});

// A valid two-Pin Symbol to break one rule at a time.
const wire = (name: string, extra: Partial<SymbolDefinition> = {}): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 0], [40, 0])],
  pins: [pin(0, 0, RIGHT), pin(40, 0, LEFT)],
  ...extra,
});

test("a valid fixture builds, and so do the real definitions", () => {
  assert.doesNotThrow(() => build([wire("Wire"), ...definitions]));
});

test("build throws on a duplicate element id", () => {
  assert.throws(() => build([wire("Wire"), wire("Wire")]), /Wire: duplicate element id/);
});

test("build throws on a group with fewer than 2 members", () => {
  const lone = wire("Lone group", { shapes: [{ ...line([0, 0], [40, 0]), groupIds: ["lone"] }] });
  assert.throws(() => build([lone]), /Lone group: group lone has only 1 member/);
});

test("build throws on fontFamily 4", () => {
  const local = wire("Local font", { shapes: [line([0, 0], [40, 0]), { ...text(0, -20, "R?"), fontFamily: 4 }] });
  assert.throws(() => build([local]), /Local font: fontFamily 4/);
});

test("build throws on zero-size text", () => {
  const empty = wire("Empty text", { shapes: [line([0, 0], [40, 0]), { ...text(0, -20, "R?"), width: 0 }] });
  assert.throws(() => build([empty]), /Empty text: zero-size text "R\?"/);
});

test("build throws when roughness is not set explicitly", () => {
  const rough = wire("No roughness", { shapes: [{ ...line([0, 0], [40, 0]), roughness: undefined }] });
  assert.throws(() => build([rough]), /No roughness: element without an explicit roughness/);
});

test("the Proof's Schematic symbols are in the schematic Library, each ANSI Variant right after its IEC Symbol", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  for (const name of ["Resistor", "Resistor (ANSI)", "Capacitor", "NPN transistor", "Signal ground"]) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(names.indexOf("Resistor (ANSI)"), names.indexOf("Resistor") + 1);
});

test("the Proof's Block symbols are in the RF-blocks Library and the catalog", () => {
  const { rfBlocks, schematic, catalog } = build(definitions);
  const names = rfBlocks.libraryItems.map((item) => item.name);
  assert.deepEqual(names, ["Amplifier", "Mixer", "Band-pass filter", "Antenna", "RF port"]);
  assert.ok(schematic.libraryItems.every((item) => !names.includes(item.name)));
  const captions = catalog.elements.filter((e) => e.type === "text").map((e) => e.text);
  for (const name of names) assert.ok(captions.includes(name), name);
});

test("the generic IC box and the Pin stub are in the schematic Library", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  assert.ok(names.includes("Generic IC"));
  assert.ok(names.includes("Pin stub"));
});

test("the sketchy build is hand-drawn and has its own ids, so it never replaces the clean items", () => {
  const clean = build(definitions);
  const sketchy = build(definitions, { sketchy: true });
  const items = (b: typeof clean) => [...b.schematic.libraryItems, ...b.rfBlocks.libraryItems];
  const ids = new Set(items(clean).flatMap((item) => [item.id, ...item.elements.map((e) => e.id)]));
  for (const item of items(sketchy)) {
    assert.ok(!ids.has(item.id), `${item.name} item id`);
    for (const e of item.elements) {
      assert.ok(!ids.has(e.id), `${item.name} element id`);
      // Only the invisible grid anchors stay smooth.
      if (e.opacity !== 0) assert.ok(e.roughness > 0, `${item.name} ${e.type} roughness`);
    }
  }
  assert.deepEqual(items(sketchy).map((item) => item.name), items(clean).map((item) => item.name));
});

test("the catalog carries the how-to-wire note, sized to its text", () => {
  const note = build(definitions).catalog.elements.find((e) => e.type === "text" && String(e.text).startsWith("How to wire"));
  assert.ok(note, "note");
  for (const rule of ["elbow", "no arrowheads", "along its lead", "about 10px off", "between grid lines", "Line tool"]) {
    assert.ok(String(note.text).includes(rule), rule);
  }
  assert.ok(note.height >= String(note.text).split("\n").length * 14 * 1.2);
});
