# Excalidraw Electronics

A library of electronic schematic and RF block-diagram symbols for use in Excalidraw.

## Language

**Component**:
A kind of real-world electronic part or function block (resistor, LNA, mixer, antenna).
_Avoid_: part, device

**Symbol**:
The drawing that represents a **Component** on a diagram. One Component may have several Symbols (one per **Variant**).
_Avoid_: icon, shape, glyph

**Variant**:
A Symbol drawn to a particular standard. **IEC** (IEC 60617) is the default; **ANSI** (ANSI/IEEE 315) exists only where it draws the Component differently.

**Schematic symbol**:
A Symbol for a discrete circuit element (R, L, C, diode, transistor, op-amp, source, ground, switch).

**Block symbol**:
A Symbol for an RF/system function block (amplifier, mixer, filter, oscillator, coupler, antenna, ADC). Used in block diagrams rather than circuit schematics.

**Pin**:
A point on a Symbol where a Wire connects. Pin ends always sit on the 20px grid.
_Avoid_: terminal, port, lead (a lead is the line drawn out to the Pin)

**Pin target**:
An invisible element at a Pin that a Wire end can attach to, so the Wire follows when the Symbol moves.

**Wire**:
A connection drawn between Pins. Only Wires drawn with the arrow tool (no arrowheads) attach to Pin targets.
_Avoid_: net, trace, connection

**Junction**:
A point where Wires join, marked by a filled dot, with a Pin on each leg (four, or three for a T). Wires can't attach to other Wires, so joining Wires each attach to a Junction leg.
_Avoid_: node, net tie

**Pin stub**:
A standalone library item made of a lead and its Pin target. The user places copies along a generic IC box, so one box serves any pin count.

**Core** / **Later**:
The two tiers of the Component list. Core Components are in the first full Library; Later Components are planned for afterwards.

**Library**:
The importable Excalidraw library file containing every Symbol as a library item.

**Template**:
The drawing new diagrams start from: no elements, only settings (grid on, the arrow tool drawing Wires).
_Avoid_: preset, starter

**Commands**:
The Obsidian Excalidraw scripts that ship with the Library: Rotate 90 degrees and Square Wires.
_Avoid_: macros, plugins

**Kit**:
Everything a user installs: the two Library files, the Template and the Commands.
_Avoid_: bundle, package, extras

**Generator**:
The code that produces the Library from Symbol definitions. Symbols are never hand-drawn into the Library.

**Proof**:
A small subset of Symbols, generated and imported into Excalidraw, that shows the approach works before the full set is produced.

## Relationships

- A **Component** has one or more **Symbols**, one per **Variant**
- A **Symbol** has one or more **Pins**; each **Pin** may carry a **Pin target**
- A **Wire** joins two **Pins**; Wires that join meet at a **Junction**
- The **Generator** produces the **Library** from all **Symbols**
- The **Kit** is the **Library**, the **Template** and the **Commands**; the Library alone also works outside Obsidian
- The **Proof** is a subset of the **Library**, produced by the same **Generator**
