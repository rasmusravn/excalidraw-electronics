import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { line, pin, RIGHT, LEFT } from "../src/primitives.ts";
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
