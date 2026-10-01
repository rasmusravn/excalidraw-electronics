# Excalidraw Electronics

An Excalidraw library of IEC 60617 electronic schematic symbols and RF block symbols, made for the Obsidian Excalidraw plugin. Every Pin lands on the 20px grid, and Wires drawn as elbow arrows attach to Pins and follow when a Symbol moves. See `CONTEXT.md` for the vocabulary.

## What's in it

- **`electronics-schematic.excalidrawlib`**: passives (resistor, potentiometer, capacitors, inductors, ferrite bead, transformer, crystal, thermistor), diodes (incl. PIN and tunnel), transistors (BJT, enhancement and depletion MOSFETs, N- and P-JFET, IGBT, GaN HEMT), op-amp and comparator, sources, grounds, supply rail, switches and relay, fuses, transducers (speaker, microphone, lamp, motor), a generic IC box with Pin stubs, and Junctions. The resistor, potentiometer and fuse also come in an ANSI Variant.
- **`electronics-rf-blocks.excalidrawlib`**: amplifiers, mixer, oscillator, local oscillator, VCO, PLL, I/Q modulator and demodulator, filters (IEC wave marks, plus tunable band-pass, notch and SAW/BAW), attenuators, splitter/combiner, coupler, circulator, isolator, 90° and 180° hybrids, diplexer, antennas (single, array, horn), RF switches, converters, digital blocks (FPGA, DSP, NCO, FFT), phase shifter, multiplier and divider, limiter, detector, termination, DC block, bias tee, waveguide parts and RF port.
- **`catalog.excalidraw`**: every Symbol laid out and named, with the how-to-wire note.

## Install

Download the files from the latest [release](https://github.com/rasmusravn/excalidraw-electronics/releases/latest).

**Drop into the vault (recommended).** Needs the Obsidian Excalidraw plugin 2.28.1 or later, with its library stored in the vault (plugin settings, library storage). Put both `.excalidrawlib` files into the vault's `Excalidraw/Libraries/` folder. The plugin loads them by itself, and replacing them with a newer release updates the items in place.

**Import through the library menu.** In any Excalidraw drawing, open the library panel, then its menu, then *Open*, and pick each `.excalidrawlib` file. This works without vault library storage, and in plain Excalidraw too.

If the vault syncs with Obsidian Sync, turn on *Sync all other types* under Settings, Sync, on every device: `.excalidrawlib` and `.excalidraw` files are skipped otherwise.

**Optional extras**, in `obsidian-extras.zip` on the release. Unzip it into the vault's root folder; it holds:

- `Excalidraw/Template.excalidraw.md`, the plugin's default template path. New drawings then start with the 20px grid on and the arrow tool drawing Wires: elbow arrows with no arrowheads.
- `Excalidraw/Scripts/Rotate 90 degrees.md` and `Excalidraw/Scripts/Square Wires.md`. Each becomes a command; bind Ctrl/Cmd+R to Rotate 90 degrees and Alt+W to Square Wires under Settings, Hotkeys. Rotate 90 degrees turns the selected Symbols exactly a quarter turn, keeping their Pins on the grid and their Wires attached. If the plugin's script folder isn't `Excalidraw/Scripts`, move the two scripts there.

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
npm run build          # writes everything to out/
npm run install-vault  # also installs it all into the vault named by VAULT in .env
npm run package        # also zips the template and scripts into out/obsidian-extras.zip for a release
npm test               # imports the Library through the Obsidian fork's and upstream Excalidraw's own code
npm run typecheck
```

Copy `.env.example` to `.env` and set `VAULT`. `install-vault` copies the Libraries into `Excalidraw/Libraries/`, the catalog into `Electronics/`, the template to `Excalidraw/Template.excalidraw.md` and the scripts into the plugin's script folder, and binds Ctrl/Cmd+R and Alt+W when those hotkeys are free. It never replaces a template or script you made yourself. Reload Obsidian after the first install so it picks up the hotkeys.
