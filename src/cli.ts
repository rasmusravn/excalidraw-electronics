// Usage: node src/cli.ts [--install]
// Writes the Libraries and the catalog to out/. --install also copies them into the Obsidian
// vault named by VAULT in .env: the Libraries into Excalidraw/Libraries/, where the Excalidraw
// plugin loads them, and the catalog into Electronics/.
import { copyFileSync, mkdirSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { build } from "./build.ts";
import { definitions } from "./definitions.ts";

const out = "out";
const { schematic, rfBlocks, catalog } = build(definitions);
const files = {
  "electronics-schematic.excalidrawlib": schematic,
  "electronics-rf-blocks.excalidrawlib": rfBlocks,
  "catalog.excalidraw": catalog,
};

mkdirSync(out, { recursive: true });
for (const [name, json] of Object.entries(files)) {
  writeFileSync(join(out, name), `${JSON.stringify(json, null, 2)}\n`);
}
console.log(`wrote ${Object.keys(files).map((name) => join(out, name)).join(", ")}`);

if (process.argv.includes("--install")) {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env: fall through to the VAULT check below.
  }
  const vault = process.env.VAULT?.replace(/^~(?=\/|$)/, homedir());
  if (!vault) throw new Error("--install needs VAULT in .env (see .env.example)");
  const libraries = join(vault, "Excalidraw", "Libraries");
  const drawings = join(vault, "Electronics");
  mkdirSync(libraries, { recursive: true });
  mkdirSync(drawings, { recursive: true });
  for (const name of Object.keys(files)) {
    const dir = name.endsWith(".excalidrawlib") ? libraries : drawings;
    copyFileSync(join(out, name), join(dir, name));
    console.log(`installed ${join(dir, name)}`);
  }
}
