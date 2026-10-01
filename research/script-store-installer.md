# Plugin script store and Excalidraw Automate: can one Command install the whole Kit?

Answers issue #40 (part of map #38). Researched 2026-10-01 against the Obsidian Excalidraw plugin **2.28.1**.

Sources:
- **Bundle**: the installed plugin at `~/personal-library/.obsidian/plugins/obsidian-excalidraw-plugin/main.js`
  (manifest `"version": "2.28.1"`, `"isDesktopOnly": false`). Excerpts below are quoted from it, minified.
- **Upstream source** (`PL/` = `https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/master/`), the files the bundle
  excerpts come from: `PL/src/utils/scriptLibraryUtils.ts` (install/update), `PL/src/shared/Dialogs/ScriptInstallPrompt.ts`
  (store UI, catalog parsing), `PL/src/shared/Scripts.ts` (Script Engine), `PL/src/core/managers/StencilLibraryManager.ts`
  (vault library), `PL/src/utils/fileUtils.ts` (template lookup).
- **Store data**: `PL/ea-scripts/script-store.json` (last changed in commit `287f6a1`, 2026-09-19; 85 scripts),
  `PL/ea-scripts/directory-info.json`, `PL/scripts/build-script-store.mjs`.
- **Docs**: `PL/ea-scripts/README.md` ("Publishing a community script"), `PL/docs/ExcalidrawScriptsEngine.md`.
- **Obsidian API**: `obsidian.d.ts` from `github.com/obsidianmd/obsidian-api` (master).
- **Precedent**: `PL/ea-scripts/Comic Strip Director.md` (by @iwanhoogendoorn, listed in the store).

## Answer

**Yes, one script can install the whole Kit, but it cannot get into the store as "the Kit".** It also cannot install
itself: the user has to get the installer script into the script folder first.

- **The store is a catalog in the plugin's own repo.** A community script is accepted by a **pull request to
  `zsviczian/obsidian-excalidraw-plugin`**. The PR adds the script file to `ea-scripts/`, an optional `.svg` icon, and an
  entry in `ea-scripts/script-store.json`. The plugin always downloads from `raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/ea-scripts/<file>`
  and ignores the entry's `installUrl`. It downloads **only the script and its icon**, never companion files. So our two
  scripts could be listed, but a listed script can't pull our libraries and Template along with it.
- **An EA script runs with no sandbox.** Running from inside Obsidian, it can:
  - download from a **public** GitHub release with `ea.obsidian.requestUrl`;
  - write anywhere in the vault;
  - drop `.excalidrawlib` files into the library folder. The plugin **reloads open drawings' libraries by itself**.
  - write scripts into the script folder. They **become commands immediately**, with no restart.
  - change `ea.plugin.settings.templateFilePath` and call `ea.plugin.saveSettings()`. That is reachable, but not a public API.

  Writing hotkeys is only possible through Obsidian's **private** `hotkeyManager`. Suggest them instead.
- **The blocker today: the repo is private.** `rasmusravn/excalidraw-electronics` has `visibility: PRIVATE`, and the
  unauthenticated `releases/latest/download/...` URL returns **404**. An installer only works once the repo, or at least
  its release assets, is public.

## 1. How the script store accepts, installs and updates scripts

**Catalog.** The plugin fetches a fixed catalog URL and a fixed per-file URL scheme (bundle, from `ScriptInstallPrompt.ts`):

```js
CATALOG_URL=URLs.RAW_GITHUBUSERCONTENT_COM_ZSVICZIAN_OBSIDIAN_EXCALIDRAW_PLUGIN_MASTER_EA_SCRIPTS_SCRIPT_STORE_JSON
...
parseScriptStoreCatalog=e=>{const t=JSON.parse(e);if(!(isRecord(t)&&1===t.version&&...))throw new Error("Unsupported script store catalog");...}
getScriptInstallUrl=e=>getPluginRepositoryRawUrl(`ea-scripts/${e.file}`),
getScriptIconUrl=e=>getPluginRepositoryRawUrl(`ea-scripts/${e.file.replace(/\.(?:md|js)$/i,".svg")}`)
```

with `PLUGIN_REPOSITORY_RAW_BASE_URL="https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master"`.
Every install, update and "Update all" path calls `installScript(this.plugin, getScriptInstallUrl(e), ...)`. So the
`installUrl` field in an entry is validated (it must be a string) but **not used**, and a script can't be hosted in our repo.
All 85 entries in today's catalog point into `zsviczian/.../master/ea-scripts/`. There are 13 authors; 34 of the 85 scripts
are by people other than @zsviczian.

**Acceptance = PR.** `PL/ea-scripts/README.md`, "Publishing a community script":

> The current Script Store reads metadata from `ea-scripts/script-store.json`. Add or update one catalog entry when publishing
> a script, plus the script file and its matching SVG icon/preview when applicable. Run: `npm run script-store:check` ...
> `npm run script-store:build`

`build-script-store.mjs` validates the catalog (version 1, unique name/file, the file must exist in `ea-scripts/`, known
categories) and bumps `directory-info.json` mtimes for the changed files. The maintainer reviews and merges. There is no
external registry.

**Install.** `installScript` (in `scriptLibraryUtils.ts`) does `obsidian.request` for the script URL and its `.svg`, then writes
them to `<scriptFolderPath>/Downloaded/<name>.md`:

```js
getDownloadedScriptsFolder=e=>obsidian_module.normalizePath(`${e.settings.scriptFolderPath}/Downloaded`)
...
const[a,n]=await Promise.all([c(t),c(getIMGFilename(t,"svg"))]);if(!a)throw new Error("Script file not found");
... s=await createOrOverwriteFile(e.app,s?.path??l,a); ...
return await e.scriptEngine.refreshManagedScriptFile(s), ...
```

The user opens a drawing and runs the command **"Install or update Excalidraw Scripts"** (id `scriptengine-store`; its
`checkCallback` requires an active Excalidraw view). They browse or search, then click Install. `README.md` still says
"Restart Obsidian so the script will be picked up", but in 2.28.1 that is out of date: `refreshManagedScriptFile` registers
the command at once.

**Updates.** These are mtime-based. `directory-info.json` lists `{fname, mtime}` per file. A local copy whose `stat.mtime` is
older than the remote one is marked `"update"`:

```js
getInstallStateFromDirectoryInfo=(e,t,i,a)=>{if(!a.has(i))return"error";if((a.get(i)??0)>t.stat.mtime)return"update"; ...
```

The store has "Update all". On top of that, the plugin's version check (re-armed every 8 h, `288e5` ms) calls
`checkScriptUpdates()`, which shows a Notice `SCRIPT_UPDATES_AVAILABLE` with the names of the scripts to update. Only
scripts under `Downloaded/` are managed this way.

**What this means for us.** We could submit "Rotate 90 degrees" and "Square Wires", and maybe an installer, by PR upstream.
The maintainer would have to accept them, and every later change would be another upstream PR. The store would still
never deliver our `.excalidrawlib` files or the Template. Store installs also land in `Downloaded/`, which changes the
command id (see section 3).

## 2. What an EA script can do when run from inside Obsidian

**Execution model: no sandbox.** From `Scripts.ts` (bundle):

```js
compileScript(e){const t=stripYamlFrontmatter(e);return t?new(0,(async()=>{}).constructor)("ea","utils",t):null}
... return await t(d,{inputPrompt:..., suggester:..., scriptFile:a, executionSource:n})
```

This is a plain `AsyncFunction` in Obsidian's renderer. It gets `ea` (with `ea.plugin`, the live plugin instance, and
`ea.obsidian`, the whole `obsidian` module namespace: `get obsidian(){return obsidian_module__namespace}`). It also gets
`utils` (`inputPrompt`, `suggester`, `scriptFile`, `executionSource`), and it can see the global `app`. Running a script
by hand involves **no permission prompt**. The only trust gate is that the file is in the script folder. Only *autostart*
scripts have a stored allow/deny (`settings.autostartScripts`). `.js` scripts need `allowJavaScriptFiles`, but `.md`
scripts always work.

| Capability | Possible? | How / evidence |
|---|---|---|
| Download a release asset | **Yes**, for public URLs | `ea.obsidian.requestUrl({url, throw:true})` → `.arrayBuffer` / `.text`. `obsidian.d.ts`: "Similar to `fetch()`, request a URL using HTTP/HTTPS, without any CORS restrictions." `releases/latest/download/<asset>` 302s to `release-assets.githubusercontent.com` (checked with curl on the plugin's own release). Our repo is private → 404. |
| Write into the vault | **Yes** | `app.vault.adapter.writeBinary(path, ArrayBuffer)` / `app.vault.create`/`modify`/`createBinary` (all public in `obsidian.d.ts`). Folders: `app.vault.createFolder` or `ea.checkAndCreateFolder(path)`. |
| Install `.excalidrawlib` and have it picked up | **Yes, automatically** | `StencilLibraryManager` listens to vault `create`/`modify` for `*.excalidrawlib` directly in the library folder and calls `scheduleOpenViewReload()` (300 ms debounce) → `excalidrawAPI.updateLibrary({libraryItems, merge:false})` on every open view. This works **only when `libraryStorageMode === "vault"`**. The folder is `settings.libraryFolderPath` (here `Excalidraw/Libraries`), and subfolders are not scanned (`e.parent?.path===t`). |
| Install the two scripts | **Yes, live** | The Script Engine's vault `create` handler calls `reloadScripts()` for any script or `.svg` in the script folder. Each one is registered at once as command `obsidian-excalidraw-plugin:<name>` ("(Script) <name>"). No restart needed. |
| Install the Template | **Yes** | Write to a path that matches `settings.templateFilePath`. The default is `Excalidraw/Template.excalidraw`, resolved with `getFirstLinkpathDest`, so `Excalidraw/Template.excalidraw.md` matches. If the setting is a **folder**, every Excalidraw file in it is offered in a picker when a new drawing is created. |
| Change plugin settings (template path) | **Technically yes, not public API** | `ea.plugin.settings.templateFilePath = "..."; await ea.plugin.saveSettings();`. The plugin itself does exactly this internally, e.g. in `migrateScriptFiles`, and `getListOfTemplateFiles` reads the setting live, so no reload is needed. No store script writes plugin settings (searched all 93 `.md`/`.js` in `ea-scripts/`). The documented per-script store is `ea.getScriptSettings()`/`ea.setScriptSettings()`. An open settings tab won't refresh. |
| Write hotkeys | **Only via private API** | `app.hotkeyManager` is not in `obsidian.d.ts`. The plugin uses it only for its own default (`this.app.hotkeyManager.addDefaultHotkeys(i,[{modifiers:["Ctrl"],key:"s"}])`). Users' custom bindings live in `<configDir>/hotkeys.json`. Writing either is undocumented and may clobber the user's bindings. **Suggest instead**: show a Notice or modal naming the commands. The docs say scripts are meant to get hotkeys "just like any other Obsidian command" (`ExcalidrawScriptsEngine.md`). |
| Unzip `obsidian-extras.zip` | **No built-in** | There is no zip library in the bundle (no JSZip/fflate). Fetch the individual assets instead. |

## 3. Limits

- **Bootstrapping.** A script can only run once it is in the script folder, and it only runs while **a drawing is
  active**. Every script command uses
  `checkCallback:t=>{if(t)return Boolean(this.app.workspace.getActiveViewOfType(ExcalidrawView)); ...}`. So "install the
  Kit" means: (1) get `Install Kit.md` into `Excalidraw/Scripts/` (store, or download and copy by hand), (2) open any
  drawing, (3) run the command.
- **Command ids depend on location.** `getScriptName` keeps the subfolder relative to the script folder. A script at
  `Excalidraw/Scripts/Square Wires.md` is `obsidian-excalidraw-plugin:Square Wires`. A store install at
  `Scripts/Downloaded/Square Wires.md` is `obsidian-excalidraw-plugin:Downloaded/Square Wires`. Hotkeys are bound to the id,
  so moving a script loses its hotkey. The installer should write to one fixed path.
- **Library storage mode.** If the user opted out of vault storage (`libraryStorageMode: "data-json"`, legacy), dropped
  files are not loaded. The installer should check `ea.plugin.settings.libraryStorageMode` and tell the user, rather than
  write into `settings.library2`.
- **Mobile.** The plugin is not desktop-only. `requestUrl` and `vault.adapter.writeBinary` are cross-platform Obsidian APIs,
  and store scripts already branch on `ea.DEVICE.isMobile`. So an installer should work on mobile. This is not tested here.
  Hotkeys are moot on most phones.
- **User prompts.** Nothing is forced. The script decides what to ask, using `utils.inputPrompt`/`utils.suggester` or
  `new ea.obsidian.Modal(app)`. Overwriting an existing `Template.excalidraw.md` or changing `templateFilePath` touches the
  user's own setup, so it should be confirmed.
- **Store-managed updates only cover `Downloaded/`.** An installer we host ourselves gets no update notices from the plugin.
  It has to compare versions itself, e.g. by fetching the GitHub "latest release" tag and storing the installed version
  with `ea.setScriptSettings`.

## 4. Precedent: a store script that downloads assets

**`Comic Strip Director`** (store entry `"file": "Comic Strip Director.md"`, author @iwanhoogendoorn) downloads data packs
from GitHub and writes them into the script folder:

```js
const FREE_PACK_URLS = [
  "https://raw.githubusercontent.com/iwanhoogendoorn/obsidian-excalidraw-plugin/main/ea-scripts/comic-strip-director/free/core-free.strippack", ...];
...
const req = ea.obsidian && ea.obsidian.requestUrl;
...
const res = await req({ url, throw: true });
await ad.writeBinary(dest, res.arrayBuffer);
```

It records what it installed in `ea.getScriptSettings().installedPacks`. It also resolves its data folder in both
`Scripts/` and `Scripts/Downloaded/` ("when this script is installed via the official script store it runs from
Scripts/Downloaded/"). It falls back to a manual hint when the download fails. So the maintainer has accepted a store
script that fetches assets from a third-party GitHub repo at runtime. `Capture Note.md` reads
`ea.plugin.settings.templateFilePath` but does not write it. No store script installs `.excalidrawlib` files or changes
plugin settings.

## What this means for an installer Command

A workable design:

1. **Ship `Install Electronics Kit.md` as a release asset**, plus the separate files we already have. It can also be offered
   as a store PR later, with the maintainer's acceptance.
2. **On run:**
   - fetch `releases/latest` (or a pinned tag) assets with `requestUrl`;
   - write both `.excalidrawlib` to `settings.libraryFolderPath` (they reload live);
   - write the two scripts to a fixed path in `settings.scriptFolderPath` (they become commands live);
   - write `Template.excalidraw.md` to a templates location the user confirms.

   Only after a prompt: set `templateFilePath` (or point it at a folder so the user's own template survives), then
   `ea.plugin.saveSettings()`.
3. **Hotkeys**: don't write them. End with a Notice listing `(Script) Rotate 90 degrees` and `(Script) Square Wires`, and
   point to Settings → Hotkeys.
4. **Prerequisite**: make the repo, or its release assets, public. Otherwise every download 404s.
