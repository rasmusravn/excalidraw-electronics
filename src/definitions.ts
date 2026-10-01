// Every Symbol, in Library order: by family, each ANSI Variant directly after its IEC Symbol.
import type { SymbolDefinition } from "./build.ts";
import {
  capacitor,
  coredInductor,
  crystal,
  ferriteBead,
  fuse,
  fuseAnsi,
  inductor,
  polarizedCapacitor,
  potentiometer,
  potentiometerAnsi,
  resistor,
  resistorAnsi,
  transformer,
  variableCapacitor,
} from "./symbols/passives.ts";
import { npn } from "./symbols/transistors.ts";
import { signalGround } from "./symbols/grounds.ts";
import { icBox, pinStub } from "./symbols/ic.ts";
import { amplifier, antenna, bandPassFilter, mixer, rfPort } from "./symbols/blocks.ts";

export const definitions: SymbolDefinition[] = [
  resistor,
  resistorAnsi,
  potentiometer,
  potentiometerAnsi,
  capacitor,
  polarizedCapacitor,
  variableCapacitor,
  inductor,
  coredInductor,
  ferriteBead,
  transformer,
  crystal,
  npn,
  signalGround,
  fuse,
  fuseAnsi,
  icBox,
  pinStub,
  amplifier,
  mixer,
  bandPassFilter,
  antenna,
  rfPort,
];
