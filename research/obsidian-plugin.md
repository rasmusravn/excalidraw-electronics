# Does the Obsidian Excalidraw plugin change the research findings?

Answers issue #8 (part of map #1). Re-checks
[`research/excalidraw-lib-format.md`](https://github.com/rasmusravn/excalidraw-electronics/blob/research/excalidraw-lib-format/research/excalidraw-lib-format.md) (#2),
[`research/pin-binding.md`](https://github.com/rasmusravn/excalidraw-electronics/blob/research/pin-binding/research/pin-binding.md) (#3) and
[`research/prior-art.md`](https://github.com/rasmusravn/excalidraw-electronics/blob/research/prior-art/research/prior-art.md) (#4)
against the plugin the user actually runs. Researched 2026-10-01.

Sources:
- **Plugin**: `zsviczian/obsidian-excalidraw-plugin` release **2.28.1** (latest, published 2026-09-29), commit `128a9ef`.
  `PL/` = `https://github.com/zsviczian/obsidian-excalidraw-plugin/blob/2.28.1/`.
- **Fork**: the plugin's `package.json` L39 pins `"@zsviczian/excalidraw": "0.18.140"` (latest on npm, published 2026-09-28).
  In `zsviczian/excalidraw` that version is commit
  [`91e611ba`](https://github.com/zsviczian/excalidraw/commit/91e611ba67c4090dcf33988cbf079764960e3f1f) ("0.18.140").
  `FK/` = `https://github.com/zsviczian/excalidraw/blob/91e611ba67c4090dcf33988cbf079764960e3f1f/`.
- **Upstream** as cited by the earlier findings: `excalidraw/excalidraw` `1919728` (`EX/`).
- **Docs**: `PL/docs/ExcalidrawScriptsEngine.md`, `PL/AutomateHowTo.md`, `PL/docs/API/ExcalidrawAutomate.d.ts` (the source of the
  zsviczian.github.io/obsidian-excalidraw-plugin site).
- **Runtime check**: the earlier Node harness was not committed to the `research/excalidraw-lib-format` branch, so I rebuilt it (see
  "Verification"). It runs the fork's own browser bundle (`@zsviczian/excalidraw@0.18.140`,
  `dist/obsidian/excalidraw.production.min.js`, the file the plugin embeds per `PL/rollup.config.mjs` L77-80), and runs the same
  script against `@excalidraw/excalidraw@0.18.1` for comparison.

## Answer

**The findings hold.** The fork is only 5 upstream commits behind the commit the earlier research cites. Every upstream
file behind the import, placement, grid-snap, binding and hit-test findings is **byte-identical** in the fork. The fork
adds a few changes of its own, and none of them breaks the Library. The plugin changes one thing in our favour:

1. **The plugin can load a `.excalidrawlib` file straight from a vault folder** (default `Excalidraw/Libraries/`). If the
   user drops our generated file into that folder, the plugin loads it as a "published" library and reloads it whenever
   the file changes. The user doesn't have to import it, and no duplicates pile up on re-install. This is the recommended
   install route for Obsidian. The library menu's import still works the same way as on excalidraw.com.
2. **Excalidraw Automate (EA) is a viable *supplement*, not a replacement for the Generator.** An EA script can insert
   Symbols with text measured on the spot, snap them to the grid itself, and draw wires that are bound `"inside"` to pin
   targets with an exact `fixedPoint`. That is the strongest wire helper available. But it only runs in Obsidian, and the
   user has to install a script. Keep the static `.excalidrawlib` as the product. A "wire these two pins" EA script is a
   good optional extra later.

Fork-only differences to design around (all small):
- `restoreElements` **drops a `groupIds` entry that only one element carries** (`pruneOrphanGroupIds`). That's harmless for
  multi-element Symbols, but don't rely on a single-element group surviving.
- `fontFamily: 4` means **"Local Font"**, a per-user font file from the plugin settings. Don't use it. The fork also lists
  `Lilita One` (7) as a fourth top pick in the font picker. That makes no difference to us.
- Duplicated text elements get a `obsidianId()` id instead of `randomId()`. That makes no difference to us.
- Grid size is stored per drawing, and the user can change it (for example with the "Set Grid" script). The 20 px contract holds
  only on drawings where the grid is still the default 20.

## 1. Which fork, and how far from upstream

| Fact | Source |
|---|---|
| Plugin 2.28.1 depends on `@zsviczian/excalidraw` **0.18.140** | `PL/package.json` L39 |
| The plugin embeds the fork's IIFE bundle `dist/obsidian/excalidraw.production.min.js` (global `ExcalidrawLib`) | `PL/rollup.config.mjs` L77-80, L210-217 |
| 0.18.140 = fork commit `91e611ba` (2026-09-28). Its merge base with upstream is `3d056dbc` | `git log -S'"version": "0.18.140"' -- packages/excalidraw/package.json`; `git merge-base` |
| Upstream commits in `1919728` that the fork release does not have: **5** (#12195 text editing moved to `AppText`, #12197 clipboard moved to `AppClipboard`, #12186 typo, #12204 E+ banner, #12210 "reach text containers below transparent ones"). Fork `master` has merged up to #12204 since then | `git log 91e611ba..1919728` |
| Fork-only commits: about 1,700 (most are Obsidian UI and hosting). The fork lists its deviations in `dev-docs/Obsidian/customizations.md` (added on fork master after 0.18.140) | `git rev-list --count up/master..91e611ba` |

`git diff 1919728 91e611ba` on every file the earlier findings cite:

| File | Diff vs upstream `1919728` |
|---|---|
| `excalidraw/data/library.ts` (merge, dedupe, `ALLOWED_LIBRARY_URLS`) | **identical** |
| `excalidraw/data/json.ts` (`isValidLibrary`) | **identical** |
| `excalidraw/components/App.duplicate.ts` (`duplicateAtSceneCoords`) | **identical** |
| `common/src/points.ts` (`getGridPoint`) | **identical** |
| `element/src/sizeHelpers.ts` (`isInvisiblySmallElement`) | **identical** |
| `element/src/fractionalIndex.ts` (`syncInvalidIndices`) | **identical** |
| `element/src/binding.ts`, `typeChecks.ts`, `dragElements.ts`, `elbowArrow.ts`, `linearElementEditor.ts` | **identical** |
| `common/font-metadata.ts`, `excalidraw/components/LibraryMenuItems.tsx` | **identical** |
| `element/src/collision.ts` | `isOpaqueForBinding` un-exported plus a comment change. Same logic |
| `element/src/bounds.ts` | comment only |
| `element/src/duplicate.ts` | text and linked elements get `obsidianId()` (`FK/packages/element/src/duplicate.ts` L116) |
| `excalidraw/data/restore.ts` | `rawText`/`hasTextLink` kept, `pruneOrphanGroupIds`, iframe `scale`, a font top-pick tweak (below) |
| `excalidraw/data/blob.ts` | null guard for an Obsidian tab-drag drop event |
| `common/src/constants.ts` | `"Local Font": 4`, `FONT_TOP_PICKS_SLOTS = 4`, `extraThin` 0.5 stroke width, `ZOOM_STEP` 0.05 |
| `common/src/utils.ts` | `throttleRAF` window param. `COMPLEX_BINDINGS` still defaults to `false` (`FK/packages/common/src/utils.ts` L1205) |
| `element/src/resizeElements.ts` | elements with `customData.isAnchored` keep their size on resize. Embeddables scale |
| `excalidraw/components/App.tsx` | large. `addElementsFromPasteOrLibrary` (`FK/…/App.tsx` L5128-5235) matches upstream `EX/…/App.tsx` L4584-4660, except that it loads fonts on every platform, not just Safari |

## 2. Library import in the plugin

### Two ways to install

**(a) Library menu import, the same as upstream.** The Excalidraw library sidebar and its "Open" item are the fork's
unchanged upstream UI, and `library.ts` is identical. So `parseLibraryJSON` → `restoreLibraryItems` → `mergeLibraryItems`
work exactly as #2 describes. That covers v2 envelope checks, `status` default `"unpublished"`, new items going first, and
dedupe by element `id` + `versionNonce` (which needs valid `index`). The plugin passes the result to its `onLibraryChange`
(`PL/src/view/components/ExcalidrawRoot.ts` L193-194).
The fork only changes **export**: it writes `my-obsidian-library.excalidrawlib` itself
(`FK/packages/excalidraw/components/LibraryMenuHeaderContent.tsx`, `onLibraryExport`).

**(b) Drop the file into the library folder (plugin only, recommended).** Since plugin 2.26.2 the stencil library is
stored as vault files (`PL/src/shared/Dialogs/Messages.ts` L161-165, release note: *"Stencil libraries can now be stored as
vault files instead of `data.json`"*). `PL/src/core/managers/StencilLibraryManager.ts`:
- Folder: `settings.libraryFolderPath`, default **`Excalidraw/Libraries`** (`PL/src/core/settingsDefaults.ts` L499-501;
  L462-475). The user's own edits go to `local-library.excalidrawlib` in that folder.
- `loadFromVault` (L320-365) reads **every `*.excalidrawlib` directly in that folder**. It reads
  `data.libraryItems ?? data.library` and runs `restoreLibraryItems`. It does **not** call `isValidLibrary`, so `type`/`version` aren't checked there.
  Items from files other than the local file are forced to `status: "published"`.
- Dedupe across files is **by item `id` only**: the first occurrence wins and a console warning is logged (L351-358).
  The local file is read first, then the others in path order.
- The plugin watches `create`/`modify`/`delete`/`rename` in the folder and reloads open drawings' libraries,
  debounced to 300 ms (L50-80, L269-279). **So overwriting our file with a new Generator run updates the Library in place,
  with no duplicate items.**
- The settings text confirms this is intended: *"Folder for local-library.excalidrawlib and downloaded library files"*
  (`PL/src/lang/locale/en.ts` L74-76). Obsidian hides `.excalidrawlib` in the file explorer unless "Show all file types" is on.
- **Caveats.** (1) This only applies in `"vault"` storage mode. Fresh installs default to it. Users who had a `data.json`
  library are prompted to migrate and may have chosen "Keep using data.json" (`PL/src/core/managers/PluginSettingsManager.ts`
  L180-200). Those users must use route (a). (2) Changes the user makes in the UI are **written back to the item's source
  file** (`persistChanges`, L367-437). If they delete or edit one of our Symbols in the sidebar, our file is rewritten, and
  the next Generator install overwrites their change. Document this.
- Data on disk: the file stays a v2 `.excalidrawlib` and is rewritten by `createFileData`
  (`{type, version: 2, source: <plugin release URL>, libraryItems}`, L453-460).

### Does the id / index / versionNonce advice still hold?

Yes. Route (a) uses identical upstream code (verified at runtime, see below). Route (b) only needs **stable, unique item
`id`s**, which the Generator already emits. Valid `index` and deterministic `versionNonce` still matter for route (a), so keep them.

`#addLibrary=` one-click links: still blocked. `ALLOWED_LIBRARY_URLS` is unchanged in the identical `library.ts`.
The plugin sets `libraryReturnUrl: "app://obsidian.md"` (`PL/src/view/components/ExcalidrawRoot.ts` L186), but that only
matters for libraries.excalidraw.com.

## 3. Do the element-level findings still hold in the fork?

### (a) Pin targets and arrow binding: **holds**
`binding.ts`, `typeChecks.ts`, `dragElements.ts`, `elbowArrow.ts` and `linearElementEditor.ts` are byte-identical to
upstream `1919728`. `collision.ts` has the same logic. So everything in #3 carries over unchanged: only arrows bind, transparent
grouped ellipses are bindable, the smaller-inside candidate wins, `"inside"` keeps an exact `fixedPoint`, and elbow arrows always orbit.
- `COMPLEX_BINDINGS` is still `false` by default (`FK/packages/common/src/utils.ts` L1199-1206). It is read from
  `localStorage["excalidraw-feature-flags"]`, and the plugin never sets it (no reference in `PL/src`).
- At runtime (fork bundle): an `arrow` with `endBinding {mode:"inside", fixedPoint:[0.5,0.5]}` to a zero-opacity 10×10
  grouped ellipse survives `restoreElements(…, {repairBindings:true})`. The ellipse's `boundElements` are kept. The fork (like
  current upstream) normalises an exact-centre fixed point to `[0.5001, 0.5001]`. 0.18.1 kept `[0.5,0.5]` and added a legacy
  `focus: 0`.
- One fork extra, not needed: elements with `customData.isAnchored` keep their size when a group is resized
  (`FK/packages/element/src/resizeElements.ts`). The plugin uses it for anchored images. It is untested on pin targets, so don't use it.

### (b) Grid snapping on insert: **holds**
The library insert path is unchanged: `addElementsFromPasteOrLibrary` → `restoreElements(…, {deleteInvisibleElements:true})`
→ `duplicateAtSceneCoords` → `getGridPoint`, and all of these are identical (see table). The plugin's `DropManager.onDrop` only handles
Obsidian file, link and text drags, and lets other drops through to Excalidraw (`PL/src/view/managers/DropManager.ts`
L125-680), so a library drag isn't intercepted. The only plugin difference: **grid size and grid mode are per drawing**, kept in each drawing's
`appState` (`PL/src/shared/ExcalidrawData.ts` L884-904 migrates legacy grid fields), and users can change them (Script Library
"Set Grid" / "Toggle Grid"). Pins land on the grid only when the drawing's grid is a divisor of our pitch.

### (c) Text: **holds, with fork-specific fields**
- **Zero-size text is still deleted on placement.** Runtime: with `width`/`height` = 0, the fork keeps the text through
  *import* (4/4 elements; 0.18.1 already dropped it at import, 3/4) but marks it `isDeleted` at *placement* (3 left, the
  same as 0.18.1). The Generator must still write a non-zero `width`/`height`.
- The fork **keeps `rawText`** and adds `hasTextLink` (`FK/packages/excalidraw/data/restore.ts` L496, L572; upstream deletes
  `rawText`). A missing `rawText` becomes `""`, and the plugin then falls back to `text` (`PL/src/shared/ExcalidrawData.ts`
  L1044-1046, L1334-1339). **The Generator doesn't need to emit `rawText`.** Note: text placed in a plugin drawing is stored
  in the note's Markdown "Text Elements" section and parsed as Markdown. `[[…]]` turns into a link, but labels like `R?`
  or `10k` are unaffected.
- **Fonts**: the fork's `FONT_FAMILY` is upstream's plus `"Local Font": 4` (`FK/packages/common/src/constants.ts` L147-158). Runtime
  value: `{Virgil:1, Helvetica:2, Cascadia:3, "Local Font":4, Excalifont:5, Nunito:6, "Lilita One":7, "Comic Shanns":8,
  "Liberation Sans":9, Assistant:10}`. "Local Font" is a font file the user picks in plugin settings ("Enable local font
  option", `PL/src/lang/locale/en.ts` L1430-1437, registered by `PL/src/core/managers/FontManager.ts` L122-160). It is
  different on every vault, so **don't emit `fontFamily: 4`**. The picker gets a 4th default, Lilita One
  (`FK/packages/excalidraw/components/FontPicker/FontPicker.tsx` L43-68). Every font #2 lists is still available with the
  same line heights (`font-metadata.ts` identical).
- **Custom fonts**: only through "Local Font" (one per vault) and CJK downloads. There is no way to ship a font inside the Library.

### Fork-only: orphan group ids are pruned
`restoreElements` now runs `pruneOrphanGroupIds` (`FK/packages/excalidraw/data/restore.ts` L898-933, L1057). It removes any
`groupIds` entry that only one non-deleted element has. Runtime: a one-element item with `groupIds:["solo-g"]` comes back
with `[]` (0.18.1 keeps it). For multi-element Symbols nothing changes. For a Symbol drawn as one element, the group
is meaningless anyway.

## 4. Plugin-only options: Excalidraw Automate and scripts

**What EA is**: a JS API (`ExcalidrawAutomate`, `PL/src/shared/ExcalidrawAutomate.ts`, typed in
`PL/docs/API/ExcalidrawAutomate.d.ts`). The Script Engine runs it from `.md` or `.js` files in the Scripts folder (default
`Excalidraw/Scripts`, `PL/src/core/settingsDefaults.ts` L508). Scripts run from the command palette, a hotkey, the
toolbar, a startup script or a sidepanel (`PL/docs/ExcalidrawScriptsEngine.md`, "EA script execution lifecycles").

What EA can do for us:

| Capability | Source | Use |
|---|---|---|
| `addLine`, `addEllipse`, `addRect`, `addText`, `addToGroup`, `ea.style` (roughness, stroke, fontFamily…) | `ExcalidrawAutomate.ts` L2351-2737, L1261, L870 | Draw a Symbol at runtime from the same definitions |
| `addElementsToView(repositionToCursor, save, newElementsOnTop)` | L4112 → `ExcalidrawView.addElements` (`PL/src/view/ExcalidrawView.ts` L5103-5260) | Insert into the open drawing. **Text is re-measured on insert** (`refreshTextDimensions`, L5143), so the zero-size text pitfall goes away. Repositioning centres on the cursor (`repositionElementsToCursor`, `PL/src/utils/excalidrawElementUtils.ts` L187-212) **without grid snap**. The script must round to `getExcalidrawAPI().getAppState().gridSize` itself. Ids are taken as given (default `nanoid()`), so each insert needs fresh ids |
| `addArrow(points, {startObjectId, endObjectId, startBindMode/endBindMode: "inside"\|"orbit", startFixedPoint, endFixedPoint, elbowed})` | L2759-2895 | **Wire helper**: create a wire already bound `"inside"` to two pin targets at `[0.5,0.5]`, which means exact attachment with no orbit gap. Use with `copyViewElementsToEAforEditing(getViewSelectedElements())` (L3846) on two selected pin targets |
| `connectObjects`, `connectObjectWithViewSelectedElement` | L3175, L4017 | Connect two objects by connection side (top/bottom/left/right). Less precise than `addArrow` with fixed points |
| `getExcalidrawAPI()` → fork's `ExcalidrawImperativeAPI.updateLibrary` | L3472. `FK/packages/excalidraw/types.ts` L1434 | A script could install or refresh the Library programmatically |
| Hooks `onDropHook`, `onPasteHook`, … | L4310-4566 | Could post-process inserts, for example snapping. That is invasive, so we don't need it |

There is nothing pin-specific in the plugin. The closest Script Library entries are "Connect elements" (arrow between the largest
elements of two selected groups), "Elbow connectors", "Add Connector Point" (adds a small circle next to selected text),
and "Icon Library" (a sidepanel that inserts *drawings as SVG images*, which are not editable Symbols) (`PL/ea-scripts/`).

**Verdict on EA as a Generator route.** EA is viable but secondary:
- *For it*: it uses the same primitives as our Generator. Text is measured on insert. The script controls grid snapping exactly. It
  can create **bound wires**, which is the one thing a static Library can't do. And it runs inside the user's actual tool.
- *Against it*: it is Obsidian-only. Neither excalidraw.com nor the map's "importable Library" goal benefits. Insertion
  from a command or hotkey is worse to browse than the library sidebar with thumbnails and search. Users must install and trust a
  script, which runs JS with vault access. Ids and grid snapping become our code's job, not Excalidraw's.
- *Recommendation*: keep the **static `.excalidrawlib` as the Library**, installed by dropping it into `Excalidraw/Libraries/`.
  Treat an EA **"Wire selected pins"** script (select two pin targets → `addArrow` with `"inside"` bindings, no arrowheads,
  roughness 0) as an optional add-on after the Proof. It fixes failure modes 1, 2 and 4 from #3 (Line tool, orbit gap,
  wrong target). Don't build a script-based Symbol inserter.

## Earlier findings: status in the plugin

| Earlier finding | Status | Note |
|---|---|---|
| #2 v2 envelope `{type, version:2, source, libraryItems}`, item `{id, status, created, name, elements}` | **Holds** | Same parser. Folder loading also reads it (without type/version checks) |
| #2 `restoreElement` fills defaults; set `roughness:0`, `strokeWidth`, colours explicitly | **Holds** | Fork adds `rawText:""`, `hasTextLink:false`. Nothing to emit |
| #2 zero-size text deleted on placement | **Holds** | Fork keeps it at import and deletes it at placement. Same result |
| #2 groups regenerated on placement; any stable group id works | **Holds, with a difference** | Single-member group ids are pruned by the fork |
| #2 dedupe needs valid `index` + deterministic `versionNonce` | **Holds** for menu import | Folder install dedupes by item `id` only |
| #2 one-click `#addLibrary` links unusable | **Holds** | |
| #2 grid snap aligns bbox top-left (labels included) | **Holds** | Grid size is per drawing in Obsidian |
| #2 `fontFamily` table and line heights | **Holds, plus 4 = Local Font** | Don't emit 4 |
| #2 dark mode via invert filter | **Unknown (not checked)** | Plugin has extra dark-mode handling for images only (`customData.invertBitmapInDarkmode` in fork types). Not relevant to vector Symbols. Confirm in the Proof |
| #2 skeleton API needs DOM, so write plain JSON | **Holds** | Fork bundle also needs jsdom + React globals in Node |
| #3 only arrows bind; transparent grouped ellipse pin targets; `"inside"` fixed point | **Holds** | Identical source. Runtime restore check passes |
| #3 `COMPLEX_BINDINGS` off → `_simple` strategy, Alt forces inside | **Holds** | Same flag default, not set by plugin |
| #3 elbow arrows always orbit | **Holds** | |
| #3 failure modes (Line tool, orbit gap, wrong target…) | **Holds** | An EA "wire pins" script can avoid 1, 2 and 4 |
| #4 no existing electronics Library worth adopting; generate our own | **Holds** | Plugin Script Library has no electronics or pin tooling |
| #4 placement maths (`duplicateAtSceneCoords` + `getGridPoint`) | **Holds** | Identical files |
| Browser behaviour (actual insert, drag, rotate in the app) | **Unknown** | Still for the Proof, now in Obsidian |

## Verification

Node 26.7, jsdom, stubs for canvas 2D, `FontFace` and `document.fonts`, and `React`/`ReactDOM`/`ReactJSXRuntime` globals.
The fork bundle `dist/obsidian/excalidraw.production.min.js` was loaded as-is. (Its `dist/prod` ESM build imports unpublished
`@excalidraw/common` and `@excalidraw/element` packages and does not bundle, so that path doesn't work.) The fixture is the #2
section 6 lamp item plus one zero-opacity 10×10 pin-target ellipse. Import used `loadLibraryFromBlob` (the menu "Open"
path) and placement used `restoreElements(…, {deleteInvisibleElements:true})`.

| Check | fork 0.18.140 | upstream 0.18.1 |
|---|---|---|
| import: items / elements | 1 / 4 | 1 / 4 |
| pin target after import | opacity 0, grouped, transparent | same |
| placement: non-deleted elements | 4 | 4 |
| common bounds top-left | (-5, -24) | (-5, -24) |
| zero-size text: after import / after placement | 4 / **3** | 3 / **3** |
| re-import with `index`+`versionNonce`: merged count; nonces equal | 1; true | 1; true |
| re-import without them: merged count | 2 (duplicates) | 2 |
| `fontFamily: 4` kept | yes | yes |
| one-element item, `groupIds:["solo-g"]` | **`[]`** | `["solo-g"]` |
| inside-bound arrow to pin target after `repairBindings` | kept, `fixedPoint [0.5001,0.5001]` | kept, `[0.5,0.5]` + `focus:0` |

Not verified: the vault-folder loader (`StencilLibraryManager`) and EA were read from source, not run, because they need
a live Obsidian. The Proof should drop the file into `Excalidraw/Libraries/`, insert a Symbol with the grid on, and bind an
arrow to a pin.
