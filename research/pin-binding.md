# Can wires attach to individual pins of a Symbol?

Research for [#3](https://github.com/rasmusravn/excalidraw-electronics/issues/3) (part of map #1).

Source: excalidraw/excalidraw `master` at commit
[`1919728`](https://github.com/excalidraw/excalidraw/tree/1919728724a1b71af73cb7e6d2d1a418a1415b1c)
(2026-09-30). Links below are pinned to that commit. These findings come from reading the source. Nothing here has been tried in a browser yet; the Proof has to confirm it.

## Answer

**Yes, it works, with one condition: the wire must be an `arrow`. A `line` won't do.** Give each pin a
small, invisible **pin target**: an `ellipse` (or `rectangle`) centred on the pin end and
grouped with the Symbol. If the user drops a wire end *inside* that target, Excalidraw
stores a `FixedPointBinding` with `mode: "inside"`. When the Symbol is moved, rotated or
resized, that wire end is put back at exactly the same relative point on the pin target.
Being in a group does not get in the way of binding, and the target still binds when it is fully
transparent.

Recommended construction (the Generator emits it per pin):

| Property | Value | Why |
|---|---|---|
| `type` | `"ellipse"` (circle) | Bindable. A circle looks the same at every rotation. |
| size | about 10×10 px, centred on the pin end (on the 20 px grid) | Big enough to hit. Smaller than the 20 px pin pitch, so neighbouring pins don't overlap. |
| `opacity` | `0` (or `strokeColor`/`backgroundColor` `"transparent"`) | Hidden. Binding ignores opacity. |
| `backgroundColor` | `"transparent"` | Keeps it from hiding elements behind it during binding hit tests. |
| `groupIds` | the Symbol's group id | Moves with the Symbol. |
| `boundElements` | `null` | Excalidraw fills this in when a wire binds. |

The wire is the **arrow tool with no arrowheads** (`startArrowhead`/`endArrowhead`
`null`). On the canvas it looks the same as a line.

## Evidence

### Only arrows bind. Lines don't.
- `isBindingElementType` returns true only for `"arrow"`
  ([typeChecks.ts#L178-L182](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/typeChecks.ts#L178-L182)).
  A `line` has `startBinding`/`endBinding` fields in its type
  ([types.ts#L369-L378](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/types.ts#L369-L378)),
  but the editor never sets them.
- Open user report of the same thing: [excalidraw#7060 "Unable to Anchor Lines to rectangle, diamond, circle, However arrows work"](https://github.com/excalidraw/excalidraw/issues/7060).

### Which elements can be bound to
- `isBindableElement`: rectangle, stickynote, diamond, ellipse, image, iframe, embeddable,
  frame, magicframe, and text that has no container
  ([typeChecks.ts#L184-L202](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/typeChecks.ts#L184-L202)).
  **`line`, `arrow` and `freedraw` are not bindable.** A Symbol drawn only from lines (resistor zig-zag, leads) gives a wire nothing to attach to. That is why each pin needs
  its own target. Same symptom reported in [excalidraw#3004 "Some grouped objects has no anchor for arrows"](https://github.com/excalidraw/excalidraw/issues/3004), where the reporter worked around it by adding a square or circle to the drawing.

### Binding data model: fixed points
- Each binding is `FixedPointBinding { elementId, fixedPoint: [rx, ry], mode: "inside" | "orbit" | "skip" }`.
  `fixedPoint` is a ratio of the target's width and height
  ([types.ts#L316-L333](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/types.ts#L316-L333)).
  The old `focus`/`gap` binding has been replaced. `restore.ts` converts legacy bindings to
  this form when it loads them
  ([restore.ts#L298-L420](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/excalidraw/data/restore.ts#L298-L420)).
  Simple (non-elbow) arrows got this in [excalidraw#9670 "Non-elbow arrow snapping and behavior changes"](https://github.com/excalidraw/excalidraw/pull/9670) (merged 2025-11): *"When arrow endpoints are drawn inside filled shapes, they maintain their relative position within the bound element as it moves"*.
- `updateBoundPoint`: with `mode === "inside"` it returns the fixed point directly, with no
  outline or gap maths. In that mode the wire end stays exactly on the pin
  ([binding.ts#L1972-L2009](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L1972-L2009)).
  With `"orbit"` the end sits on the target outline plus a gap of `5 + strokeWidth/2` px
  ([binding.ts#L117-L131](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L117-L131)).
- The fixed point is turned back into scene coordinates using the target's x, y, width,
  height **and angle** (`getGlobalFixedPointForBindableElement`,
  [binding.ts#L2670-L2685](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L2670-L2685)),
  so rotating the Symbol keeps wires on their pins.
- Targets narrower than 1 px fall back to fixed point `[0.5, 0.5]` (`MIN_BINDABLE_SIZE`,
  [binding.ts#L121-L123](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L121-L123), [#L2170-L2190](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L2170-L2190)).

### How a user gets an "inside" binding (default excalidraw.com behaviour)
- The `COMPLEX_BINDINGS` feature flag is **off** by default
  ([common/src/utils.ts#L1191-L1198](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/common/src/utils.ts#L1191-L1198)),
  so the `_simple` strategy is the one that runs
  ([binding.ts#L614-L650](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L614-L650)).
- In `_simple`: if the dragged endpoint is **inside** the hovered bindable element, it binds `"inside"` at
  that point. If it is outside but within binding distance, it binds `"orbit"`. Holding **Alt**
  forces `"inside"` binding
  ([binding.ts#L830-L880](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L830-L880)).
  With grid mode on, the hit test uses the pointer position
  ([binding.ts#L733-L740](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L733-L740)).
  If the pin target's centre is on the grid, a grid-snapped endpoint lands on it exactly.
- Binding distance is 15 px, rising to 30 px when zoomed out
  ([binding.ts#L133-L143](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L133-L143)).

### Groups and transparency do not block binding
- `getBindingCandidates` goes through elements from front to back. It filters on
  `isBindableElement` and `locked` only. **It never checks `groupIds` or `opacity`**
  ([collision.ts#L353-L421](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/collision.ts#L353-L421)).
  Transparency matters in one way only: an element with a non-transparent background (or an image)
  *occludes* the elements behind it (`isOpaqueForBinding`). A transparent pin target occludes
  nothing.
- When several candidates overlap, a smaller element that the point is *inside* wins over the
  closest outline
  ([collision.ts#L437-L489](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/collision.ts#L437-L489)).
  So a pin target placed inside an IC-box rectangle still wins when the wire end is dropped inside it.
- Being inside a shape is a purely geometric test (`isPointInElement`), not a test of what is painted
  ([collision.ts#L307-L337](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/collision.ts#L307-L337)).
- `restore` keeps `opacity: 0` as it is
  ([restore.ts#L462-L463](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/excalidraw/data/restore.ts#L462-L463)).

### Dragging a grouped Symbol moves the wire ends
- `dragSelectedElements` calls `updateBoundElements` for every moved non-arrow element. Clicking
  a group selects all its members, so every pin target is included
  ([dragElements.ts#L117-L136](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/dragElements.ts#L117-L136)).
  Resize and rotate do the same in `resizeElements.ts` (calls at L119, L156, L460, L984, L1553).
- Library insertion (`addElementsFromPasteOrLibrary`) runs the items through `restoreElements`
  and then `duplicateAtSceneCoords`, which gives fresh ids and keeps the shared `groupIds`
  ([App.tsx#L4584-L4625](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/excalidraw/components/App.tsx#L4584-L4625)).
  Library items hold no wires, so there are no bindings to remap on insert.

### Elbow arrows
- Elbow arrows always bind in `"orbit"` mode
  (`bindingStrategyForElbowArrowEndpointDragging`,
  [binding.ts#L267-L315](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L267-L315)).
  While dragging, the endpoint snaps to the outline (`bindPointToSnapToElementOutline`). After that it
  follows its `fixedPoint`
  ([elbowArrow.ts#L2214-L2251](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/elbowArrow.ts#L2214-L2251)).
  So an elbow wire *does* stay attached to a pin target, but its end sits about 5–6 px outside the target's
  outline, not on the pin end itself.

## Failure modes

1. **User draws with the Line tool.** Nothing binds. This is the most likely failure. The usage notes need to say "draw wires with the Arrow tool, arrowheads off". Changing the default arrowhead to none in the toolbar makes it painless.
2. **Wire end dropped near the pin but outside the target.** It binds `"orbit"`. The end then sits on
   the target outline plus about 5.5 px, *not* on the pin. It still follows the Symbol, but you can see the gap. A bigger target (about 10 px) helps, and grid snap to the pin centre helps more. Holding Alt forces an exact binding.
3. **Elbow-arrow wires** always use orbit, so they always end with that gap (see above). An untested idea: put the
   target on the lead, inset by the gap, so that outline + gap lands on the lead tip. This only works for the side the elbow chooses to approach from.
4. **Wrong target chosen.** Binding distance is 15–30 px and the pin pitch is 20 px, so an end dropped *between* pins can
   bind to the neighbouring pin. A filled or bindable Symbol body (IC-box rectangle, Block-symbol
   rectangle) is also a candidate. Inside a pin target the smaller element wins, but just outside it the body's outline can win.
5. **Dragging the wire on its own** (selecting just the arrow and moving it) unbinds any end whose target is not
   also being moved ([dragElements.ts#L137-L150](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/dragElements.ts#L137-L150)). This is normal Excalidraw behaviour.
6. **Multi-segment wires**: when a wire has more than 2 points, only the bound endpoint moves. Its interior
   bends stay where they were ([binding.ts#L1980-L1983](https://github.com/excalidraw/excalidraw/blob/1919728724a1b71af73cb7e6d2d1a418a1415b1c/packages/element/src/binding.ts#L1980-L1983)), so the last segment goes diagonal after a drag. For schematic tidiness this is the main reason to consider elbow arrows despite (3).
7. **Ungrouping or editing the Symbol** leaves the invisible targets behind as stray elements. If the user deletes the
   visible parts but not the targets, invisible bindable blobs remain. Keep the targets small and inside the
   Symbol's bounds so they don't grow the selection box or the export bounds.
8. **Upstream churn.** Binding was redesigned in 2025 (PR #9670). A rename of `"inside"` to `"fixed"` was
   proposed and then closed ([excalidraw#10777](https://github.com/excalidraw/excalidraw/pull/10777)). The
   `COMPLEX_BINDINGS` flag points to more changes on the way. Nothing here is a public API. The Library
   only emits plain bindable shapes, so the risk is limited to *how well* binding works, not
   whether the Library still loads.
9. **Unverified on excalidraw.com.** We assume the deployed site runs current `master`. The Proof should
   check by hand: insert a Symbol, draw an arrow-wire into a pin with grid on, then drag, rotate and flip
   the Symbol.

## Implications for the spec

- The Symbol definition gets a `pins: [{name, x, y}]` list. The Generator emits one invisible
  ellipse pin target per pin, in the Symbol's group.
- Grid alignment stays as it is (pin ends on the 20 px grid). Binding is an extra on top and doesn't replace it.
- Validation: check that every pin target is an `ellipse` with `opacity 0` and transparent
  background, sits within the Symbol's bounds, and is centred on a grid point.
