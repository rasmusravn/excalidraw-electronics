# Excalidraw Electronics

A Generator for an Excalidraw library of IEC 60617 electronic schematic symbols and RF block symbols, for the Obsidian Excalidraw plugin. See `CONTEXT.md` for the vocabulary.

Needs Node 26 (it runs the TypeScript directly).

```sh
npm install
npm run build          # writes out/*.excalidrawlib and out/catalog.excalidraw
npm run install-vault  # also copies them into the vault named by VAULT in .env
npm test               # imports the Library through the Obsidian fork's and upstream Excalidraw's own code
npm run typecheck
```

Copy `.env.example` to `.env` and set `VAULT`. The Library files go into the vault's `Excalidraw/Libraries/` folder, which the plugin loads when its library storage is set to the vault.

`--install` also writes `Excalidraw/Template.excalidraw.md`, the plugin's default template path, unless a template you made yourself is already there. Every new drawing then starts with the 20px grid on, and the arrow tool draws Wires: elbow arrows with no arrowheads.

`--install` also adds a "Rotate 90 degrees" script to the plugin's script folder and binds it to Ctrl/Cmd+R, unless that hotkey is taken. It turns the selected Symbols exactly a quarter turn clockwise, keeps their Pins on the grid and re-routes the Wires attached to them. Reload Obsidian after the first install so it picks up the hotkey.

## How to wire

- Draw Wires with the arrow tool set to **elbow**, with no arrowheads. Drawings started from the template already are.
- Drag each Wire end to a Pin **along its lead**. It ends on the Pin dot, stays attached and stays at right angles when the Symbol moves.
- Turn Symbols with **Ctrl/Cmd+R** (Rotate 90 degrees), not the rotate handle, so their Pins stay on the grid.

Limits:

- Approaching a Pin from the side leaves the Wire end about 10px off.
- Elbow bends may land between grid lines.
- Straight (non-elbow) arrows attach at an offset.
- Lines drawn with the Line tool never attach.

The same note is at the top of `catalog.excalidraw`.
