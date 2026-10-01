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
