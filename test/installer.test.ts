// Runs the shipped installer the way the plugin does (the body of an async function of `ea` and
// `utils`) against a stubbed GitHub release and a stubbed vault.
import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";

const API = "https://api.github.com/repos/rasmusravn/excalidraw-electronics/releases/latest";
const THEIR_TEMPLATE = "---\n\nexcalidraw-plugin: parsed\n---\n# my own template\n";
const AsyncFunction = (async () => {}).constructor as new (...args: string[]) => (...args: unknown[]) => Promise<void>;
const installerBody = build(definitions).scripts["Install IEC Electronics Kit"];

const asBuffer = (s: string) => new TextEncoder().encode(s).buffer;

// A release: the files build() makes for `version`, as GitHub serves them.
function releaseOf(version: string) {
  const files = build(definitions, { version }).files;
  return {
    tag_name: `v${version}`,
    assets: Object.keys(files).map((name) => ({ name, browser_download_url: `https://download/${version}/${name}` })),
    serve(url: string) {
      const name = url.replace(`https://download/${version}/`, "");
      if (!(name in files)) throw new Error(`404 ${url}`);
      return { text: files[name as keyof typeof files], arrayBuffer: asBuffer(files[name as keyof typeof files]) };
    },
  };
}

function world(opts: { settings?: Record<string, unknown>; files?: Record<string, string>; release?: ReturnType<typeof releaseOf> | "offline"; save?: boolean } = {}) {
  const vault = new Map<string, string>(Object.entries(opts.files ?? {}));
  const writes: string[] = [];
  let release = opts.release ?? releaseOf("1.2.0");
  const notices: string[] = [];
  const asText = (c: string | ArrayBuffer) => (typeof c === "string" ? c : new TextDecoder().decode(c));
  const handle = (path: string) => (vault.has(path) ? { path } : null);
  const api = {
    getAbstractFileByPath: handle,
    read: async (f: { path: string }) => vault.get(f.path),
    modify: async (f: { path: string }, c: string) => (writes.push(f.path), vault.set(f.path, c)),
    modifyBinary: async (f: { path: string }, c: ArrayBuffer) => (writes.push(f.path), vault.set(f.path, asText(c))),
    create: async (p: string, c: string) => (writes.push(p), vault.set(p, c)),
    createBinary: async (p: string, c: ArrayBuffer) => (writes.push(p), vault.set(p, asText(c))),
    configDir: ".obsidian",
    adapter: {
      exists: async (p: string) => vault.has(p),
      read: async (p: string) => vault.get(p),
      write: async (p: string, c: string) => (writes.push(p), vault.set(p, c)),
    },
  };
  const ea = {
    obsidian: {
      Notice: class { constructor(message: string) { notices.push(message); } },
      requestUrl: async ({ url }: { url: string }) => {
        if (release === "offline") throw new Error("net::ERR_INTERNET_DISCONNECTED");
        return url === API ? { json: release } : release.serve(url);
      },
    },
    plugin: {
      app: { vault: api },
      settings: { libraryStorageMode: "vault", libraryFolderPath: "Excalidraw/Libraries", scriptFolderPath: "Excalidraw/Scripts", ...opts.settings },
    },
    checkAndCreateFolder: async () => {},
  };
  const utils = { suggester: async () => opts.save ?? false };
  return {
    vault, writes, notices,
    setRelease: (r: ReturnType<typeof releaseOf>) => { release = r; },
    run: () => new AsyncFunction("ea", "utils", installerBody)(ea, utils),
  };
}

const LIBS = ["Excalidraw/Libraries/electronics-schematic.excalidrawlib", "Excalidraw/Libraries/electronics-rf-blocks.excalidrawlib"];
const COMMANDS = ["Excalidraw/Scripts/Rotate 90 degrees.md", "Excalidraw/Scripts/Square Wires.md"];
const TEMPLATE = "Excalidraw/Template.excalidraw.md";
const ALONGSIDE = "Excalidraw/IEC Electronics Template.excalidraw.md";

test("a fresh install writes the Library, the Commands under their real names and the Template", async () => {
  const w = world();
  await w.run();
  for (const path of [...LIBS, ...COMMANDS, TEMPLATE]) assert.ok(w.vault.has(path), path);
  const kit = build(definitions, { version: "1.2.0" });
  assert.equal(w.vault.get(COMMANDS[0]), kit.scripts["Rotate 90 degrees"]);
  assert.equal(w.vault.get(TEMPLATE), kit.template);
  assert.match(w.vault.get(LIBS[0])!, /releases\/tag\/v1\.2\.0"/);
  const notice = w.notices.at(-1)!;
  assert.match(notice, /Installed the Kit, v1\.2\.0/);
  assert.match(notice, /Ctrl\/Cmd\+R/);
  assert.match(notice, /Alt\+W/);
});

test("running it again updates an older Kit and reports the versions", async () => {
  const w = world({ release: releaseOf("1.1.0") });
  await w.run();
  assert.match(w.vault.get(LIBS[0])!, /v1\.1\.0"/);
  w.setRelease(releaseOf("1.2.0"));
  await w.run();
  assert.match(w.vault.get(LIBS[0])!, /v1\.2\.0"/);
  assert.match(w.vault.get(COMMANDS[0])!, /\/\/ version 1\.2\.0\n/);
  assert.match(w.vault.get(TEMPLATE)!, /excalidraw-electronics-template: 1\.2\.0\n/);
  assert.match(w.notices.at(-1)!, /Updated the Kit from v1\.1\.0 to v1\.2\.0/);
});

test("on the latest version it reports up to date and writes nothing", async () => {
  const w = world();
  await w.run();
  w.writes.length = 0;
  await w.run();
  assert.deepEqual(w.writes, []);
  assert.match(w.notices.at(-1)!, /up to date \(v1\.2\.0\)/);
});

test("a Template of the user's at the default path is left untouched", async () => {
  const w = world({ files: { [TEMPLATE]: THEIR_TEMPLATE } });
  await w.run();
  assert.equal(w.vault.get(TEMPLATE), THEIR_TEMPLATE);
  assert.ok(!w.vault.has(ALONGSIDE));
  assert.ok(w.vault.has(LIBS[0]));
});

test("it saves its Template alongside the user's when they say yes, still not touching theirs", async () => {
  const w = world({ files: { [TEMPLATE]: THEIR_TEMPLATE }, save: true });
  await w.run();
  assert.equal(w.vault.get(TEMPLATE), THEIR_TEMPLATE);
  assert.equal(w.vault.get(ALONGSIDE), build(definitions, { version: "1.2.0" }).template);
});

test("a Template of ours at the default path is updated in place", async () => {
  const old = build(definitions, { version: "1.1.0" }).template;
  const w = world({ files: { [TEMPLATE]: old } });
  await w.run();
  assert.equal(w.vault.get(TEMPLATE), build(definitions, { version: "1.2.0" }).template);
});

test("a script of the user's with one of our names is not replaced", async () => {
  const mine = "// my own square wires\n";
  const w = world({ files: { [COMMANDS[1]]: mine } });
  await w.run();
  assert.equal(w.vault.get(COMMANDS[1]), mine);
  assert.ok(w.vault.has(COMMANDS[0]));
});

test("with the library stored in the plugin's settings it stops and explains, writing nothing", async () => {
  const w = world({ settings: { libraryStorageMode: "data-json" } });
  await w.run();
  assert.deepEqual(w.writes, []);
  assert.match(w.notices.at(-1)!, /library storage to the vault/);
});

test("it follows the plugin's library and script folders", async () => {
  const w = world({ settings: { libraryFolderPath: "Lib", scriptFolderPath: "Scr" } });
  await w.run();
  assert.ok(w.vault.has("Lib/electronics-schematic.excalidrawlib"));
  assert.ok(w.vault.has("Scr/Square Wires.md"));
});

test("offline, it says so and changes nothing", async () => {
  const w = world({ release: "offline" });
  await w.run();
  assert.deepEqual(w.writes, []);
  assert.match(w.notices.at(-1)!, /couldn't reach the latest release/);
});

test("a download that fails leaves the vault as it was", async () => {
  const release = releaseOf("1.2.0");
  const serve = release.serve;
  release.serve = (url: string) => {
    if (url.endsWith("Square-Wires.md")) throw new Error("500");
    return serve(url);
  };
  const w = world({ release });
  await w.run();
  assert.deepEqual(w.writes, []);
  assert.match(w.notices.at(-1)!, /a download failed/);
});

test("the markers the installer looks for are the ones the Generator writes", async () => {
  const { SCRIPT_MARKER, TEMPLATE_MARKER } = await import("../src/build.ts");
  assert.ok(installerBody.includes(`"${SCRIPT_MARKER}"`));
  assert.ok(installerBody.includes(`"${TEMPLATE_MARKER}:"`));
});

const HOTKEYS = ".obsidian/hotkeys.json";
const ROTATE = "obsidian-excalidraw-plugin:Rotate 90 degrees";
const SQUARE = "obsidian-excalidraw-plugin:Square Wires";

test("it binds Ctrl/Cmd+R and Alt+W when they are free, keeping the user's other hotkeys", async () => {
  const other = { "editor:toggle-bold": [{ modifiers: ["Mod"], key: "B" }] };
  const w = world({ files: { [HOTKEYS]: JSON.stringify(other) } });
  await w.run();
  const hotkeys = JSON.parse(w.vault.get(HOTKEYS)!);
  assert.deepEqual(hotkeys[ROTATE], [{ modifiers: ["Mod"], key: "R" }]);
  assert.deepEqual(hotkeys[SQUARE], [{ modifiers: ["Alt"], key: "W" }]);
  assert.deepEqual(hotkeys["editor:toggle-bold"], other["editor:toggle-bold"]);
  assert.match(w.notices.at(-1)!, /Bound Ctrl\/Cmd\+R to Rotate 90 degrees/);
  assert.match(w.notices.at(-1)!, /Reload Obsidian/);
});

test("it creates hotkeys.json when there is none", async () => {
  const w = world();
  await w.run();
  assert.ok(Object.keys(JSON.parse(w.vault.get(HOTKEYS)!)).includes(ROTATE));
});

test("a hotkey the user already set for a Command is kept, even a cleared one", async () => {
  const mine = { [ROTATE]: [{ modifiers: ["Ctrl", "Shift"], key: "T" }], [SQUARE]: [] };
  const w = world({ files: { [HOTKEYS]: JSON.stringify(mine) } });
  await w.run();
  assert.deepEqual(JSON.parse(w.vault.get(HOTKEYS)!), mine);
  assert.ok(!w.writes.includes(HOTKEYS));
});

test("a hotkey another command uses is not taken, and the notice says so", async () => {
  const taken = { "editor:something": [{ modifiers: ["Alt"], key: "w" }] };
  const w = world({ files: { [HOTKEYS]: JSON.stringify(taken) } });
  await w.run();
  const hotkeys = JSON.parse(w.vault.get(HOTKEYS)!);
  assert.ok(!(SQUARE in hotkeys));
  assert.deepEqual(hotkeys["editor:something"], taken["editor:something"]);
  assert.ok(ROTATE in hotkeys);
  assert.match(w.notices.at(-1)!, /No hotkey for Square Wires: Alt\+W is already used by editor:something/);
});

test("a hotkeys.json it can't read is left alone", async () => {
  const w = world({ files: { [HOTKEYS]: "{ not json" } });
  await w.run();
  assert.equal(w.vault.get(HOTKEYS), "{ not json");
  assert.match(w.notices.at(-1)!, /Couldn't read your hotkeys\.json/);
});

test("a second run changes no hotkeys and still writes nothing", async () => {
  const w = world();
  await w.run();
  w.writes.length = 0;
  await w.run();
  assert.deepEqual(w.writes, []);
});

test("an up-to-date Kit still gets its hotkeys if they were never bound", async () => {
  const w = world();
  await w.run();
  w.vault.delete(HOTKEYS);
  await w.run();
  assert.ok(ROTATE in JSON.parse(w.vault.get(HOTKEYS)!));
  assert.match(w.notices.at(-1)!, /up to date/);
});
