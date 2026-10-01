# Excalidraw library file format and minimum element fields

Answers issue #2. Sources: `excalidraw/excalidraw` at commit
[`1919728`](https://github.com/excalidraw/excalidraw/tree/1919728724a1b71af73cb7e6d2d1a418a1415b1c)
(master, 2026-09-30). Paths below are relative to that commit (`EX/` =
`https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/`).
Behaviour was also checked by running the restore path from the npm package
`@excalidraw/excalidraw@0.18.1` (latest on npm) in Node. See "Verification" at the end.

## TL;DR

- Use **v2**: `{"type":"excalidrawlib","version":2,"source":…,"libraryItems":[…]}`.
  Each item is `{id, status, created, name?, elements[]}`. The legacy v1 `library`
  (an array of element arrays) still imports, but don't emit it.
- On import every element goes through `restoreElement`, which fills in nearly every
  missing field. In practice an element only **needs** `type`, `x`, `y`,
  geometry (`width`/`height`, plus `points` for line/arrow) and, for text, `text`,
  `fontSize` and `fontFamily`. Anything else we care about visually
  (`roughness: 0`, `strokeWidth`, `strokeColor`, `backgroundColor`) must be set
  explicitly, because the defaults are the sketchy style (`roughness` 1).
- **Pitfall:** text with `width` and `height` both 0 is **silently dropped** when the item is
  placed on the canvas. Nothing measures the text at insert time, so the Generator must
  write a non-zero `width`/`height` for each text element (`height = fontSize × lineHeight × lines`).
  An estimate for `width` is fine.
- Groups: share one id in each element's `groupIds`, ordered **deepest to
  shallowest**. Group ids (and element ids and seeds) are regenerated every time
  an item is placed, so any stable string works.
- `id`, `seed`, `version`, `versionNonce`, `updated`, `index`, `boundElements`
  can all be omitted. Recommended: emit deterministic `id`, `index`
  (`"a0"`, `"a1"`, …), `version: 1` and `versionNonce`. Re-importing an unchanged
  file is then de-duplicated instead of adding copies of every Symbol.
- When an item is placed with the grid on, the item's **bounding-box top-left** (text labels included)
  snaps to the grid. If every pin is at a multiple of 20 from that corner, the pins land on the 20px grid.
- `convertToExcalidrawElements` (skeleton API) does **not** run in plain Node.
  `@excalidraw/excalidraw` touches `window`, canvas and `FontFace` when the module loads. It ran only
  after bundling with esbuild and stubbing DOM APIs through jsdom. It also has a line-width bug (below).
  **Recommendation: have the Generator write the element JSON directly.** Excalidraw's
  own restore step normalises the rest on import.

## 1. File envelope

| Fact | Source |
|---|---|
| `type` must be `"excalidrawlib"`; `version` must be `1` or `2` or import throws `Invalid library` | `EX/packages/excalidraw/data/json.ts` L128-135 (`isValidLibrary`); `EX/packages/excalidraw/data/blob.ts` L218-228 (`parseLibraryJSON`) |
| Current version written by Excalidraw is 2 (`VERSIONS.excalidrawLibrary = 2`) | `EX/packages/common/src/constants.ts` L419-422 |
| Export shape: `{type, version, source, libraryItems}` | `EX/packages/excalidraw/data/json.ts` L137-145; type `ExportedLibraryData` in `EX/packages/excalidraw/data/types.ts` L52-57 |
| Import reads `data.libraryItems \|\| data.library` (`library` = deprecated v1) | `EX/packages/excalidraw/data/blob.ts` L226; `EX/packages/excalidraw/data/types.ts` L59-62 |
| MIME `application/vnd.excalidrawlib+json`, extension `excalidrawlib` | `EX/packages/common/src/constants.ts` L319, L350 |

`source` is not checked on import, so any string works. Use the repo URL.

### Library item (v2)

```ts
// EX/packages/excalidraw/types.ts L652-660
type LibraryItem = {
  id: string;
  status: "published" | "unpublished";
  elements: readonly NonDeleted<ExcalidrawElement>[];
  created: number;   // epoch ms
  name?: string;
  error?: string;
};
```

`restoreLibraryItems` (`EX/packages/excalidraw/data/restore.ts` L1381-1415):
- fills a missing `id` (random), `status` (the caller's default) and `created` (`Date.now()`);
- v1 items (bare arrays) are wrapped into v2 items;
- runs `restoreElements` on the elements and **drops the item if no elements
  remain** (`restoreLibraryItem`, L1374-1379).

**`status`** decides which panel section shows the item. `"unpublished"` goes under the user's own items
and `"published"` under the "Excalidraw library" section
(`EX/packages/excalidraw/components/LibraryMenuItems.tsx` L119-126). If the file gives no status, importing
it from disk (library menu "Open", or drag-and-drop) defaults to `"unpublished"`
(`EX/packages/excalidraw/data/library.ts` L287-298; call sites
`EX/packages/excalidraw/components/LibraryMenuHeaderContent.tsx` L160,
`EX/packages/excalidraw/components/App.tsx` L12191). Either value works.

**`name`** is used by the library search box (`LibraryMenuItems.tsx` L105-116) and as the
item's label (`LibraryMenuSection.tsx` L85). Set it, e.g. `"Resistor (IEC)"`.

**De-duplication on import:** a file import merges into the existing library. An
incoming item is skipped when an existing item has the same number of elements and the
same `id` + `versionNonce` for every element, in order (`isUniqueItem` /
`mergeLibraryItems`, `EX/packages/excalidraw/data/library.ts` L120-157). New items go
**first**. See section 4 for why `index` must be valid for this to work.

**One-click install links do not work for us.** `#addLibrary=<url>` only accepts URLs on
`excalidraw.com` or `raw.githubusercontent.com/excalidraw/excalidraw-libraries`
(`ALLOWED_LIBRARY_URLS`, `EX/packages/excalidraw/data/library.ts` L54-58, L497-520).
Users have to download the file and import it.

## 2. What happens to elements on import and on placement

1. **Import:** `restoreLibraryItem` calls `restoreElements(elements, null)`, which calls
   `restoreElement` for each element and then `syncInvalidIndices`
   (`EX/packages/excalidraw/data/restore.ts` L946-1010). Elements of unknown type
   are dropped (`restoreElement` returns `null`, L517-760). Bindings are **not** repaired
   at this stage.
2. **Placement on the canvas** (click or drag from the library):
   `App.addElementsFromPasteOrLibrary` (`EX/packages/excalidraw/components/App.tsx`
   L4584-4620) runs `restoreElements(…, {deleteInvisibleElements: true})` again. That
   removes empty text and anything for which `isInvisiblySmallElement` holds:
   `width === 0 && height === 0` for shapes and text, fewer than 2 points for lines
   (`EX/packages/element/src/sizeHelpers.ts` L61-78). Then
   `duplicateAtSceneCoords` (`EX/packages/excalidraw/components/App.duplicate.ts`
   L79-112) moves the items so that their **common bounding-box top-left** is placed by
   `getGridPoint` (`EX/packages/common/src/points.ts` L69-81, rounding to `gridSize`
   when grid mode is on). It also creates **new element ids, new group ids and
   new seeds** (`EX/packages/element/src/duplicate.ts` L105-130).

What this means for us:
- Ids and group ids in the file only matter inside the library (for dedupe). On the
  canvas every placed Symbol gets fresh ids, so two placed resistors never share a group.
- Pin-to-grid alignment: put the Symbol's bounding box (including labels) at a
  multiple of 20 and its pins at multiples of 20 from the bounding box's top-left. A text label
  that sticks out past the line art on the left or top shifts the snap origin, so
  keep labels inside the box spanned by the pins, or size the box to a multiple of 20.
  The bounding box of a line comes from its points, so stroke width doesn't affect it
  (`getCommonBounds`, `EX/packages/element/src/bounds.ts` L1005-1029).

## 3. Per-field defaults (`restoreElementWithProperties`)

Applied to every element type, from `EX/packages/excalidraw/data/restore.ts` L430-515.
Defaults come from `DEFAULT_ELEMENT_PROPS` (`EX/packages/common/src/constants.ts` L517-535).

| Field | If omitted | Should we set it? |
|---|---|---|
| `type` | required | yes |
| `x`, `y` | `0` | yes |
| `width`, `height` | `0`. Line/arrow width and height are **recomputed from `points`** | yes for ellipse, rectangle, text |
| `id` | `randomId()` | yes, deterministic (for dedupe) |
| `seed` | `1` | optional. Doesn't matter at roughness 0, and placement re-randomises it |
| `version` | `1` | optional (`1`) |
| `versionNonce` | `0`, then randomised if `index` is missing or invalid (section 4) | yes, deterministic |
| `index` | `null`, then regenerated (section 4) | yes: `"a0"`, `"a1"`, … in array order |
| `isDeleted` | `false` | no |
| `angle` | `0` | no |
| `strokeColor` | `#1e1e1e` (`COLOR_PALETTE.black`) | see note below |
| `backgroundColor` | `"transparent"` | optional (no fills) |
| `fillStyle` | `"solid"` | no |
| `strokeWidth` | `2` (`STROKE_WIDTH.medium`; thin=1, bold=4, constants L483-490) | yes, explicit |
| `strokeStyle` | `"solid"` | no |
| `roughness` | **`1` (artist / sketchy)** (`ROUGHNESS`, constants L469-473) | **yes: `0`** for the clean style |
| `opacity` | `100` | no |
| `groupIds` | `[]` | yes |
| `frameId` | `null` | no |
| `roundness` | `null` (sharp) | no (rectangle: `null` = sharp corners) |
| `boundElements` | `[]` | no |
| `updated` | now | no |
| `created` | `null` | no |
| `link` | `null` | no |
| `locked` | `false` | no |
| `customData` | kept only if present | optional, a place for Generator metadata (e.g. pin coordinates) |

Unknown extra properties are **kept** (`...element` spread, L489-497), so a
`customData` object carrying Symbol or pin metadata survives import.

**Dark mode:** in dark mode Excalidraw shows every colour through
`invert(93%) hue-rotate(180deg)` (`DARK_THEME_FILTER`, `EX/packages/common/src/constants.ts`
L207; `applyDarkModeFilter` in `EX/packages/common/src/colors.ts`). A stored `#1e1e1e`
therefore shows as near-white, the same as user-drawn shapes. Keeping the default stroke colour
is enough for "reads in dark mode".

## 4. `index` (fractional index) and why it matters for dedupe

`index` is a fractional-index string (rocicorp/fractional-indexing) kept in step with
array order (`EX/packages/element/src/types.ts` L65-69). `restoreElements` calls
`syncInvalidIndices` (`EX/packages/element/src/fractionalIndex.ts` L223). Any
element whose index is missing or out of order gets a **new index and a version bump
with a random `versionNonce`**. Without valid indices, each import therefore produces
different `versionNonce`s, so `isUniqueItem` never matches and re-importing the same
file **duplicates every item**. This was verified: with `index`,
`version` and `versionNonce` set, two imports produce identical `version`/`versionNonce`
values. Without them, the nonces were random each time.

Valid simple indices for N elements in order: `"a0"`, `"a1"`, …, `"a9"`, then
`"aA"`, …, `"aZ"`, `"aa"`, …, `"az"` (base-62, "a" + 1 digit gives 62 slots per item;
more than enough). A Symbol that changes in a new release should get a new
`versionNonce` (e.g. a hash of its elements). Users who re-import then get the new version
next to the old one, which they can delete.

## 5. Per-type fields

### line (`EX/packages/excalidraw/data/restore.ts` L605-647)
- `points`: array of `[x, y]` **relative to `x`,`y`**. Fewer than 2 valid points →
  replaced by `[[0,0],[width,height]]` (`restoreLinearElementPoints`, L159-182).
- If `points[0]` isn't `[0,0]`, the points are normalised and `x`/`y` are moved to compensate.
- `width`/`height` are recomputed from `points` (`getSizeFromPoints`).
- Forced: `startBinding: null`, `endBinding: null`. `startArrowhead`/`endArrowhead`
  are normalised (default `null`).
- `polygon` (closed shape) is `false` unless set and the points form a closed polygon.
- One `line` can be a polyline. Use one per stroke (a resistor zig-zag is one line).
  `roundness: null` keeps corners sharp. `{type: 2}` would curve them.

### arrow (L648-712)
Same as line, plus: `endArrowhead` defaults to **`"arrow"`** if omitted (give
`null` explicitly for none). Bindings are repaired against other elements. Elbow arrows
use `elbowed: true` with `fixedSegments`. We probably only need arrows in Block
symbols (signal-flow arrowheads), and a `line` with an arrowhead does the same job without
binding behaviour.

### ellipse / rectangle / diamond (L715-719)
Nothing beyond the common fields. `x`,`y` is the bounding-box top-left, and
`width`/`height` are the box. Rectangle corner rounding goes in `roundness`
(`ROUNDNESS` constants L450-466: 1 legacy, 2 proportional, 3 adaptive). Use `null`.

### text (L533-590)
| Field | If omitted |
|---|---|
| `text` | `""`. Empty text is deleted on placement |
| `originalText` | `= text` (the unwrapped source string) |
| `fontSize` | `20` (`DEFAULT_FONT_SIZE`, constants L226) |
| `fontFamily` | **not defaulted.** Left undefined, which breaks font rendering. **Required in practice** |
| `lineHeight` | Taken from `height`/`fontSize` if a height is given, otherwise the font's own line height (`getLineHeight`, `EX/packages/common/src/font-metadata.ts` L175-181) |
| `textAlign` / `verticalAlign` | `"left"` / `"top"` |
| `containerId` | `null` (free text, not bound to a shape) |
| `autoResize` | `true` (width follows content; `false` = fixed width with wrapping) |
| `width` / `height` | `0`, which gets the text **deleted on placement**. Always set them |

`fontFamily` values (`FONT_FAMILY`, `EX/packages/common/src/constants.ts` L143-154) and
line heights (`EX/packages/common/src/font-metadata.ts`):

| Value | Font | lineHeight | Notes |
|---|---|---|---|
| 1 | Virgil | 1.25 | legacy hand-drawn |
| 2 | Helvetica | 1.15 | legacy "Normal" |
| 3 | Cascadia | 1.2 | legacy code font |
| 5 | Excalifont | 1.25 | current default (`DEFAULT_FONT_FAMILY`) |
| 6 | Nunito | 1.25 | current sans in the UI picker |
| 7 | Lilita One | 1.15 | |
| 8 | Comic Shanns | 1.25 | current code font |
| 9 | Liberation Sans | 1.15 | Helvetica metric clone |
| 10 | Assistant | 1.25 | |

(4 is unused. The UI picker's top picks are Excalifont, Nunito and Comic Shanns:
`EX/packages/excalidraw/components/FontPicker/FontPicker.tsx` L42-63. Which font to
use for clean schematics is the map's open "Text behaviour" question.)

Text **bound inside a shape** uses `containerId` on the text plus
`boundElements: [{type:"text", id}]` on the container. That's only needed if a label
should sit inside a box and move with it. Bindings are repaired at placement, not at
library load. Standalone text in the same group is simpler and is what the example
below uses.

### freedraw (L591-603)
`points`, `pressures`, `simulatePressure`, `strokeOptions`. Not needed for clean
symbols. Avoid it.

## 6. Minimal valid `.excalidrawlib` (grouped line + ellipse + text)

This was verified to import and keep all 3 elements through both the import and the placement
restore steps. It is an IEC lamp-style circle on a horizontal wire. Pins are at (0,20) and (80,20),
and the label sits above.

```json
{
  "type": "excalidrawlib",
  "version": 2,
  "source": "https://github.com/rasmusravn/excalidraw-electronics",
  "libraryItems": [
    {
      "id": "lamp-iec",
      "status": "unpublished",
      "created": 1790812800000,
      "name": "Lamp (IEC)",
      "elements": [
        {
          "id": "lamp-iec-wire", "type": "line", "index": "a0",
          "version": 1, "versionNonce": 1000,
          "x": 0, "y": 20, "width": 80, "height": 0,
          "points": [[0, 0], [80, 0]],
          "strokeColor": "#1e1e1e", "strokeWidth": 2, "roughness": 0,
          "groupIds": ["lamp-iec-g"]
        },
        {
          "id": "lamp-iec-body", "type": "ellipse", "index": "a1",
          "version": 1, "versionNonce": 1001,
          "x": 20, "y": 0, "width": 40, "height": 40,
          "strokeColor": "#1e1e1e", "backgroundColor": "transparent",
          "strokeWidth": 2, "roughness": 0,
          "groupIds": ["lamp-iec-g"]
        },
        {
          "id": "lamp-iec-ref", "type": "text", "index": "a2",
          "version": 1, "versionNonce": 1002,
          "x": 30, "y": -24, "width": 20, "height": 18.4,
          "text": "L?", "originalText": "L?",
          "fontSize": 16, "fontFamily": 2, "lineHeight": 1.15,
          "textAlign": "left", "verticalAlign": "top",
          "containerId": null, "autoResize": true,
          "strokeColor": "#1e1e1e", "roughness": 0,
          "groupIds": ["lamp-iec-g"]
        }
      ]
    }
  ]
}
```

The absolute minimum (no `index`/`version`/`versionNonce`, no styling) also imports.
Without the styling it renders sketchy (roughness 1), and re-importing it duplicates the item.

Note: with the label at `y: -24`, the bounding-box top-left is (0, -24), not (0, 0), so grid
snapping would put the pins at y = 44 from a grid line, which is **off-grid**. In a real Symbol,
either put the label at a y that keeps the bounding-box top a multiple of 20 away from the pins
(e.g. label top at y = -20 with height ≤ 20), or put the label below/inside the pin box.

## 7. Skeleton API (`convertToExcalidrawElements`) offline

- Defined in `EX/packages/element/src/transform.ts` L572. It is re-exported from
  `@excalidraw/excalidraw` (`EX/packages/excalidraw/index.tsx` L505) and
  `@excalidraw/element`.
- Text measuring uses a `<canvas>` by default (`CanvasTextMetricsProvider`,
  `EX/packages/element/src/textMeasurements.ts` L121-158). A replacement can be plugged in
  with `setCustomTextMetricsProvider({getLineWidth(text, fontString)})` (L113-119,
  exported from `@excalidraw/excalidraw`, `index.tsx` L516).
- **Plain Node fails.** `import "@excalidraw/excalidraw"` (0.18.1) fails because of a JSON
  import attribute in `open-color`. The `@excalidraw/element` npm prerelease has mismatched
  peer packages (`@excalidraw/math` export missing). After bundling with esbuild it still
  touches `window`, `window.location`, `canvas.getContext('2d')` and `FontFace` while the
  modules load. It **did** work once bundled and given a jsdom global plus stubs for the
  canvas context and `FontFace`.
- **Bug that matters to us:** for `type: "line"` with custom `points`, the skeleton
  keeps the default `width: 100` instead of computing it from the points
  (`transform.ts` L615-626; arrows do recompute, L627-643). Import's `restoreElement`
  fixes this later, but it shows the skeleton adds little for straight geometry.
- The skeleton's real value is binding text into containers and arrows to shapes. We need
  neither for Symbols.

**Recommendation:** the Generator writes plain element JSON (section 6 shape), with
deterministic ids, indices and nonces. It estimates text width itself
(roughly `chars × fontSize × 0.6` is close enough, since `autoResize: true` text re-measures
the first time it's edited). This needs no Excalidraw dependency.
For automated validation, a Node script that bundles `restoreLibraryItems` +
`restoreElements(…, {deleteInvisibleElements:true})` under jsdom can confirm that
nothing gets dropped. This is the "Validating output" open question on the map.

## Verification

Ran in Node 26 with `@excalidraw/excalidraw@0.18.1`, bundled by esbuild, with jsdom
plus stubs for canvas and `FontFace`:
- `convertToExcalidrawElements` on a line, an ellipse and a text element produced valid elements,
  with the line width bug shown above.
- The section 6 file: `isValidLibrary` passes, 1 item is restored, and 3 of 3 elements survive
  the placement restore.
- The same file with text `width`/`height` set to 0: the text element is gone (2 elements).
- With `index` + `versionNonce` set, two imports gave identical nonces. Without them, the nonces were random.

Not verified: an actual import into excalidraw.com in a browser. That is for the Proof.
