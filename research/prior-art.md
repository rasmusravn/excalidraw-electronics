# Prior art: Excalidraw electronics libraries and generators

Research for [#4](https://github.com/rasmusravn/excalidraw-electronics/issues/4) (part of map #1). Surveyed 2026-10-01.

## Answer

**Generate our own. Don't adopt or extend an existing Library.** No published library has IEC Symbols, RF Block symbols, editable labels, or pins on the 20px grid relative to the item's bounds. The closest one (rkjc "Schematic Symbols") is ANSI, unnamed, gets grid alignment right for only about 70% of its pins, and has no RF content. All of them are MIT, so we may borrow geometry ideas, but there is little worth copying.

**Proven Generator approach:** write Symbols as code from geometric primitives (line, ellipse, rectangle, text). Emit `{"type":"excalidrawlib","version":2,"libraryItems":[…]}` directly as JSON, with deterministic ids and seeds and one shared groupId per item, then validate by reading the file back. `mds08011/excalidraw-water-wastewater` (TypeScript, MIT) is a recent, close match for this approach in another engineering domain. SVG-to-Excalidraw converters are also proven, but they suit icon sets, not grid-exact schematic Symbols.

**Pin wiring:** no existing library binds wires to pins. The only working approach is the one rkjc's library describes: size the Symbol so its pins land on the grid. Excalidraw's insert code makes this exact. See "How Excalidraw places a library item" below.

## Existing libraries on libraries.excalidraw.com

The index is `libraries.json` in [excalidraw/excalidraw-libraries](https://github.com/excalidraw/excalidraw-libraries) and holds 232 libraries. I searched name and description for electr/circuit/schemat/resistor/RF/radio/antenna/transistor/amplif/signal and found the candidates below. I downloaded each `.excalidrawlib` from `libraries/<author>/` and inspected its JSON with a script. The script checked roughness, colours, element types, groups, bindings and pin alignment. A pin here is a line endpoint that touches the item's bounding box.

| Library (source path) | Items | Coverage | Standard | Style | Pins on 20px grid¹ | Names |
|---|---|---|---|---|---|---|
| **Schematic Symbols**, `rkjc/schematic-symbols` (2021) | 24 | DC/battery source, ground, resistor, inductor, speaker, switches (SPST, SPDT, push, relay contacts), junction dot, jumper, capacitor ±, diode, LED, NPN/PNP BJT, N/P MOSFET, motors, lamp | **ANSI** (zigzag R, curved-plate C) | roughness 0, black, **solid black/white fills** (filled diode, BJT arrows) | 43/61 edge endpoints; item sizes are mostly multiples of 20 (80×180, 120×40, 160×40…). Description: "sized so that when snapped to the grid, lines and arrows will snap to the connections" | none (v1 format, items unnamed) |
| **Circuit Components**, `mppowell/circuit-components` (2022) | 24 | R (zigzag and box "Generic Passive"), pot ×2, C, polarised C ×2, L, diode, LED, NMOS/PMOS, SPST/SPDT switch, battery, DC/AC/current/generic source, Vdd, ground ×2, op-amp, generic amp | mixed, mostly **ANSI** | **roughness 1 (sketchy)**, black, hachure | 27/70, not grid-sized (e.g. 105.3×48.7) | yes |
| **Electrical Engineering**, `risjain/electrical-engineering` (2022, from Obsidian) | 15 | power one-line: PV panel, transformers, CT/PT, bus bar, breaker, relay, ABC↔DQ0, R, L, ground, AC source, capacitor bank | power-systems (ANSI-ish) | roughness 0, fontFamily 2 | 16/39, not grid-sized | yes |
| **Digital Signal Processing**, `robin-muller/digital-signal-processing` (2022) | 8 | add, subtract, multiply, divide, gain, shift L/R, storage | DSP block notation | roughness 1–2 | 1/6 | yes |
| **Logic Gates**, `thebrahmnicboy/Logic-Gates` (2021) | 10 | logic gates (out of scope for us) | ANSI distinctive shapes | roughness 1 | **86/86**, all items 220×80 | none (v1) |
| **logic gates**, `aarondiel/logic-gates` (2022) | 7 | logic gates | ANSI | roughness 0, solid fills | 7/34 | yes |

¹ Endpoints touching the item bounding box that lie on a common 20px lattice. Pins must also sit on multiples of 20 from the bbox top-left. See below.

Other index entries such as Arduino Boards, Raspberry Pi, Network elements, Fibre Network and Computers are board or device pictures, not Schematic or Block symbols. **No library has RF Block symbols** (LNA, mixer, filter, oscillator, coupler, antenna, ADC). The DSP summer and multiplier circles come closest. **None uses IEC 60617.** The only IEC-looking Symbol is mppowell's box "Generic Passive", drawn sketchy.

**Labels:** no electronics library has editable reference designator or value text. The only text is `+`/`−` polarity marks and fixed captions such as "CB" and "Relay".

**Wires/bindings:** none of these libraries uses `boundElements` or `startBinding`/`endBinding` for pins. risjain's 4 bound elements are text-in-container. Grid snapping is the only proven way to connect wires, and only rkjc and thebrahmnicboy rely on it on purpose.

**Licence:** libraries submitted through Excalidraw's publish dialog are released under MIT. The dialog says: "By submitting, you agree the library will be published under the MIT License" (`packages/excalidraw/locales/en.json`, key `publishDialog.noteLicense`, linking the excalidraw-libraries [LICENSE](https://github.com/excalidraw/excalidraw-libraries/blob/main/LICENSE)). The repo's licence is MIT according to the GitHub API. Reuse is therefore legally fine with attribution. The repo's README guideline 3 says "Don't republish (copy/paste) items from other libraries without making any significant changes". That only matters if we ever publish there, which #1 rules out.

## How Excalidraw places a library item (source-verified)

`App.addElementsFromPasteOrLibrary` calls `duplicateAtSceneCoords` in `packages/excalidraw/components/App.duplicate.ts`. That function takes `getCommonBounds(elements)` → `[minX, minY, …]`, centres the item on the cursor, and passes the offset through `getGridPoint(dx, dy, getEffectiveGridSize())`. It then sets each element to `x: element.x + gridX - minX`. **When grid mode is on, the item's bounding-box top-left lands on a grid point.** So the Generator's rule is:

> Every pin end must be at a multiple of 20px from the Symbol's common bounding-box top-left. This includes the editable label text, which is part of the group and therefore part of the bounds.

Absolute coordinates in the file don't matter. Labels matter a lot: a label that sticks out above or left of the body shifts `minX`/`minY` and breaks pin alignment, unless its bounds also start on the lattice. Note for the "Text behaviour" and "Pin binding" sections of #1: either keep labels within the extent the pins define, or pad and snap the bbox origin on purpose (for example with a transparent, grid-sized frame element).

Import is permissive. `parseLibraryJSON` (`packages/excalidraw/data/blob.ts`) accepts `type: "excalidrawlib"` with `version` 1 (`library: Element[][]`) or 2 (`libraryItems: [{id,status,created,name,elements}]`), then runs `restoreLibraryItems`/`restoreElements`, which fill in missing defaults. Emit v2 so items get names.

## Generators that produce `.excalidrawlib`

Found with GitHub repo and code search (`excalidrawlib`, `svg to excalidraw`, `excalidraw circuit/electronics/schematic/electrical`). None targets electronics.

| Project | Language / licence | Approach | Relevance |
|---|---|---|---|
| [mds08011/excalidraw-water-wastewater](https://github.com/mds08011/excalidraw-water-wastewater) | TypeScript, MIT, active 2026 | **Primitive factories → library JSON.** `src/primitives.ts` provides `rect`, `circle`, `line`, `arrow`, `textCentered`… with shared style tokens (`style.ts`: INK, stroke widths, font). Each symbol is one file exporting `SymbolDef {name, description, elements}`. `build.ts` assigns **deterministic** ids, seeds and nonces (FNV-1a of symbol name and index), sets one groupId per item and fixed `created`/`updated` for stable diffs, then validates, writes the `.excalidrawlib`, renders SVG previews and a README, and **re-reads and re-validates (round-trip)**. ~68 P&ID/civil symbols. | **Closest model for our Generator.** It is an engineering-symbol library with the same architecture we want. Missing: grid/pin rules and labels as editable fields. |
| [wictorwilen/fluentui-icons-to-excalidraw](https://github.com/wictorwilen/fluentui-icons-to-excalidraw) | Python + TS, MIT | Fetch SVGs → `svg_to_excalidraw.py` / `path_parser.py` → `combine_excalidraw.py` builds libraries | Shows the SVG-conversion route at scale. Not grid-exact. |
| [excalidraw/svg-to-excalidraw](https://github.com/excalidraw/svg-to-excalidraw) | TypeScript, MIT (official org, last push 2024) | Parses SVG and turns paths into Excalidraw elements (bezier/ellipse sampling) | Possible route if we ever wanted KiCad/IEC SVGs as input. Paths become sampled polylines, so it doesn't give clean pins. |
| [giuseppe-ro/excalidraw-svg-to-lib](https://github.com/giuseppe-ro/excalidraw-svg-to-lib), [amattas/microsoft-excalidraw](https://github.com/amattas/microsoft-excalidraw), [alexbarbato/excalidraw-tanzu](https://github.com/alexbarbato/excalidraw-tanzu) (`create_lib.py`), glincker/thesvg (`src/scripts/generate-excalidraw-libraries.ts`) | Python / TS | SVG or icon set → library | Same SVG route, applied to logo and icon sets. |
| `@excalidraw/excalidraw` exports `convertToExcalidrawElements` (skeleton API) and `serializeLibraryAsJSON` (`packages/excalidraw/index.tsx`) | TS | Official helpers that turn minimal element skeletons into full elements and serialise a library | An alternative to writing every element field ourselves. It pulls in the React package, and `restoreElements` already fills defaults on import, so plain JSON is enough. |

## Implications for the spec (#1)

- **Generate, don't adopt.** Library coverage overlaps only on common ANSI parts. IEC, RF Blocks, labels and the grid contract are all missing.
- **Copy the water-wastewater architecture:** primitives + per-Symbol definition modules + deterministic ids + round-trip validation + generated preview sheet. Add a pin list to each Symbol definition and a check that every pin is at a multiple of 20 from the bbox origin, labels included.
- **Style defaults to set explicitly:** `roughness: 0`, `fillStyle` irrelevant with `backgroundColor: "transparent"`, and a single ink colour. rkjc's solid black fills (diodes, arrows) are the one look choice to decide on deliberately for dark mode.
- **Emit v2 format** with `name` per item. The unnamed v1 libraries (rkjc, thebrahmnicboy) are hard to browse.
- **Validation hook:** Excalidraw's own `isValidLibrary` + `restoreLibraryItems` is the reference for "imports cleanly".
