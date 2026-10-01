import { test } from "node:test";
import assert from "node:assert/strict";
import { build } from "../src/build.ts";
import { definitions } from "../src/definitions.ts";
import { bounds, line, pin, text, RIGHT, LEFT } from "../src/primitives.ts";
import type { SymbolDefinition } from "../src/build.ts";

test("the schematic Library and the catalog contain the Resistor", () => {
  const { schematic, catalog } = build(definitions);
  assert.ok(schematic.libraryItems.some((item) => item.name === "Resistor"));
  assert.ok(catalog.elements.some((e) => e.type === "text" && e.text === "Resistor"));
});

test("two builds produce identical ids, item ids and nonces", () => {
  const fingerprint = () => {
    const { schematic, rfBlocks, catalog } = build(definitions);
    return [...schematic.libraryItems, ...rfBlocks.libraryItems].flatMap((item) => [
      item.id,
      ...item.elements.flatMap((e) => [e.id, e.seed, e.versionNonce, e.index]),
    ]).concat(catalog.elements.flatMap((e) => [e.id, e.seed, e.versionNonce]));
  };
  assert.deepEqual(fingerprint(), fingerprint());
});

test("build throws when a Symbol puts a Pin off the 20px grid", () => {
  const offGrid: SymbolDefinition = {
    name: "Off-grid wire",
    variant: "IEC",
    tier: "Core",
    kind: "Schematic",
    shapes: [line([0, 0], [45, 0])],
    pins: [pin(0, 0, RIGHT), pin(45, 0, LEFT)],
  };
  assert.throws(() => build([offGrid]), /Off-grid wire: Pin \(45, 0\) is off the 20px grid/);
});

test("the template is an Obsidian Excalidraw drawing the plugin can start from", () => {
  const { template } = build(definitions);
  assert.match(template, /^---\n\nexcalidraw-plugin: parsed\n/);
  // Marks it as the Generator's, readable even after the plugin compresses the drawing.
  assert.match(template, /\nexcalidraw-electronics-template: true\n[\s\S]*\n---\n/);
  assert.match(template, /## Drawing\n```json\n[\s\S]*\n```\n%%\n$/);
});

// The Core Symbols in `names`, in order, from `first` on: Later Symbols may sit between them.
const coreFrom = (names: string[], first: string, count: number) => {
  const later = new Set(definitions.filter((d) => d.tier === "Later").map((d) => d.name));
  return names.slice(names.indexOf(first)).filter((n) => !later.has(n)).slice(0, count);
};

// A valid two-Pin Symbol to break one rule at a time.
const wire = (name: string, extra: Partial<SymbolDefinition> = {}): SymbolDefinition => ({
  name,
  variant: "IEC",
  tier: "Core",
  kind: "Schematic",
  shapes: [line([0, 0], [40, 0])],
  pins: [pin(0, 0, RIGHT), pin(40, 0, LEFT)],
  ...extra,
});

test("a valid fixture builds, and so do the real definitions", () => {
  assert.doesNotThrow(() => build([wire("Wire"), ...definitions]));
});

test("build throws on a duplicate element id", () => {
  assert.throws(() => build([wire("Wire"), wire("Wire")]), /Wire: duplicate element id/);
});

test("build throws on a group with fewer than 2 members", () => {
  const lone = wire("Lone group", { shapes: [{ ...line([0, 0], [40, 0]), groupIds: ["lone"] }] });
  assert.throws(() => build([lone]), /Lone group: group lone has only 1 member/);
});

test("build throws on fontFamily 4", () => {
  const local = wire("Local font", { shapes: [line([0, 0], [40, 0]), { ...text(0, -20, "R?"), fontFamily: 4 }] });
  assert.throws(() => build([local]), /Local font: fontFamily 4/);
});

test("build throws on zero-size text", () => {
  const empty = wire("Empty text", { shapes: [line([0, 0], [40, 0]), { ...text(0, -20, "R?"), width: 0 }] });
  assert.throws(() => build([empty]), /Empty text: zero-size text "R\?"/);
});

test("build throws when roughness is not set explicitly", () => {
  const rough = wire("No roughness", { shapes: [{ ...line([0, 0], [40, 0]), roughness: undefined }] });
  assert.throws(() => build([rough]), /No roughness: element without an explicit roughness/);
});

test("the Proof's Schematic symbols are in the schematic Library, each ANSI Variant right after its IEC Symbol", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  for (const name of ["Resistor", "Resistor (ANSI)", "Capacitor", "NPN transistor", "Signal ground"]) {
    assert.ok(names.includes(name), name);
  }
  assert.equal(names.indexOf("Resistor (ANSI)"), names.indexOf("Resistor") + 1);
});

test("the Proof's Block symbols are in the RF-blocks Library and the catalog", () => {
  const { rfBlocks, schematic, catalog } = build(definitions);
  const names = rfBlocks.libraryItems.map((item) => item.name);
  const proof = ["Amplifier", "Mixer", "Band-pass filter", "Antenna", "RF port"];
  for (const name of proof) assert.ok(names.includes(name), name);
  assert.ok(schematic.libraryItems.every((item) => !names.includes(item.name)));
  const captions = catalog.elements.filter((e) => e.type === "text").map((e) => e.text);
  for (const name of names) assert.ok(captions.includes(name), name);
});

test("the generic IC box and the Pin stub are in the schematic Library", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  assert.ok(names.includes("Generic IC"));
  assert.ok(names.includes("Pin stub"));
});

test("the catalog carries the how-to-wire note, sized to its text", () => {
  const note = build(definitions).catalog.elements.find((e) => e.type === "text" && String(e.text).startsWith("How to wire"));
  assert.ok(note, "note");
  for (const rule of ["elbow", "no arrowheads", "along its lead", "about 10px off", "between grid lines", "Line tool"]) {
    assert.ok(String(note.text).includes(rule), rule);
  }
  assert.ok(note.height >= String(note.text).split("\n").length * 14 * 1.2);
});

test("the Core passives and fuses are in the schematic Library in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const passives = [
    "Resistor", "Resistor (ANSI)", "Potentiometer", "Potentiometer (ANSI)", "Capacitor", "Polarized capacitor",
    "Variable capacitor", "Inductor", "Cored inductor", "Ferrite bead", "Transformer", "Crystal",
  ];
  assert.deepEqual(names.slice(0, passives.length), passives);
  assert.equal(names.indexOf("Fuse (ANSI)"), names.indexOf("Fuse") + 1);
  assert.ok(names.indexOf("Fuse") > names.indexOf("Signal ground"), "protection comes after the grounds");
});

test("every ANSI Variant comes directly after its IEC Symbol", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  for (const [i, name] of names.entries()) {
    if (name.endsWith(" (ANSI)")) assert.equal(names[i - 1], name.slice(0, -" (ANSI)".length), name);
  }
});

test("the Core diodes follow the passives in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const diodes = ["Crystal", "Diode", "Zener diode", "Schottky diode", "LED", "Varactor", "Photodiode"];
  assert.deepEqual(coreFrom(names, "Crystal", diodes.length), diodes);
});

test("the Junction has a Pin on each of four legs, and the T Junction on three", () => {
  const byName = (name: string) => definitions.find((d) => d.name === name)!;
  const ends = (name: string) => byName(name).pins.map((p) => [p.x, p.y]);
  assert.deepEqual(ends("Junction"), [[-20, 0], [20, 0], [0, -20], [0, 20]]);
  assert.deepEqual(ends("Junction (T)"), [[-20, 0], [20, 0], [0, 20]]);
  const names = build(definitions).schematic.libraryItems.map((i) => i.name);
  assert.equal(names.indexOf("Junction (T)"), names.indexOf("Junction") + 1);
});

test("Pins have no visible dot: nothing visible sits only at a Pin end", () => {
  const { schematic, rfBlocks } = build(definitions);
  for (const item of [...schematic.libraryItems, ...rfBlocks.libraryItems]) {
    const ends = item.elements
      .filter((e) => (e.customData as { pinEnd?: number[] } | undefined)?.pinEnd)
      .map((e) => {
        const [dx, dy] = (e.customData as { pinEnd: number[] }).pinEnd;
        return [e.x + e.width / 2 + dx, e.y + e.height / 2 + dy];
      });
    for (const e of item.elements.filter((e) => e.opacity !== 0)) {
      const box = bounds([e]);
      for (const [x, y] of ends) {
        const small = box.maxX - box.minX <= 6 && box.maxY - box.minY <= 6;
        const atPin = Math.abs((box.minX + box.maxX) / 2 - x) < 1 && Math.abs((box.minY + box.maxY) / 2 - y) < 1;
        assert.ok(!(small && atPin), `${item.name}: a dot at Pin (${x}, ${y})`);
      }
    }
  }
});

test("the Core transistors and amplifiers follow the NPN in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const active = ["NPN transistor", "PNP transistor", "N-MOSFET", "P-MOSFET", "N-JFET", "Op-amp", "Comparator"];
  assert.deepEqual(coreFrom(names, "NPN transistor", active.length), active);
});

test("the Core sources, grounds, rail and switches follow the amplifiers in the spec's order", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const family = [
    "Comparator", "DC voltage source", "Battery", "AC source", "Current source",
    "Signal ground", "Chassis ground", "Earth ground", "Supply rail",
    "SPST switch", "SPDT switch", "Push button", "Fuse", "Fuse (ANSI)",
  ];
  assert.deepEqual(coreFrom(names, "Comparator", family.length), family);
});

test("the supply rail's label is editable text", () => {
  const rail = build(definitions).schematic.libraryItems.find((i) => i.name === "Supply rail")!;
  assert.ok(rail.elements.some((e) => e.type === "text" && e.text === "VCC"));
});

test("the Core gain, frequency and filtering blocks are in the RF-blocks Library in the spec's order", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  const family = [
    "Amplifier", "Variable-gain amplifier", "Mixer", "Oscillator", "Local oscillator", "VCO", "PLL synthesizer",
    "Low-pass filter", "High-pass filter", "Band-pass filter", "Band-stop filter", "Attenuator", "Variable attenuator",
  ];
  assert.equal(names[0], "Amplifier");
  assert.deepEqual(coreFrom(names, "Amplifier", family.length), family);
  assert.equal(names.at(-1), "RF port");
});

test("the four filters differ in their wave marks alone", () => {
  const items = build(definitions).rfBlocks.libraryItems;
  const marks = ["Low-pass filter", "High-pass filter", "Band-pass filter", "Band-stop filter"].map((name) => {
    const item = items.find((i) => i.name === name)!;
    // The drawing without its label, ids or position: just the shapes' geometry.
    return JSON.stringify(item.elements.filter((e) => e.type !== "text").map((e) => [e.type, e.x, e.y, e.points]));
  });
  assert.equal(new Set(marks).size, 4);
});

test("the whole Core RF-blocks Library is in the spec's order", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  assert.equal(names[0], "Amplifier");
  assert.deepEqual(coreFrom(names, "Amplifier", names.length), [
    "Amplifier", "Variable-gain amplifier", "Mixer", "Oscillator", "Local oscillator", "VCO", "PLL synthesizer",
    "Low-pass filter", "High-pass filter", "Band-pass filter", "Band-stop filter", "Attenuator", "Variable attenuator",
    "2-way splitter/combiner", "Directional coupler", "Circulator", "Isolator",
    "Antenna", "SPDT RF switch", "SP4T RF switch",
    "ADC", "DAC", "Phase shifter", "Frequency multiplier", "Frequency divider", "Limiter", "Detector",
    "50Ω termination", "DC block", "Bias tee",
    "RF port",
  ]);
});

test("the Later diodes and transistors follow their Core families, tagged Later", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const after = (anchor: string, family: string[]) => {
    const start = names.indexOf(anchor) + 1;
    assert.deepEqual(names.slice(start, start + family.length), family);
  };
  after("Photodiode", ["PIN diode", "Tunnel diode"]);
  after("N-JFET", ["N-MOSFET (depletion)", "P-MOSFET (depletion)", "P-JFET", "IGBT", "GaN HEMT"]);
  const later = ["PIN diode", "Tunnel diode", "N-MOSFET (depletion)", "P-MOSFET (depletion)", "P-JFET", "IGBT", "GaN HEMT"];
  for (const name of later) assert.equal(definitions.find((d) => d.name === name)?.tier, "Later", name);
});

test("the Later electromechanical parts and transducers sit in their families, tagged Later", () => {
  const names = build(definitions).schematic.libraryItems.map((item) => item.name);
  const next = (anchor: string) => names[names.indexOf(anchor) + 1];
  assert.equal(next("Crystal"), "Thermistor");
  assert.equal(next("Push button"), "Relay");
  const start = names.indexOf("Fuse (ANSI)") + 1;
  assert.deepEqual(names.slice(start, start + 4), ["Speaker", "Microphone", "Lamp", "Motor"]);
  for (const name of ["Thermistor", "Relay", "Speaker", "Microphone", "Lamp", "Motor"]) {
    assert.equal(definitions.find((d) => d.name === name)?.tier, "Later", name);
  }
});

test("the Later I/Q and hybrid blocks sit in their families, tagged Later", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  const after = (anchor: string, family: string[]) => {
    const start = names.indexOf(anchor) + 1;
    assert.deepEqual(names.slice(start, start + family.length), family);
  };
  after("PLL synthesizer", ["I/Q modulator", "I/Q demodulator"]);
  after("Isolator", ["90° hybrid", "180° hybrid", "Diplexer/duplexer"]);
  for (const name of ["I/Q modulator", "I/Q demodulator", "90° hybrid", "180° hybrid", "Diplexer/duplexer"]) {
    assert.equal(definitions.find((d) => d.name === name)?.tier, "Later", name);
  }
});

test("the Later antennas and waveguide parts sit in their families, tagged Later", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  const after = (anchor: string, family: string[]) => {
    const start = names.indexOf(anchor) + 1;
    assert.deepEqual(names.slice(start, start + family.length), family);
  };
  after("Antenna", ["Array antenna", "Horn antenna"]);
  after("Bias tee", ["Waveguide section", "Waveguide-to-coax transition", "Waveguide termination"]);
  for (const name of ["Array antenna", "Horn antenna", "Waveguide section", "Waveguide-to-coax transition", "Waveguide termination"]) {
    assert.equal(definitions.find((d) => d.name === name)?.tier, "Later", name);
  }
});

test("the Later filter variants and digital blocks sit in their families, tagged Later", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  const after = (anchor: string, family: string[]) => {
    const start = names.indexOf(anchor) + 1;
    assert.deepEqual(names.slice(start, start + family.length), family);
  };
  after("Band-stop filter", ["Tunable band-pass filter", "Notch filter", "SAW/BAW filter"]);
  after("Detector", ["FPGA", "DSP", "NCO", "FFT"]);
  for (const name of ["Tunable band-pass filter", "Notch filter", "SAW/BAW filter", "FPGA", "DSP", "NCO", "FFT"]) {
    assert.equal(definitions.find((d) => d.name === name)?.tier, "Later", name);
  }
});

test("the local oscillator follows the oscillator: a circle with a sine, its one Pin on top pointing up", () => {
  const names = build(definitions).rfBlocks.libraryItems.map((item) => item.name);
  assert.equal(names[names.indexOf("Oscillator") + 1], "Local oscillator");
  const lo = definitions.find((d) => d.name === "Local oscillator")!;
  assert.equal(lo.pins.length, 1);
  const [p] = lo.pins;
  const lowest = Math.min(...lo.shapes.flatMap((s) => [s.y, ...((s.points as number[][] | undefined) ?? []).map((q) => s.y + q[1])]));
  assert.equal(p.y, lowest, "the Pin is the topmost point");
  assert.deepEqual(p.dir, [0, 1], "its lead runs down from the Pin into the circle");
});
