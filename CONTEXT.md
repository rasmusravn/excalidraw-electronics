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

**Library**:
The importable Excalidraw library file containing every Symbol as a library item.

**Generator**:
The code that produces the Library from Symbol definitions. Symbols are never hand-drawn into the Library.

**Proof**:
A small subset of Symbols, generated and imported into Excalidraw, that shows the approach works before the full set is produced.

## Relationships

- A **Component** has one or more **Symbols**, one per **Variant**
- The **Generator** produces the **Library** from all **Symbols**
- The **Proof** is a subset of the **Library**, produced by the same **Generator**
