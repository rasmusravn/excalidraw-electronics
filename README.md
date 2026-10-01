# Excalidraw Electronics

An Excalidraw library of IEC 60617 electronic schematic symbols and RF block symbols, made for the Obsidian Excalidraw plugin. Every Pin lands on the 20px grid, and Wires drawn as elbow arrows attach to Pins and follow when a Symbol moves. See `CONTEXT.md` for the vocabulary.

## What's in it

- **`electronics-schematic.excalidrawlib`**: passives (resistor, potentiometer, capacitors, inductors, ferrite bead, transformer, crystal, thermistor), diodes (incl. PIN and tunnel), transistors (BJT, enhancement and depletion MOSFETs, N- and P-JFET, IGBT, GaN HEMT), op-amp and comparator, sources, grounds, supply rail, switches and relay, fuses, transducers (speaker, microphone, lamp, motor), a generic IC box with Pin stubs, and Junctions. The resistor, potentiometer and fuse also come in an ANSI Variant.
- **`electronics-rf-blocks.excalidrawlib`**: amplifiers, mixer, oscillator, local oscillator, VCO, PLL, I/Q modulator and demodulator, filters (IEC wave marks, plus tunable band-pass, notch and SAW/BAW), attenuators, splitter/combiner, coupler, circulator, isolator, 90° and 180° hybrids, diplexer, antennas (single, array, horn), RF switches, converters, digital blocks (FPGA, DSP, NCO, FFT), phase shifter, multiplier and divider, limiter, detector, termination, DC block, bias tee, waveguide parts and RF port.
- **`catalog.excalidraw`**: every Symbol laid out and named, with the how-to-wire note.

## Install

Every file below is on the latest [release](https://github.com/rasmusravn/excalidraw-electronics/releases/latest). Pick the section that fits you.

### Obsidian, with the installer (recommended)

Needs the Obsidian Excalidraw plugin 2.28.1 or later, with its library stored in the vault (Settings, Excalidraw, library storage). Takes about two minutes, with no terminal and no unzipping.

1. Download `Install-IEC-Electronics-Kit.md` from the release and save it in your vault's script folder (`Excalidraw/Scripts` unless you changed it) as `Install IEC Electronics Kit.md`.
2. Open any Excalidraw drawing, open the command palette and run **Install IEC Electronics Kit**.

It downloads the latest release and puts the whole Kit in place:

- both `.excalidrawlib` files in the plugin's library folder, which the plugin loads by itself
- the two Commands, **Rotate 90 degrees** and **Square Wires**, in the script folder
- the Template at `Excalidraw/Template.excalidraw.md`, so new drawings start with the 20px grid on and the arrow tool drawing Wires, only if you don't already have a Template there. If you do, it leaves yours alone and offers to save ours beside it.

It never replaces a Template or script you made yourself.

### Obsidian, by hand

Put both `.excalidrawlib` files into the vault's `Excalidraw/Libraries/` folder. The plugin loads them by itself, and replacing them with a newer release updates the items in place.

Optionally also:

- `Template.excalidraw.md` at `Excalidraw/Template.excalidraw.md`, the plugin's default template path
- `Rotate-90-degrees.md` and `Square-Wires.md` in the plugin's script folder, renamed to `Rotate 90 degrees.md` and `Square Wires.md`. Each becomes a command.

If the vault syncs with Obsidian Sync, turn on *Sync all other types* under Settings, Sync, on every device: `.excalidrawlib` and `.excalidraw` files are skipped otherwise.

### Plain Excalidraw

In any Excalidraw drawing, open the library panel, then its menu, then *Open*, and pick each `.excalidrawlib` file. The Symbols work there, but the Commands and the Template are Obsidian-only. Library imports through the menu don't update in place, so remove the old items before importing a newer release.

## Update

- **With the installer:** run **Install IEC Electronics Kit** again. It tells you which version you have and which is the latest, and replaces only the files it made. On the latest version it says so and changes nothing.
- **By hand:** overwrite the Library files in `Excalidraw/Libraries/` with the ones from the newer release.

An update never changes the Symbols already placed in your drawings, your own Template, your own scripts or your drawings. Item ids stay the same across versions, so the library panel gets no duplicates. Nothing checks for updates in the background.

## Hotkeys

The installer binds **Ctrl/Cmd+R** to Rotate 90 degrees and **Alt+W** to Square Wires in Obsidian's `hotkeys.json`, so reload Obsidian once afterwards. It never replaces a hotkey you set for either Command, and it skips a key another command already uses (the notice says so). Obsidian has no public API for hotkeys, so this edits its own file; if you'd rather bind them yourself, do so under Settings, Hotkeys. Rotate 90 degrees turns the selected Symbols exactly a quarter turn, keeping their Pins on the grid and their Wires attached.

## How to wire

- Draw Wires with the arrow tool set to **elbow**, with no arrowheads. Drawings started from the template already are.
- Drag each Wire end to a Pin **along its lead**. It ends exactly on the end of the lead, stays attached and stays at right angles when the Symbol moves.
- Join Wires at a **Junction** (four legs) or **Junction (T)** (three legs): attach each Wire to a leg's Pin, the same way as a Symbol's. Arrows can't attach to other arrows, so a Wire can't end in the middle of another Wire.
- Turn Symbols with **Ctrl/Cmd+R** (Rotate 90 degrees), not the rotate handle, so their Pins stay on the grid.
- Elbow Wires always have rounded bends; Excalidraw draws them that way. **Alt+W** (Square Wires) turns the selected Wires, or all Wires when nothing is selected, into sharp arrows through the same points, with right-angle corners and their ends still on their Pins. Squared Wires don't re-route: moving a Symbol makes its segment diagonal. Press Alt+W again to turn them back into elbow Wires. Square them when the diagram is done.

Limits:

- Approaching a Pin from the side leaves the Wire end about 10px off.
- Elbow bends may land between grid lines.
- Straight (non-elbow) arrows attach at an offset.
- Lines drawn with the Line tool never attach.

The same note is at the top of `catalog.excalidraw`.

## Development

The Library is made by a Generator: each Symbol is a small TypeScript module built from shared primitives, never drawn by hand. Needs Node 26 (it runs the TypeScript directly).

```sh
npm install
npm run build          # clears out/ and writes the release files to it, stamped with the version in package.json
npm run install-vault  # also installs it all into the vault named by VAULT in .env
npm test               # imports the Library through the Obsidian fork's and upstream Excalidraw's own code
npm run typecheck
```

Copy `.env.example` to `.env` and set `VAULT`. `install-vault` copies the Libraries into `Excalidraw/Libraries/`, the catalog into `Electronics/`, the template to `Excalidraw/Template.excalidraw.md` and the scripts into the plugin's script folder, and binds Ctrl/Cmd+R and Alt+W when those hotkeys are free. It never replaces a template or script you made yourself. Reload Obsidian after the first install so it picks up the hotkeys.

## Licence

The code and the Symbols are MIT licensed (see `LICENSE`). The Cascadia Code font in `fonts/` is Microsoft's, under the SIL Open Font License 1.1 (see `fonts/OFL.txt`); the released Library files contain no font data.

### Releasing

A release is one tag push. Set `version` in `package.json`, commit, then:

```sh
git tag v1.2.0 && git push origin main v1.2.0
```

The workflow in `.github/workflows/release.yml` checks that the tag matches `package.json`'s version, runs `npm ci` and `npm test`, builds from a clean `out/` and creates the release with exactly the Kit's seven files: the two Libraries, the catalog, the Template, the two Commands and the installer.
