# libraries.excalidraw.com: listing requirements and install paths

Answers issue #39 (part of the deployment map, #38). Researched 2026-10-01.

Sources, with the short prefixes used below:

- `LIB/` = [`excalidraw/excalidraw-libraries`](https://github.com/excalidraw/excalidraw-libraries/tree/297a349eaff859e678f78d4dbc8e68df5fce42e5)
  at `297a349` (main, 2026-09-03). This repo *is* the site: `index.html` + `script.js` render `libraries.json`.
- `EX/` = [`excalidraw/excalidraw`](https://github.com/excalidraw/excalidraw/tree/1919728724a1b71af73cb7e6d2d1a418a1415b1c)
  at `1919728` (master, 2026-09-30), the same commit used in `research/excalidraw-lib-format.md`.
- `FK/` = [`zsviczian/excalidraw`](https://github.com/zsviczian/excalidraw) at `5ddd0e5` (the fork the plugin bundles).
- `PL/` = [`zsviczian/obsidian-excalidraw-plugin`](https://github.com/zsviczian/obsidian-excalidraw-plugin) at `128a9ef`
  (`manifest.json` version 2.28.1). Cross-checked against the installed bundle
  `~/personal-library/.obsidian/plugins/obsidian-excalidraw-plugin/main.js` (2.28.1).
- GitHub PR data for `excalidraw/excalidraw-libraries`, via `gh` on 2026-10-01.

## TL;DR

- **Listing = one PR to `excalidraw-libraries`.** Each entry in `libraries.json` points at exactly **one**
  `.excalidrawlib` file plus **one** preview image. You submit it with the "Publish" dialog in excalidraw.com's library
  menu, which makes the bot open the PR for you, or by opening the PR yourself.
- **Rules:** English only; at least 3 related items in one category; every item must have a **name**; items that have
  several elements should be grouped; nothing trivial, nothing personal-only, nothing copied. Submitting means
  publishing under **MIT**. Required `libraries.json` fields: `name, description, authors, source, preview, created,
  updated, version` (CI checks this).
- **Review is the bottleneck.** On 2026-10-01 there were **1,821 open PRs** and only **4 merged in the previous 12
  months**. Merged bot PRs waited anywhere from same-day to about a year. Plan as if a listing may never happen.
- **Two files means two listings**, since `source` is a single file. The other option is to merge the two into one file.
  21 authors already have several listings.
- **Plain Excalidraw install:** "Add to Excalidraw" opens `excalidraw.com/#addLibrary=<url>&token=…`. The editor fetches
  the file, which is allowed because `libraries.excalidraw.com` matches the `excalidraw.com` allow-list. It asks
  for confirmation if the token isn't its own, then **merges** the file into the browser's library.
- **Obsidian plugin 2.28.1:** "Browse libraries" opens the site, but **nothing in the plugin handles the
  `#addLibrary` return link** (`referrer=app://obsidian.md`). The working routes are: **Download** the file and either
  drop it into the vault library folder (`Excalidraw/Libraries/` by default) or import it with the library menu.
- **Where it goes:** in the default `"vault"` storage mode, a file in the folder stays a separate file, read-only
  ("published"). Items imported from the menu are **copied into `local-library.excalidrawlib`**. In legacy
  `"data-json"` mode the whole library is stored in `library2` inside the plugin's `data.json`.
- **Re-installs:** merging never replaces anything. An item is skipped only if every element's `id` + `versionNonce`
  matches an existing item. Unchanged items are de-duplicated (given our deterministic ids, nonces and indices), and any
  **changed item is added next to the old one** (excalidraw.com). In Obsidian vault mode it can even be **dropped**
  (see 3.3). **Overwriting the file in the vault library folder is the only real in-place update.**

## 1. What libraries.excalidraw.com requires

### 1.1 Guidelines (`LIB/README.md` L23-35)

1. Not only for personal use. 2. Not trivially easy to draw yourself (no lone arrow or square). 3. No copies from other libraries
without significant changes. 4. **English only**: labels, title and description. 5. Each item usable on its own.
6. **At least 3 items, all related (one category).** 7. Items made of several elements should be grouped. Reviewers may
ask for changes.

### 1.2 The submission dialog (excalidraw.com library menu, "Publish")

| Fact | Source |
|---|---|
| Every selected item must have a name, or submission is blocked ("Each library item must have its own name so it's filterable") | `EX/packages/excalidraw/components/PublishLibrary.tsx` L258-276; `EX/packages/excalidraw/locales/en.json` L516 |
| Required form fields: library name, description, author name. Optional: GitHub handle ("so you can edit the library once submitted"), Twitter, website | `PublishLibrary.tsx` L420-500; `en.json` L505 |
| Preview image is **generated automatically**: a grid of 128px boxes, 6 per row | `PublishLibrary.tsx` L38-44 (`generatePreviewImage`) |
| Posts the v2 `.excalidrawlib` blob, preview, and fields to `${VITE_APP_LIBRARY_BACKEND}/submit` (a Cloud Function), which answers with a tracking URL | `PublishLibrary.tsx` L278-330; `EX/.env.production` L6-7 |
| **Licence: "By submitting, you agree the library will be published under the MIT License"** | `en.json` L515; `LIB/LICENSE` is MIT |
| "Manually approved first … You will need a GitHub account to communicate and make changes if requested" | `en.json` L514 |
| Resubmitting items already marked published: "only resubmit items when updating an existing library or submission" | `en.json` L518 |

The backend then opens a PR as `excalibot`, titled `feat: new library <name>`. The PR adds
`libraries/<author>/<slug>.excalidrawlib`, `libraries/<author>/<slug>.jpg` and an entry in `libraries.json`. Its body
contains an installation link pointing at the PR branch on `raw.githubusercontent.com/excalidraw/excalidraw-libraries`,
so reviewers can test it. Example: [PR #2906 "Electrical Symbols"](https://github.com/excalidraw/excalidraw-libraries/pull/2906).

### 1.3 `libraries.json` entry and CI

- CI (`LIB/.github/workflows/validate-libraries.yml` → `LIB/scripts/validate-libraries.js` L30-43) requires non-empty
  `name, description, version, source, preview, created, updated, authors`, and that `id` is unique when present.
- A second workflow (`process-libraries.yml` → `LIB/scripts/gen-item-names.mjs` L50-64) regenerates `itemNames`
  from each v2 file's `libraryItems[].name`. The site shows those names in the card and uses them in search (`LIB/script.js` L137,
  L239-242). **So item names are our search keywords on the site.**
- `source` is a single path under `libraries/` (the file), and `preview` a single `.jpg`/`.png`. In the current
  data, 156 previews are jpg, 76 png. Seen in practice: anywhere from 1 item up to 249 items (AWS), and files up to about 5 MB. No
  hard item-count or size limit in CI.
- The site serves the file straight from the repo at `https://libraries.excalidraw.com/libraries/<source>`
  (`LIB/script.js` L225, L262-269), so a merge to `main` puts it live.

### 1.4 Review throughput (GitHub data, 2026-10-01)

- Open PRs: **1,821** (`search: repo:excalidraw/excalidraw-libraries is:pr is:open`).
- Merged since 2025-09-30: **4**. Recent merges: #2639 (opened 2026-05-31, merged 2026-09-03), #2332 (same day),
  #2105 (same day), #2084 (2025-09-04 → 2026-06-18), #2034 (2025-07-12 → 2026-07-13).
- Several electrical libraries are already listed (from 2021-22): "Schematic Symbols", "Circuit Components",
  "Electrical Engineering". Another, "Electrical Symbols" (#2906), sits in the queue.

### 1.5 Updates to a listed library

There's no separate update flow. Updates come in as PRs that replace the `.excalidrawlib` and preview and bump `updated`
in `libraries.json`. Examples: [#1159 "Update ITLogos"](https://github.com/excalidraw/excalidraw-libraries/pull/1159),
which bumps `"updated": "2023-03-21"` → `"2023-11-07"`, and
[#1879 "updates library Kafka Streams…"](https://github.com/excalidraw/excalidraw-libraries/pull/1879).
Both were opened by hand by the authors. Every update goes through the same review queue. The site shows "Updated:" when
`created !== updated` (`LIB/script.js` L256-260).

### 1.6 One submission or two?

Each listing has **one `source` file** (`libraries.json` schema; `gen-item-names.mjs` reads exactly one file per
entry). So `electronics-schematic.excalidrawlib` and `electronics-rf-blocks.excalidrawlib` need **two listings**,
unless we merge them into one file. 21 authors already have more than one listing (e.g. `lipis`, `youritjang`,
`dwelle`). Both of our files clear the "≥3 related items in one category" bar on their own.

## 2. Installing from the site in plain Excalidraw

1. The library menu's "Browse libraries" link opens
   `libraries.excalidraw.com?target=<window.name>&referrer=<app URL>&useHash=true&token=<editor id>&theme=…&version=2`
   (`EX/packages/excalidraw/components/LibraryMenuBrowseButton.tsx` L16-26).
2. Each card's **"Add to Excalidraw"** button links to `${referrer}#addLibrary=<encoded file URL>&token=<token>`. Its
   **"Download"** button links to the raw file (`LIB/script.js` L211-219, L263-269; `LIB/index.html` L165-177).
   With no `referrer`, the default is `https://excalidraw.com`.
3. In the app, `useHandleLibrary` (wired in `EX/excalidraw-app/App.tsx` L446) picks up the hash, both at start-up and on
   `hashchange` (`EX/packages/excalidraw/data/library.ts` L677-800):
   - `validateLibraryUrl` only allows hosts ending in `excalidraw.com` or the path
     `raw.githubusercontent.com/excalidraw/excalidraw-libraries` (L54-58, L497-528). `libraries.excalidraw.com/libraries/…`
     passes. **Our own GitHub release URLs do not**, which is why one-click links are only possible once we're listed.
   - If `token !== excalidrawAPI.id` (another tab, or a link from somewhere else), it asks first: "This will add N shape(s) to
     your library. Are you sure?" (L741, `en.json` L287).
   - `updateLibrary({ merge: true, defaultStatus: "published", openLibraryMenu: true })` (L754-760), where
     `merge` → `mergeLibraryItems(current, incoming)` (L336-337).
4. Persistence on excalidraw.com is the browser's IndexedDB (`LibraryIndexedDBAdapter`, `App.tsx` L446-451).

**Merge semantics** (`EX/packages/excalidraw/data/library.ts` L122-158): an incoming item is dropped only if an existing
item has the same element count and the same `id` **and** `versionNonce` for every element, in order.
Library-item `id` isn't compared. New items go to the **front**. Nothing is ever replaced or removed. So:

- Re-adding an **unchanged** file: no duplicates, as long as `id`/`index`/`versionNonce` are deterministic
  (`research/excalidraw-lib-format.md` §4; our Generator already emits them).
- Re-adding an **updated** file: changed items show up **as well as** their old versions. The user has to delete the
  old ones by hand. Unchanged items are skipped.

## 3. The Obsidian Excalidraw plugin 2.28.1

### 3.1 "Browse libraries" doesn't round-trip

- The plugin passes `libraryReturnUrl: "app://obsidian.md"` to the editor (`PL/src/view/components/ExcalidrawRoot.ts`
  L186). The fork's browse button uses it as `referrer` (`FK/packages/excalidraw/components/LibraryMenuBrowseButton.tsx`
  L17-41) and adds a link to a video explaining libraries (`https://youtu.be/P_Q6avJGoWI?t=127`).
- The site then builds "Add to Excalidraw" as `app://obsidian.md#addLibrary=…`. **Nothing in the plugin listens for
  it.** There is no `useHandleLibrary` / `parseLibraryTokensFromUrl` / `addLibrary` / `hashchange` anywhere in `PL/src`,
  and `addLibrary`, `useHandleLibrary` and `parseLibraryTokensFromUrl` each appear 0 times in the installed `main.js`. The fork
  only *exports* the hook (`FK/packages/excalidraw/index.tsx` L514). It's never mounted. An `app://` URL also can't be
  opened from an external browser. **So in Obsidian, "Add to Excalidraw" does nothing useful. Users need "Download".**
  (Read from source and the bundle, not clicked through in a live Obsidian.)

### 3.2 Where the library lives

Defaults: `libraryStorageMode: "vault"`, `libraryFolderPath: "Excalidraw/Libraries"`, `libraryFileName: "local-library"`,
`libraryMigrationStatus: "not-required"` (`PL/src/core/settingsDefaults.ts` L499-502; the same literals are in the
installed `main.js`. The test vault `~/personal-library` uses exactly these values).

- **Vault mode** (`PL/src/core/managers/StencilLibraryManager.ts`):
  - Loads **every** `*.excalidrawlib` directly in the folder (not subfolders). `local-library.excalidrawlib` comes first,
    then the rest by path (L320-365). Folder files get `status: "published"`, local-file items `"unpublished"`.
    Duplicate item ids: "keeping the first occurrence" (L352-357).
  - Watches vault create/modify/delete/rename in that folder and reloads every open view (debounced). It uses
    `updateLibrary({merge:false})`, so the folder contents **replace** the in-editor library (L50-84, L155-174, L269-279).
  - Edits made in the editor are written back to the file each item came from. **Brand-new item ids (e.g. from a library-menu
    import) are added to `local-library.excalidrawlib`** (L367-437). The settings text says the folder is meant for
    "local-library.excalidrawlib and downloaded library files" (`PL/src/lang/locale/en.ts` L75-76).
  - Obsidian hides `.excalidrawlib` in its file explorer unless "Show all file types" is on (same string). Obsidian
    Sync only syncs these files with "Sync all other types" (L60-61).
- **Legacy `data-json` mode** (chosen when a user picked "Keep using data.json" at the migration prompt): the whole
  library is saved as `settings.library2` in `.obsidian/plugins/obsidian-excalidraw-plugin/data.json`
  (`StencilLibraryManager.ts` L99-104, L124-127; `PL/src/core/main.ts` L1053-1070).

### 3.3 Re-installing an updated Kit in Obsidian

| Route | Result |
|---|---|
| **Overwrite** `Excalidraw/Libraries/electronics-schematic.excalidrawlib` with the new file (same name) | **Replaced in place.** The modify event reloads the folder, and old items are gone because the file is re-read (L50-84, L320-365) |
| Library menu → Open/import the new file, when the old version came from the folder file | `mergeLibraryItems` adds changed items next to the old ones. In memory, both share the same item `id`. `persistChanges` keys by item id (`nextById`, L374-391): the new copy isn't treated as an addition, and the old copy matches itself. **So the update isn't saved, and after a reload only the old version is left.** (From reading the code, not run) |
| Library menu → Open/import, when the old version also came from a menu import (so it's in `local-library`) | Same id collision as above: changed items don't stick. Unchanged items are de-duplicated |
| Import from the menu first, then also drop the file into the folder | Same ids in two files: `local-library` loads first and wins (L334-337, L352-357), so the **old** copy stays visible |

## 4. What this means for deploying the Kit

1. **Don't make libraries.excalidraw.com the main channel.** Given the queue (1,821 open, about 4 merges a year), a listing is a
   bonus for discovery, not a delivery route. The main channel should be our own GitHub release assets plus README steps.
2. **Obsidian install instructions (main audience):** download both `.excalidrawlib` files and put them in the
   plugin's library folder (`Excalidraw/Libraries/` by default; check Settings → Excalidraw → Stencil Library). For an
   update, **overwrite the files with the same names**. Warn against importing them with the library menu ("Open"), and
   against doing both, because that copies the items into `local-library` and later updates won't stick. Users in legacy
   data.json mode have to use the menu import, and to update they must delete the old Kit items first.
3. **If we do submit:** it takes **two submissions** (schematic, RF blocks). The alternative is one merged file, which
   would cut the Obsidian folder story down to one file too. Every item needs an English `name` (we already have them;
   they become the site's search terms). Items have to be grouped. Content must be **MIT**. The repo has **no LICENSE
   file** today, so pick one compatible with that first (any fonts are not part of the library files). Use the Publish dialog on excalidraw.com,
   loading our generated file and giving a GitHub handle, or open the PR ourselves (`libraries/<handle>/<slug>.excalidrawlib`,
   a preview `.jpg`/`.png`, and a `libraries.json` entry with the required fields).
4. **Updates after listing** are hand-made PRs (replace file + preview, bump `updated`) in the same queue. Plain-Excalidraw
   users who re-add an updated listing get **duplicates of every changed Symbol**. Keeping element `id`s,
   `index` and `versionNonce` deterministic and unchanged for unchanged Symbols keeps that to the Symbols that actually
   changed. Release notes should tell users to delete the old copies.
5. A listing is the **only** way to get one-click `#addLibrary` install links, and those work in the browser apps
   (excalidraw.com, Excalidraw+), **not in Obsidian**.

## Not verified

- The Obsidian behaviour was read from `PL/` source and checked against strings in the installed bundle. It wasn't run.
  That covers the "Add to Excalidraw" dead end, folder reloads, and the item-id collision when re-importing from the menu.
- The `…/libraries/submit` Cloud Function isn't public. What it does (bot PR, paths, `.jpg` preview) is inferred
  from the PRs it opens.
