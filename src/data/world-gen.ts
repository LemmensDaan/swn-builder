import { SWN_WORLD_TAGS } from './world-tags';

/**
 * World generation tables — *Stars Without Number (Revised)* pp.161–169.
 * Each physical/social attribute is rolled on 2d6.
 */

export interface WorldGenRow {
  /** 2d6 ranges that map to this entry, inclusive. */
  min: number;
  max: number;
  label: string;
}

function lookup(table: WorldGenRow[], roll: number): string {
  return table.find(r => roll >= r.min && roll <= r.max)?.label ?? table[table.length - 1].label;
}

export function roll2d6(): number {
  return (Math.floor(Math.random() * 6) + 1) + (Math.floor(Math.random() * 6) + 1);
}

// ── Atmosphere (p.164) ──────────────────────────────────────────────────────
export const ATMOSPHERE: WorldGenRow[] = [
  { min: 2, max: 2, label: 'Corrosive, damaging to foreign objects' },
  { min: 3, max: 3, label: 'Inert gas, useless for respiration' },
  { min: 4, max: 4, label: 'Airless or thin to the point of suffocation' },
  { min: 5, max: 9, label: 'Breathable mix' },
  { min: 10, max: 10, label: 'Thick, but breathable with a pressure mask' },
  { min: 11, max: 11, label: 'Invasive, penetrating suit seals' },
  { min: 12, max: 12, label: 'Both corrosive and invasive in its effects' },
];

// ── Temperature (p.166) ─────────────────────────────────────────────────────
export const TEMPERATURE: WorldGenRow[] = [
  { min: 2, max: 2, label: 'Frozen, locked in perpetual ice' },
  { min: 3, max: 3, label: 'Cold, dominated by glaciers and tundra' },
  { min: 4, max: 5, label: 'Variable cold, with temperate places' },
  { min: 6, max: 8, label: 'Temperate, Earthlike in its ranges' },
  { min: 9, max: 10, label: 'Variable warm, with temperate places' },
  { min: 11, max: 11, label: 'Warm, tropical and hotter in places' },
  { min: 12, max: 12, label: 'Burning, intolerably hot on its surface' },
];

// ── Biosphere (p.168) ───────────────────────────────────────────────────────
export const BIOSPHERE: WorldGenRow[] = [
  { min: 2, max: 2, label: 'Remnant biosphere' },
  { min: 3, max: 3, label: 'Microbial life forms exist' },
  { min: 4, max: 5, label: 'No native biosphere' },
  { min: 6, max: 8, label: 'Human-miscible biosphere' },
  { min: 9, max: 10, label: 'Immiscible biosphere' },
  { min: 11, max: 11, label: 'Hybrid biosphere' },
  { min: 12, max: 12, label: 'Engineered biosphere' },
];

// ── Population (p.170) ──────────────────────────────────────────────────────
export const POPULATION: WorldGenRow[] = [
  { min: 2, max: 2, label: 'Failed colony' },
  { min: 3, max: 3, label: 'Outpost' },
  { min: 4, max: 5, label: 'Fewer than a million inhabitants' },
  { min: 6, max: 8, label: 'Several million inhabitants' },
  { min: 9, max: 10, label: 'Hundreds of millions of inhabitants' },
  { min: 11, max: 11, label: 'Billions of inhabitants' },
  { min: 12, max: 12, label: 'Alien inhabitants' },
];

// ── Tech Level (p.172) ──────────────────────────────────────────────────────
export const TECH_LEVEL: WorldGenRow[] = [
  { min: 2, max: 2, label: 'TL0, neolithic-level technology' },
  { min: 3, max: 3, label: 'TL1, medieval technology' },
  { min: 4, max: 5, label: 'TL2, early Industrial Age tech' },
  { min: 6, max: 8, label: 'TL4, modern postech' },
  { min: 9, max: 10, label: 'TL3, tech like that of present-day Earth' },
  { min: 11, max: 11, label: 'TL4+, postech with specialties' },
  { min: 12, max: 12, label: 'TL5, pretech with surviving infrastructure' },
];

export interface GeneratedWorld {
  atmosphere: string;
  temperature: string;
  biosphere: string;
  population: string;
  techLevel: string;
  tags: [string, string];
}

/** Roll a full world: 2d6 on each attribute, plus two random World Tags (p.176). */
export function generateWorld(): GeneratedWorld {
  const tagA = SWN_WORLD_TAGS[Math.floor(Math.random() * SWN_WORLD_TAGS.length)];
  let tagB = SWN_WORLD_TAGS[Math.floor(Math.random() * SWN_WORLD_TAGS.length)];
  let guard = 0;
  while (tagB === tagA && guard++ < 20) tagB = SWN_WORLD_TAGS[Math.floor(Math.random() * SWN_WORLD_TAGS.length)];
  return {
    atmosphere: lookup(ATMOSPHERE, roll2d6()),
    temperature: lookup(TEMPERATURE, roll2d6()),
    biosphere: lookup(BIOSPHERE, roll2d6()),
    population: lookup(POPULATION, roll2d6()),
    techLevel: lookup(TECH_LEVEL, roll2d6()),
    tags: [tagA, tagB],
  };
}

/** Render a generated world's attributes as a notes block. */
export function worldToNotes(w: GeneratedWorld): string {
  return [
    `Atmosphere: ${w.atmosphere}`,
    `Temperature: ${w.temperature}`,
    `Biosphere: ${w.biosphere}`,
    `Population: ${w.population}`,
    `Tech Level: ${w.techLevel}`,
    `World Tags: ${w.tags[0]}, ${w.tags[1]}`,
  ].join('\n');
}
