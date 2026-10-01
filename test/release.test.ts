import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";

const VERSION = "7.8.9";
const kit = () => build(definitions, { version: VERSION });

test("the version is stamped in both Libraries' source", () => {
  const { schematic, rfBlocks } = kit();
  for (const lib of [schematic, rfBlocks]) assert.match(lib.source, /\/releases\/tag\/v7\.8\.9$/);
});

test("the version is stamped in the Commands' header, after the marker", () => {
  for (const content of Object.values(kit().scripts)) {
    assert.match(content, /^\/\/ excalidraw-electronics script\n\/\/ version 7\.8\.9\n/);
  }
});

test("the version is the Template's frontmatter value", () => {
  assert.match(kit().template, /\nexcalidraw-electronics-template: 7\.8\.9\n/);
});

test("the version is in the catalog's how-to-wire note", () => {
  const note = kit().catalog.elements.find((e) => e.type === "text" && String(e.text).startsWith("How to wire"));
  assert.ok(note && String(note.text).includes("Version 7.8.9"));
});

test("the release files are individual and space-free, with the Commands under release names", () => {
  const names = Object.keys(kit().files).sort();
  assert.deepEqual(names, [
    "Install-IEC-Electronics-Kit.md",
    "Rotate-90-degrees.md",
    "Square-Wires.md",
    "Template.excalidraw.md",
    "catalog.excalidraw",
    "electronics-rf-blocks.excalidrawlib",
    "electronics-schematic.excalidrawlib",
  ]);
  assert.ok(names.every((n) => !/\s/.test(n)));
  assert.equal(kit().files["Rotate-90-degrees.md"], kit().scripts["Rotate 90 degrees"]);
});

test("the CLI clears out/ and writes exactly the release files, stamped with package.json's version", () => {
  const cwd = mkdtempSync(join(tmpdir(), "kit-"));
  mkdirSync(join(cwd, "out"));
  for (const stale of ["electronics-schematic-sketchy.excalidrawlib", "obsidian-extras.zip"]) writeFileSync(join(cwd, "out", stale), "old");
  const cli = join(import.meta.dirname, "../src/cli.ts");
  const run = spawnSync(process.execPath, [cli], { cwd, encoding: "utf8" });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(readdirSync(join(cwd, "out")).sort(), Object.keys(kit().files).sort());
  const { version } = JSON.parse(readFileSync(join(import.meta.dirname, "../package.json"), "utf8"));
  assert.match(readFileSync(join(cwd, "out/electronics-schematic.excalidrawlib"), "utf8"), new RegExp(`/releases/tag/v${version.replaceAll(".", "\\.")}"`));
});
