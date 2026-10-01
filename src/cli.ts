// Usage: node src/cli.ts [--install]
// Writes the Libraries, the catalog and the drawing template to out/. --install also copies them
// into the Obsidian vault named by VAULT in .env:
// - the Libraries into Excalidraw/Libraries/, where the Excalidraw plugin loads them
// - the template to Excalidraw/Template.excalidraw.md, the plugin's default template path, so
//   every new drawing starts with the grid on and the arrow tool drawing Wires
// - the catalog into Electronics/
// - the "Rotate 90 degrees" script into the plugin's script folder, with Ctrl/Cmd+R as its hotkey
//   unless that hotkey is taken or the command already has one
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SCRIPT_MARKER, TEMPLATE_MARKER, build } from "./build.ts";
import { definitions } from "./definitions.ts";

const out = "out";
const { schematic, rfBlocks, catalog, template, rotateScript } = build(definitions);
const install = process.argv.includes("--install");
const ROTATE = "Rotate 90 degrees";
// marker: a file the Generator manages, which it may replace only if it finds the marker in it.
const files: Record<string, { content: string; installTo: string; marker?: string }> = {
  "electronics-schematic.excalidrawlib": { content: json(schematic), installTo: "Excalidraw/Libraries/electronics-schematic.excalidrawlib" },
  "electronics-rf-blocks.excalidrawlib": { content: json(rfBlocks), installTo: "Excalidraw/Libraries/electronics-rf-blocks.excalidrawlib" },
  "catalog.excalidraw": { content: json(catalog), installTo: "Electronics/catalog.excalidraw" },
  "Template.excalidraw.md": { content: template, installTo: "Excalidraw/Template.excalidraw.md", marker: `${TEMPLATE_MARKER}:` },
  [`${ROTATE}.md`]: { content: rotateScript, installTo: `${scriptFolder()}/${ROTATE}.md`, marker: SCRIPT_MARKER },
};

function vaultPath() {
  try {
    process.loadEnvFile(".env");
  } catch {
    // No .env: fall through to the VAULT check.
  }
  return process.env.VAULT?.replace(/^~(?=\/|$)/, homedir());
}

function readJson(path: string) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

function scriptFolder() {
  const vault = vaultPath();
  const settings = vault && readJson(join(vault, ".obsidian/plugins/obsidian-excalidraw-plugin/data.json"));
  return settings?.scriptFolderPath || "Excalidraw/Scripts";
}

// The plugin registers each script as the command "obsidian-excalidraw-plugin:<script name>".
function bindRotateHotkey(vault: string) {
  const path = join(vault, ".obsidian/hotkeys.json");
  const hotkeys: Record<string, { modifiers: string[]; key: string }[]> = readJson(path) ?? {};
  const command = `obsidian-excalidraw-plugin:${ROTATE}`;
  const ctrlR = (h: { modifiers: string[]; key: string }) => h.key.toUpperCase() === "R" && h.modifiers.join() === "Mod";
  const takenBy = Object.entries(hotkeys).find(([id, keys]) => id !== command && keys.some(ctrlR))?.[0];
  if (command in hotkeys) return console.log(`kept your hotkey for ${ROTATE}`);
  if (takenBy) return console.log(`no hotkey for ${ROTATE}: Ctrl/Cmd+R is taken by ${takenBy}`);
  hotkeys[command] = [{ modifiers: ["Mod"], key: "R" }];
  writeFileSync(path, `${JSON.stringify(hotkeys, null, 2)}\n`);
  console.log(`bound Ctrl/Cmd+R to ${ROTATE} in ${path} (reload Obsidian to pick it up)`);
}

function json(value: unknown) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

mkdirSync(out, { recursive: true });
for (const [name, { content }] of Object.entries(files)) {
  writeFileSync(join(out, name), content);
}
console.log(`wrote ${Object.keys(files).map((name) => join(out, name)).join(", ")}`);

if (install) {
  const vault = vaultPath();
  if (!vault) throw new Error("--install needs VAULT in .env (see .env.example)");
  for (const [name, { installTo, marker }] of Object.entries(files)) {
    const target = join(vault, installTo);
    // Never replace a file of the user's that happens to sit where ours goes.
    if (marker && existsSync(target) && !readFileSync(target, "utf8").includes(marker)) {
      console.log(`skipped ${target}: an existing file not made by this Generator`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    copyFileSync(join(out, name), target);
    console.log(`installed ${target}`);
  }
  bindRotateHotkey(vault);
}
