// Every Symbol, in Library order: by family, each ANSI Variant directly after its IEC Symbol.
import type { SymbolDefinition } from "./build.ts";
import { resistor } from "./symbols/resistor.ts";

export const definitions: SymbolDefinition[] = [resistor];
