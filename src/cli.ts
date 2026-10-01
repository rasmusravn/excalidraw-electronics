// Usage: node src/cli.ts [--install]
// Writes the Libraries, the catalog and the drawing template to out/. --install also copies them
// into the Obsidian vault named by VAULT in .env:
// - the Libraries into Excalidraw/Libraries/, where the Excalidraw plugin loads them
// - the template to Excalidraw/Template.excalidraw.md, the plugin's default template path, so
//   every new drawing starts with the grid on and the arrow tool drawing Wires
// - the catalog into Electronics/
// - the scripts into the plugin's script folder, each with its hotkey (Rotate 90 degrees on
//   Ctrl/Cmd+R, Square Wires on Alt+W) unless that hotkey is taken or the command already has one
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { SCRIPT_MARKER, TEMPLATE_MARKER, build } from "./build.ts";
import { definitions } from "./definitions.ts";

const out = "out";
const { schematic, rfBlocks, catalog, template, scripts } = build(definitions);
const install = process.argv.includes("--install");
type Hotkey = { modifiers: string[]; key: string };
const HOTKEYS: Record<keyof typeof scripts, Hotkey> = {
  "Rotate 90 degrees": { modifiers: ["Mod"], key: "R" },
  "Square Wires": { modifiers: ["Alt"], key: "W" },
};
const describe = ({ modifiers, key }: Hotkey) => [...modifiers.map((m) => (m === "Mod" ? "Ctrl/Cmd" : m)), key].join("+");
// marker: a file the Generator manages, which it may replace only if it finds the marker in it.
const files: Record<string, { content: string; installTo: string; marker?: string }> = {
  "electronics-schematic.excalidrawlib": { content: json(schematic), installTo: "Excalidraw/Libraries/electronics-schematic.excalidrawlib" },
  "electronics-rf-blocks.excalidrawlib": { content: json(rfBlocks), installTo: "Excalidraw/Libraries/electronics-rf-blocks.excalidrawlib" },
  "catalog.excalidraw": { content: json(catalog), installTo: "Electronics/catalog.excalidraw" },
  "Template.excalidraw.md": { content: template, installTo: "Excalidraw/Template.excalidraw.md", marker: `${TEMPLATE_MARKER}:` },
  ...Object.fromEntries(
    Object.entries(scripts).map(([name, content]) => [
      `${name}.md`,
      { content, installTo: `${scriptFolder()}/${name}.md`, marker: SCRIPT_MARKER },
    ]),
  ),
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
function bindHotkeys(vault: string) {
  const path = join(vault, ".obsidian/hotkeys.json");
  const hotkeys: Record<string, Hotkey[]> = readJson(path) ?? {};
  const same = (a: Hotkey, b: Hotkey) => a.key.toUpperCase() === b.key.toUpperCase() && a.modifiers.join() === b.modifiers.join();
  let changed = false;
  for (const [name, hotkey] of Object.entries(HOTKEYS)) {
    const command = `obsidian-excalidraw-plugin:${name}`;
    const takenBy = Object.entries(hotkeys).find(([id, keys]) => id !== command && keys.some((k) => same(k, hotkey)))?.[0];
    if (command in hotkeys) console.log(`kept your hotkey for ${name}`);
    else if (takenBy) console.log(`no hotkey for ${name}: ${describe(hotkey)} is taken by ${takenBy}`);
    else {
      hotkeys[command] = [hotkey];
      changed = true;
      console.log(`bound ${describe(hotkey)} to ${name} (reload Obsidian to pick it up)`);
    }
  }
  if (changed) writeFileSync(path, `${JSON.stringify(hotkeys, null, 2)}\n`);
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
  bindHotkeys(vault);
}
