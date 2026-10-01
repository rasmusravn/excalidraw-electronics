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

test("the catalog carries the how-to-wire note, sized to its text", () => {
  const note = build(definitions).catalog.elements.find((e) => e.type === "text" && String(e.text).startsWith("How to wire"));
  assert.ok(note, "note");
  for (const rule of ["elbow", "no arrowheads", "along its lead", "about 10px off", "between grid lines", "Line tool"]) {
    assert.ok(String(note.text).includes(rule), rule);
  }
  assert.ok(note.height >= String(note.text).split("\n").length * 14 * 1.2);
});

test("the Core passives and fuses are in the schematic Library in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const passives = [
    "Resistor", "Resistor (ANSI)", "Potentiometer", "Potentiometer (ANSI)", "Capacitor", "Polarized capacitor",
    "Variable capacitor", "Inductor", "Cored inductor", "Ferrite bead", "Transformer", "Crystal",
  ];
  assert.deepEqual(names.slice(0, passives.length), passives);
  assert.equal(names.indexOf("Fuse (ANSI)"), names.indexOf("Fuse") + 1);
  assert.ok(names.indexOf("Fuse") > names.indexOf("Signal ground"), "protection comes after the grounds");
});

test("every ANSI Variant comes directly after its IEC Symbol", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  for (const [i, name] of names.entries()) {
    if (name.endsWith(" (ANSI)")) assert.equal(names[i - 1], name.slice(0, -" (ANSI)".length), name);
  }
});

test("the Core diodes follow the passives in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const diodes = ["Diode", "Zener diode", "Schottky diode", "LED", "Varactor", "Photodiode"];
  const start = names.indexOf("Crystal") + 1;
  assert.deepEqual(names.slice(start, start + diodes.length), diodes);
});

test("the Junction is in the schematic Library: a filled dot over one tiny centred Pin target", () => {
  const item = build(definitions).schematic.libraryItems.find((i) => i.name === "Junction");
  assert.ok(item, "Junction");
  const target = item.elements.find((e) => e.type === "ellipse" && e.opacity === 0)!;
  const dot = item.elements.find((e) => e.type === "line" && e.backgroundColor !== "transparent")!;
  assert.ok(target.width <= 1 && target.height <= 1, "the target is tiny, so a Wire stops at the dot's edge");
  assert.deepEqual([target.x + target.width / 2, target.y + target.height / 2], [dot.x - 5, dot.y]);
});
