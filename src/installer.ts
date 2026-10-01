// The "Install IEC Electronics Kit" command. The Obsidian Excalidraw plugin runs it as a script,
// with its Excalidraw Automate object as `ea` and `utils` for prompts, so the function must not
// use anything from outside itself: build() ships its source text. Run from any open drawing, it
// downloads the latest GitHub release and writes the Kit into the vault; running it again updates.
// It only replaces files it made: a Template or script of the user's is left alone. It also binds
// Ctrl/Cmd+R and Alt+W to the two Commands in Obsidian's hotkeys.json, never overwriting a hotkey
// the user set or one already used by another command.
type Vault = Record<string, any>;

export async function installKit(ea: any, utils: any) {
  const { requestUrl, Notice } = ea.obsidian;
  const REPO = "rasmusravn/excalidraw-electronics";
  const SCRIPT_MARKER = "// excalidraw-electronics script";
  const TEMPLATE_MARKER = "excalidraw-electronics-template:";
  const app = ea.plugin.app;
  const settings = ea.plugin.settings;
  const vault: Vault = app.vault;
  const report: string[] = [];
  const say = (line: string) => report.push(line);
  // A message that stays until the user dismisses it.
  const stop = (message: string) => new Notice(message, 0);

  const folderOf = (path: string) => path.slice(0, path.lastIndexOf("/"));
  const exists = (path: string) => vault.getAbstractFileByPath(path);
  const readText = async (path: string) => {
    const file = exists(path);
    return file ? await vault.read(file) : undefined;
  };
  // Creates or replaces a file through the vault, so the plugin sees the change.
  const write = async (path: string, content: string | ArrayBuffer) => {
    const file = exists(path);
    const isText = typeof content === "string";
    if (file) await (isText ? vault.modify(file, content) : vault.modifyBinary(file, content));
    else {
      await ea.checkAndCreateFolder(folderOf(path));
      await (isText ? vault.create(path, content) : vault.createBinary(path, content));
    }
  };

  // Where the plugin keeps these: fall back to its defaults.
  const libraryFolder = settings.libraryFolderPath || "Excalidraw/Libraries";
  const scriptFolder = settings.scriptFolderPath || "Excalidraw/Scripts";
  const templatePath = "Excalidraw/Template.excalidraw.md";
  const alongsidePath = "Excalidraw/IEC Electronics Template.excalidraw.md";
  const libraries = ["electronics-schematic.excalidrawlib", "electronics-rf-blocks.excalidrawlib"];
  const commands: Record<string, string> = {
    "Rotate-90-degrees.md": "Rotate 90 degrees.md",
    "Square-Wires.md": "Square Wires.md",
  };

  // Obsidian has no public API for hotkeys; its hotkeys.json maps a command id to its hotkeys. It
  // reads the file when it starts, so a new binding needs a reload.
  const bindHotkeys = async (): Promise<string[]> => {
    const wanted: Record<string, { modifiers: string[]; key: string; label: string }> = {
      "Rotate 90 degrees": { modifiers: ["Mod"], key: "R", label: "Ctrl/Cmd+R" },
      "Square Wires": { modifiers: ["Alt"], key: "W", label: "Alt+W" },
    };
    const path = `${vault.configDir}/hotkeys.json`;
    let hotkeys: Record<string, { modifiers: string[]; key: string }[]> = {};
    if (await vault.adapter.exists(path)) {
      try {
        hotkeys = JSON.parse(await vault.adapter.read(path));
      } catch {
        return ["Couldn't read your hotkeys.json, so no hotkeys were bound. Bind Ctrl/Cmd+R and Alt+W yourself under Settings, Hotkeys."];
      }
    }
    const same = (a: { modifiers: string[]; key: string }, b: { modifiers: string[]; key: string }) =>
      a.key.toUpperCase() === b.key.toUpperCase() && a.modifiers.join() === b.modifiers.join();
    const lines: string[] = [];
    let changed = false;
    for (const [name, { label, ...hotkey }] of Object.entries(wanted)) {
      const id = `obsidian-excalidraw-plugin:${name}`;
      const takenBy = Object.entries(hotkeys).find(([other, keys]) => other !== id && keys.some((k) => same(k, hotkey)))?.[0];
      if (id in hotkeys) continue;
      if (takenBy) lines.push(`No hotkey for ${name}: ${label} is already used by ${takenBy}. Bind one under Settings, Hotkeys.`);
      else {
        hotkeys[id] = [hotkey];
        changed = true;
        lines.push(`Bound ${label} to ${name}.`);
      }
    }
    if (changed) {
      await vault.adapter.write(path, `${JSON.stringify(hotkeys, null, 2)}\n`);
      lines.push("Reload Obsidian (command palette: Reload app without saving) to pick up the new hotkeys.");
    }
    return lines;
  };

  // Libraries dropped into the folder load only when the plugin keeps its library in the vault.
  if (settings.libraryStorageMode !== "vault") {
    stop(
      "IEC Electronics Kit: not installed. Your Excalidraw library is stored in the plugin's settings, " +
        "so the Library files wouldn't load. In Settings, Excalidraw, switch the library storage to the vault, " +
        "then run this command again.",
    );
    return;
  }

  let release: any;
  try {
    release = (await requestUrl({ url: `https://api.github.com/repos/${REPO}/releases/latest`, throw: true })).json;
  } catch (e) {
    stop(`IEC Electronics Kit: couldn't reach the latest release (${(e as Error).message}). Check your connection and try again.`);
    return;
  }
  const latest = String(release.tag_name).replace(/^v/, "");
  const assets = new Map<string, string>(release.assets.map((a: any) => [a.name, a.browser_download_url]));
  const missing = [...libraries, ...Object.keys(commands), "Template.excalidraw.md"].filter((name) => !assets.has(name));
  if (missing.length > 0) {
    stop(`IEC Electronics Kit: release v${latest} is missing ${missing.join(", ")}. Nothing was changed.`);
    return;
  }

  // The installed version is stamped in the Library file's source, a release-tag URL.
  const installedSource = await readText(`${libraryFolder}/${libraries[0]}`);
  const installed = installedSource?.match(/releases\/tag\/v([0-9][^"]*)"/)?.[1];
  const haveCommands = Object.values(commands).every((name) => exists(`${scriptFolder}/${name}`));
  const haveLibraries = libraries.every((name) => exists(`${libraryFolder}/${name}`));
  if (installed === latest && haveLibraries && haveCommands) {
    new Notice([`IEC Electronics Kit is up to date (v${latest}).`, ...(await bindHotkeys())].join("\n"), 8000);
    return;
  }
  say(installed ? `Updated the Kit from v${installed} to v${latest}.` : `Installed the Kit, v${latest}.`);

  const fetchAsset = (name: string) => requestUrl({ url: assets.get(name)!, throw: true });
  const text = async (name: string): Promise<string> => (await fetchAsset(name)).text;
  const binary = async (name: string): Promise<ArrayBuffer> => (await fetchAsset(name)).arrayBuffer;

  // Download everything first, so a failed download leaves the vault as it was.
  let files: { path: string; content: string | ArrayBuffer; marker?: string }[];
  let template: string;
  try {
    files = [
      ...(await Promise.all(libraries.map(async (name) => ({ path: `${libraryFolder}/${name}`, content: await binary(name) })))),
      ...(await Promise.all(
        Object.entries(commands).map(async ([asset, name]) => ({ path: `${scriptFolder}/${name}`, content: await text(asset), marker: SCRIPT_MARKER })),
      )),
    ];
    template = await text("Template.excalidraw.md");
  } catch (e) {
    stop(`IEC Electronics Kit: a download failed (${(e as Error).message}). Nothing was changed.`);
    return;
  }

  for (const { path, content, marker } of files) {
    // Never replace a script of the user's that happens to have our name.
    const current = marker ? await readText(path) : undefined;
    if (marker && current !== undefined && !current.includes(marker)) {
      say(`Left ${path} alone: it isn't ours.`);
      continue;
    }
    await write(path, content);
  }
  say("Library and Commands are in place.");

  // The plugin copies its Template into every new drawing, so ours counts as ours only at the
  // default path and with our marker; never by the marker alone.
  const current = await readText(templatePath);
  if (current === undefined || current.includes(TEMPLATE_MARKER)) {
    await write(templatePath, template);
    say("Template is at the default path: new drawings start with the grid on and Wire-ready arrows.");
  } else {
    say("You already have a Template; it was left as it is.");
    const save = await utils.suggester(
      [`Save ours beside it as ${alongsidePath}`, "No, keep only mine"],
      [true, false],
      "You already have an Excalidraw Template. Save the Kit's Template alongside it?",
    );
    const alongside = save ? await readText(alongsidePath) : undefined;
    if (save && (alongside === undefined || alongside.includes(TEMPLATE_MARKER))) {
      await write(alongsidePath, template);
      say(`Saved the Kit's Template as ${alongsidePath}.`);
    }
  }

  for (const line of await bindHotkeys()) say(line);
  new Notice(`IEC Electronics Kit\n${report.join("\n")}`, 20000);
}
