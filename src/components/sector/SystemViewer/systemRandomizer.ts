import type { SystemObject, SystemType, PlanetType, ObjectType } from '../../../types/sector';
import { OBJECT_TYPE_DEFAULTS } from '../../../types/sector';
import { PLANET_PRESETS, mulberry32 } from './planetRenderer';

const BASE_ORBIT = 8;
const ORBIT_SPACING = 10;

function orbitRadius(order: number, jitter: number): number {
  return BASE_ORBIT + order * ORBIT_SPACING + jitter;
}

// Size categories: small/medium/large with randomization
function planetSize(rng: () => number, isGas: boolean): number {
  if (isGas) {
    // Gas giants: medium to large
    const category = rng() < 0.5 ? 'medium' : 'large';
    return category === 'medium' ? randBetween(1.2, 1.5, rng) : randBetween(1.6, 1.9, rng);
  }
  // Rocky planets: small to medium
  const category = rng() < 0.6 ? 'small' : 'medium';
  return category === 'small' ? randBetween(0.4, 0.6, rng) : randBetween(0.7, 0.9, rng);
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function randBetween(min: number, max: number, rng: () => number): number {
  return min + rng() * (max - min);
}

function randInt(min: number, max: number, rng: () => number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

const STAR_COLORS: Record<SystemType, string[]> = {
  Standard: ['#FFF4C2', '#FFE0A0', '#FFFDE0'],
  Binary:   ['#FFF4C2', '#FFD0A0', '#FFE8C0'],
  Hostile:  ['#FF8844', '#FF6633', '#FFAA44'],
  Rich:     ['#FFFFFF', '#FFF8E0', '#E8F0FF'],
  Dead:     ['#224466', '#111133', '#441166'],
  Frontier: ['#FFCC99', '#FFE8CC', '#FFB077'],
};

const INNER_PLANETS: Record<SystemType, PlanetType[]> = {
  Standard: ['Barren', 'Volcanic', 'Arid'],
  Binary:   ['Barren', 'Arid'],
  Hostile:  ['Volcanic', 'Volcanic', 'Barren'],
  Rich:     ['Barren', 'Arid'],
  Dead:     ['Barren'],
  Frontier: ['Barren', 'Arid'],
};

const MID_PLANETS: Record<SystemType, PlanetType[]> = {
  Standard: ['Terran', 'Ocean', 'Arid', 'Terran'],
  Binary:   ['Arid', 'Barren'],
  Hostile:  ['Toxic', 'Barren', 'Volcanic'],
  Rich:     ['Terran', 'Ocean', 'Terran', 'Ocean'],
  Dead:     ['Barren', 'Ice'],
  Frontier: ['Arid', 'Barren', 'Terran'],
};

const OUTER_PLANETS: Record<SystemType, PlanetType[]> = {
  Standard: ['GasGiant', 'Ice'],
  Binary:   ['GasGiant', 'Ice'],
  Hostile:  ['GasGiant', 'Barren'],
  Rich:     ['GasGiant'],
  Dead:     ['Ice', 'Barren'],
  Frontier: ['GasGiant'],
};

interface SystemConfig {
  starType: ObjectType;
  starCount: 1 | 2;
  innerCount: [number, number];
  midCount:   [number, number];
  outerCount: [number, number];
  hasBelt:    number;   // probability 0–1
  hasStation: number;
}

const CONFIGS: Record<SystemType, SystemConfig> = {
  Standard: { starType: 'Star',       starCount: 1, innerCount: [1,2], midCount: [1,2], outerCount: [1,2], hasBelt: 0.45, hasStation: 0.20 },
  Binary:   { starType: 'Star',       starCount: 2, innerCount: [0,1], midCount: [0,1], outerCount: [1,2], hasBelt: 0.35, hasStation: 0.10 },
  Hostile:  { starType: 'Star',       starCount: 1, innerCount: [1,3], midCount: [0,2], outerCount: [0,1], hasBelt: 0.70, hasStation: 0.05 },
  Rich:     { starType: 'Star',       starCount: 1, innerCount: [1,2], midCount: [2,3], outerCount: [1,2], hasBelt: 0.30, hasStation: 0.55 },
  Dead:     { starType: 'BlackHole',  starCount: 1, innerCount: [0,1], midCount: [1,2], outerCount: [0,1], hasBelt: 0.60, hasStation: 0.15 },
  Frontier: { starType: 'Star',       starCount: 1, innerCount: [0,1], midCount: [1,2], outerCount: [0,1], hasBelt: 0.25, hasStation: 0.10 },
};

function makeId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function makeStar(_cfg: SystemConfig, systemType: SystemType, order: number, rng: () => number, binaryOrbitRad?: number): Omit<SystemObject, 'id'> {
  const isDead = systemType === 'Dead';
  const type: ObjectType = isDead ? (rng() > 0.5 ? 'BlackHole' : 'NeutronStar') : 'Star';
  const color = type === 'BlackHole' || type === 'NeutronStar'
    ? (OBJECT_TYPE_DEFAULTS[type].colors as [string])[0]
    : pick(STAR_COLORS[systemType], rng);
  const size = type === 'BlackHole' ? 1.4 : type === 'NeutronStar' ? 1.0 : randBetween(1.5, 2.5, rng);

  // Binary stars: both orbit shared barycenter at equal distance, exactly opposite
  // Use SAME seed for both so they have identical angles, then +π offset ensures 180° separation
  const orbitRad = binaryOrbitRad ?? 0;
  const sharedSeed = 999; // Same seed for both binary companions = consistent 180° opposition

  const inclination = order === 0 ? 0 : (rng() - 0.5) * 2 * 15;
  return {
    type,
    name: order === 0 ? 'Primary Star' : 'Secondary Star',
    parentId: null,
    sortOrder: order,
    size,
    colors: [color] as [string],
    orbitRadius: orbitRad,
    inclination,
    selfRotationSpeed: type === 'BlackHole' ? 0 : randBetween(0.05, 0.25, rng),
    notes: '', tags: [], factionId: null,
    seed: sharedSeed,
  };
}

function makePlanet(
  planetType: PlanetType,
  order: number,
  parentId: string | null,
  rng: () => number,
  parentSize?: number,
  prevMoonOrbit?: number,
): Omit<SystemObject, 'id'> {
  const preset = PLANET_PRESETS[planetType];
  const isGas = planetType === 'GasGiant';
  const isMoon = parentId !== null;
  const type: ObjectType = isMoon ? 'Moon' : isGas ? 'GasGiant' : 'Planet';
  const size = isMoon
    ? randBetween(0.15, 0.35, rng)
    : planetSize(rng, isGas);

  let radius: number;
  if (isMoon) {
    const clearance = 0.3;
    const fromParent = (parentSize ?? 0) + size + clearance;
    const fromPrevMoon = (prevMoonOrbit ?? 0) + size * 2 + clearance;
    const minOrbit = Math.max(fromParent, fromPrevMoon);
    radius = randBetween(minOrbit, minOrbit + 1.0, rng);
  } else {
    radius = orbitRadius(order, (rng() - 0.5) * 2);
  }

  // Inclination: minimal variation (±8° for planets, ±3° for moons)
  const inclinationRange = isMoon ? 3 : 8;
  const inclination = (rng() - 0.5) * 2 * inclinationRange;

  // Randomize ice caps: higher chance for cold planets, lower for hot/dry
  let iceCaps: boolean;
  if (isMoon) {
    iceCaps = rng() < 0.4; // moons: 40% chance
  } else if (['Ice', 'Barren'].includes(planetType)) {
    iceCaps = rng() < 0.75; // cold planets: 75% chance
  } else if (['Terran', 'Ocean'].includes(planetType)) {
    iceCaps = rng() < 0.5; // habitable: 50% chance
  } else {
    iceCaps = rng() < 0.15; // hot/toxic: 15% chance
  }

  // Randomize rings: gas giants commonly have them, others rarely
  let rings: boolean;
  if (isMoon) {
    rings = false; // moons never have rings
  } else if (isGas) {
    rings = rng() < 0.7; // gas giants: 70% chance
  } else {
    rings = rng() < 0.05; // rocky planets: 5% chance (rare)
  }

  // Ring inclination: independent tilt, widely varied (±65°)
  const ringInclination = rings ? randBetween(-65, 65, rng) : undefined;

  return {
    type,
    name: isMoon ? `Moon` : planetType,
    parentId,
    sortOrder: order,
    size,
    colors: [preset.primaryColor, preset.secondaryColor] as [string, string],
    orbitRadius: radius,
    inclination,
    selfRotationSpeed: randBetween(0.05, 0.25, rng),
    planetType,
    primaryColor: preset.primaryColor,
    secondaryColor: preset.secondaryColor,
    iceCaps,
    rings,
    ringInclination,
    seed: Math.floor(rng() * 999983),
    notes: '', tags: [], factionId: null,
  };
}

function makeBelt(order: number, rng: () => number): Omit<SystemObject, 'id'> {
  return {
    type: 'AsteroidBelt',
    name: 'Asteroid Belt',
    parentId: null,
    sortOrder: order,
    size: 0.1,
    colors: [pick(['#8C7B6B', '#9a8878', '#7a6a5a'], rng)] as [string],
    orbitRadius: orbitRadius(order, (rng() - 0.5) * 1.5),
    inclination: randBetween(-5, 5, rng),
    selfRotationSpeed: 0,
    notes: '', tags: [], factionId: null,
  };
}

function makeStation(order: number, rng: () => number): Omit<SystemObject, 'id'> {
  return {
    type: 'SpaceStation',
    name: 'Orbital Station',
    parentId: null,
    sortOrder: order,
    size: randBetween(0.25, 0.45, rng),
    colors: [pick(['#B0C4DE', '#99AABB', '#AABBCC'], rng)] as [string],
    orbitRadius: orbitRadius(order, (rng() - 0.5)),
    inclination: 0,
    selfRotationSpeed: randBetween(0.02, 0.08, rng),
    notes: '', tags: [], factionId: null,
  };
}

export function randomizeSystem(systemType: SystemType): SystemObject[] {
  const rng = mulberry32((Date.now() ^ (Math.random() * 0xffffffff)) >>> 0);
  const cfg = CONFIGS[systemType];
  const objects: SystemObject[] = [];
  let order = 0;

  // For binary systems, calculate shared orbit radius for both stars
  const isBinary = cfg.starCount === 2;
  const binaryOrbitRad = isBinary ? randBetween(10, 16, rng) : undefined;

  // Stars
  for (let s = 0; s < cfg.starCount; s++) {
    objects.push({ id: makeId(), ...makeStar(cfg, systemType, order++, rng, binaryOrbitRad) });
  }

  // Inner rocky planets
  const innerCount = randInt(cfg.innerCount[0], cfg.innerCount[1], rng);
  for (let i = 0; i < innerCount; i++) {
    const pt = pick(INNER_PLANETS[systemType], rng);
    const planet = { id: makeId(), ...makePlanet(pt, order++, null, rng) };
    objects.push(planet);
    // Inner planets rarely have moons
    if (rng() < 0.1) {
      objects.push({ id: makeId(), ...makePlanet('Barren', 0, planet.id, rng, planet.size) });
    }
  }

  // Mid / habitable zone
  const midCount = randInt(cfg.midCount[0], cfg.midCount[1], rng);
  for (let i = 0; i < midCount; i++) {
    const pt = pick(MID_PLANETS[systemType], rng);
    const planet = { id: makeId(), ...makePlanet(pt, order++, null, rng) };
    objects.push(planet);
    // Mid planets: 0–2 moons
    const moonCount = randInt(0, pt === 'GasGiant' ? 3 : 1, rng);
    let prevMoonOrbit = 0;
    for (let m = 0; m < moonCount; m++) {
      const moonPt = pick(['Barren', 'Ice', 'Barren'] as PlanetType[], rng);
      const moon = { id: makeId(), ...makePlanet(moonPt, m, planet.id, rng, planet.size, prevMoonOrbit) };
      prevMoonOrbit = moon.orbitRadius;
      objects.push(moon);
    }
  }

  // Asteroid belt (between mid and outer)
  if (rng() < cfg.hasBelt) {
    objects.push({ id: makeId(), ...makeBelt(order++, rng) });
  }

  // Outer planets (gas giants)
  const outerCount = randInt(cfg.outerCount[0], cfg.outerCount[1], rng);
  for (let i = 0; i < outerCount; i++) {
    const pt = pick(OUTER_PLANETS[systemType], rng);
    const planet = { id: makeId(), ...makePlanet(pt, order++, null, rng) };
    objects.push(planet);
    // Gas giants: 0–3 moons
    const moonCount = randInt(0, 3, rng);
    let prevMoonOrbit = 0;
    for (let m = 0; m < moonCount; m++) {
      const moonPt = pick(['Barren', 'Ice', 'Toxic', 'Barren'] as PlanetType[], rng);
      const moon = { id: makeId(), ...makePlanet(moonPt, m, planet.id, rng, planet.size, prevMoonOrbit) };
      prevMoonOrbit = moon.orbitRadius;
      objects.push(moon);
    }
  }

  // Station
  if (rng() < cfg.hasStation) {
    objects.push({ id: makeId(), ...makeStation(order++, rng) });
  }

  return objects;
}
