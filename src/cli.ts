// Usage: node src/cli.ts [--install]
// Writes the Libraries, the catalog and the drawing template to out/. --install also copies them
// into the Obsidian vault named by VAULT in .env:
// - the Libraries into Excalidraw/Libraries/, where the Excalidraw plugin loads them
// - the template to Excalidraw/Template.excalidraw.md, the plugin's default template path, so
//   every new drawing starts with the grid on and the arrow tool drawing Wires
// - the catalog into Electronics/
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SOURCE, build } from "./build.ts";
import { definitions } from "./definitions.ts";

const out = "out";
const { schematic, rfBlocks, catalog, template } = build(definitions);
const files: Record<string, { content: string; installTo: string }> = {
  "electronics-schematic.excalidrawlib": { content: json(schematic), installTo: "Excalidraw/Libraries/electronics-schematic.excalidrawlib" },
  "electronics-rf-blocks.excalidrawlib": { content: json(rfBlocks), installTo: "Excalidraw/Libraries/electronics-rf-blocks.excalidrawlib" },
  "catalog.excalidraw": { content: json(catalog), installTo: "Electronics/catalog.excalidraw" },
  "Template.excalidraw.md": { content: template, installTo: "Excalidraw/Template.excalidraw.md" },
};

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

mkdirSync(out, { recursive: true });
for (const [name, { content }] of Object.entries(files)) {
  writeFileSync(join(out, name), content);
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
  for (const [name, { installTo }] of Object.entries(files)) {
    const target = join(vault, installTo);
    // Never replace a template the user made themselves.
    if (name.endsWith(".md") && existsSync(target) && !readFileSync(target, "utf8").includes(SOURCE)) {
      console.log(`skipped ${target}: an existing template not made by this Generator`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(out, name), target);
    console.log(`installed ${target}`);
  }
}
