import * as THREE from 'three';
import type { PlanetType } from '../../../types/sector';

export function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface PlanetPreset {
  primaryColor: string;
  secondaryColor: string;
  tertiaryColor?: string;
  iceCaps: boolean;
  rings: boolean;
  detail: 0 | 1 | 2 | 3 | 4;
}

export const PLANET_PRESETS: Record<PlanetType, PlanetPreset> = {
  Terran:   { primaryColor: '#3a7bd5', secondaryColor: '#3d9e3d', iceCaps: true,  rings: false, detail: 3 },
  Arid:     { primaryColor: '#c8a05a', secondaryColor: '#8b4513', iceCaps: false, rings: false, detail: 2 },
  Ocean:    { primaryColor: '#1a5ca8', secondaryColor: '#2a7acc', iceCaps: true,  rings: false, detail: 3 },
  Ice:      { primaryColor: '#c8dde8', secondaryColor: '#8899aa', iceCaps: true,  rings: false, detail: 2 },
  GasGiant: { primaryColor: '#d4924a', secondaryColor: '#c1783b', iceCaps: false, rings: true,  detail: 4 },
  Toxic:    { primaryColor: '#7ab528', secondaryColor: '#3d6b10', iceCaps: false, rings: false, detail: 2 },
  Barren:   { primaryColor: '#777777', secondaryColor: '#555555', iceCaps: false, rings: false, detail: 2 },
  Volcanic: { primaryColor: '#333333', secondaryColor: '#cc4400', iceCaps: false, rings: false, detail: 2 },
  TidallyLocked: { primaryColor: '#c8a05a', secondaryColor: '#c8dde8', tertiaryColor: '#2d8d2d', iceCaps: false, rings: false, detail: 3 },
};

export function generatePlanetGeometry(
  seed: number,
  type: PlanetType,
  primaryColor: string,
  secondaryColor: string,
  tertiaryColor: string | undefined,
  iceCaps: boolean,
  size: number = 1,
  inclination: number = 0,
): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const detail = PLANET_PRESETS[type]?.detail ?? 1;

  const base = new THREE.IcosahedronGeometry(size, detail);
  const flat = base.toNonIndexed();
  base.dispose();

  const positions = flat.getAttribute('position') as THREE.BufferAttribute;
  const colorData: number[] = [];

  const c1 = new THREE.Color(primaryColor);
  const c2 = new THREE.Color(secondaryColor);
  const iceCap1 = new THREE.Color('#e8f4f8');
  const iceCap2 = new THREE.Color('#ddeeff');

  const isGasGiant = type === 'GasGiant';
  const isTidallyLocked = type === 'TidallyLocked';
  const isRandom = type === 'Ice' || type === 'Toxic' || type === 'Volcanic';

  // Continent types: Voronoi seeds on the sphere → large coherent blobs
  const seeds: Array<{ pos: THREE.Vector3; isSecondary: boolean }> = [];
  if (!isGasGiant && !isRandom) {
    const numSeeds = 5 + Math.floor(rng() * 6);
    const secondaryFraction = 0.25 + rng() * 0.5;
    for (let i = 0; i < numSeeds; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      seeds.push({
        pos: new THREE.Vector3(
          Math.sin(phi) * Math.cos(theta),
          Math.cos(phi),
          Math.sin(phi) * Math.sin(theta),
        ),
        isSecondary: rng() < secondaryFraction,
      });
    }
  }

  const tmpCenter = new THREE.Vector3();
  const incRad = isTidallyLocked ? THREE.MathUtils.degToRad(inclination) : 0;
  const cos_inc = Math.cos(incRad);
  const sin_inc = Math.sin(incRad);

  for (let i = 0; i < positions.count; i += 3) {
    let avgY = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3 / size;

    // For tidally locked planets, use a zone coordinate perpendicular to the orbital plane
    // This accounts for inclination: zones should be along the radial direction (toward/away from star)
    if (isTidallyLocked) {
      const avg_y = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3 / size;
      const avg_z = (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3 / size;
      // Rotate YZ plane by inclination to get zone coordinate perpendicular to orbital plane
      avgY = avg_y * cos_inc - avg_z * sin_inc;
    }

    let color: THREE.Color;

    if (isGasGiant) {
      const band = Math.floor((avgY + 1) * 4);
      color = (band % 2 === 0 ? c1 : c2).clone();
    } else if (isTidallyLocked) {
      // Tidally locked planets have three zones:
      // Dayside (Y > 0.4): arid/desert - primaryColor
      // Nightside (Y < -0.4): ice/frozen - secondaryColor
      // Twilight zone (terminator): habitable - tertiaryColor with water
      const c3 = new THREE.Color(tertiaryColor ?? '#2d8d2d');
      const water = new THREE.Color('#1a5c99');
      const t = Math.max(-1, Math.min(1, avgY));

      if (t > 0.4) {
        // Dayside: arid/desert
        color = c1.clone();
        color.multiplyScalar(0.95 + rng() * 0.1); // slight variation
      } else if (t < -0.4) {
        // Nightside: frozen/ice
        color = c2.clone();
        color.multiplyScalar(0.9 + rng() * 0.15);
      } else {
        // Twilight zone: habitable (smooth gradient)
        const twilightBlend = (t + 0.4) / 0.8; // 0 to 1 from nightside to dayside
        if (Math.abs(t) < 0.2) {
          // Core habitable zone with water features
          const isWater = rng() < 0.25; // 25% water coverage
          color = isWater ? water.clone() : c3.clone();
          color.multiplyScalar(0.85 + rng() * 0.25);
        } else if (t > 0) {
          // Transition from habitable to arid
          const isWater = rng() < 0.15; // Less water in transition zone
          const baseColor = isWater ? water : c3;
          color = new THREE.Color().lerpColors(baseColor, c1, twilightBlend);
        } else {
          // Transition from ice to habitable
          const isWater = rng() < 0.15; // Less water toward ice side
          const baseColor = isWater ? water : c3;
          color = new THREE.Color().lerpColors(c2, baseColor, twilightBlend + 0.5);
        }
      }
    } else if (iceCaps && avgY > 0.7) {
      color = iceCap1.clone();
    } else if (iceCaps && avgY < -0.65) {
      color = iceCap2.clone();
    } else if (isRandom) {
      // Per-face random noise: chaotic speckled surface
      color = (rng() > 0.22 ? c2 : c1).clone();
    } else {
      // Nearest-seed Voronoi: face center on unit sphere → find closest seed
      tmpCenter.set(
        (positions.getX(i) + positions.getX(i + 1) + positions.getX(i + 2)) / 3,
        (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3,
        (positions.getZ(i) + positions.getZ(i + 1) + positions.getZ(i + 2)) / 3,
      ).normalize();

      let bestDot = -Infinity;
      let isSecondary = false;
      for (const seed of seeds) {
        const dot = tmpCenter.dot(seed.pos);
        if (dot > bestDot) { bestDot = dot; isSecondary = seed.isSecondary; }
      }
      color = (isSecondary ? c2 : c1).clone();
    }

    // Per-face brightness variation keeps the low-poly faceted look
    const brightness = 0.85 + rng() * 0.3;
    color.multiplyScalar(brightness);

    for (let v = 0; v < 3; v++) {
      colorData.push(color.r, color.g, color.b);
    }
  }

  flat.setAttribute('color', new THREE.Float32BufferAttribute(colorData, 3));
  flat.computeVertexNormals();
  return flat;
}
