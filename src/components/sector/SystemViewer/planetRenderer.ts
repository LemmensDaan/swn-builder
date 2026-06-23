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
  iceCaps: boolean;
  rings: boolean;
  detail: 0 | 1 | 2 | 3 | 4 | 5;
}

export const PLANET_PRESETS: Record<PlanetType, PlanetPreset> = {
  Terran:   { primaryColor: '#3a7bd5', secondaryColor: '#3d9e3d', iceCaps: true,  rings: false, detail: 4 },
  Arid:     { primaryColor: '#c8a05a', secondaryColor: '#8b4513', iceCaps: false, rings: false, detail: 3 },
  Ocean:    { primaryColor: '#1a5ca8', secondaryColor: '#2a7acc', iceCaps: true,  rings: false, detail: 4 },
  Ice:      { primaryColor: '#c8dde8', secondaryColor: '#8899aa', iceCaps: true,  rings: false, detail: 3 },
  GasGiant: { primaryColor: '#d4924a', secondaryColor: '#c1783b', iceCaps: false, rings: true,  detail: 5 },
  Toxic:    { primaryColor: '#7ab528', secondaryColor: '#3d6b10', iceCaps: false, rings: false, detail: 3 },
  Barren:   { primaryColor: '#777777', secondaryColor: '#555555', iceCaps: false, rings: false, detail: 3 },
  Volcanic: { primaryColor: '#333333', secondaryColor: '#cc4400', iceCaps: false, rings: false, detail: 3 },
};

export function getPlanetLODDetail(baseDetail: number, cameraDistance: number, isMobile: boolean): number {
  if (isMobile) {
    if (cameraDistance > 30) return Math.max(0, baseDetail - 2);
    if (cameraDistance > 15) return Math.max(0, baseDetail - 1);
  } else {
    if (cameraDistance > 50) return Math.max(0, baseDetail - 1);
  }
  return baseDetail;
}

export function generatePlanetGeometry(
  seed: number,
  type: PlanetType,
  primaryColor: string,
  secondaryColor: string,
  iceCaps: boolean,
  size: number = 1,
  detailOverride?: number,
): THREE.BufferGeometry {
  const rng = mulberry32(seed);
  const detail = detailOverride ?? (PLANET_PRESETS[type]?.detail ?? 1);

  const base = new THREE.IcosahedronGeometry(size, detail);
  const flat = base.index ? base.toNonIndexed() : base;
  if (flat !== base) base.dispose();
  const positions = flat.getAttribute('position') as THREE.BufferAttribute;
  const colorData: number[] = [];

  const c1 = new THREE.Color(primaryColor);
  const c2 = new THREE.Color(secondaryColor);
  const iceCap1 = new THREE.Color('#e8f4f8');
  const iceCap2 = new THREE.Color('#ddeeff');

  const isGasGiant = type === 'GasGiant';
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

  // Small islands (in oceans) and lakes (in landmasses): a second pass of tiny radius seeds
  // that are always the opposite color of the main Voronoi region they sit in.
  const detailSeeds: Array<{ pos: THREE.Vector3; isSecondary: boolean; cosRadius: number }> = [];
  if (!isGasGiant && !isRandom && seeds.length > 0) {
    const numDetailSeeds = 3 + Math.floor(rng() * 6); // 3–8 small features
    for (let i = 0; i < numDetailSeeds; i++) {
      const theta = rng() * Math.PI * 2;
      const phi = Math.acos(2 * rng() - 1);
      const seedPos = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta),
        Math.cos(phi),
        Math.sin(phi) * Math.sin(theta),
      );
      // Avoid placing detail seeds near poles when the planet has ice caps
      if (iceCaps && Math.abs(seedPos.y) > 0.6) continue;
      // Determine main Voronoi color at this seed position
      let bestDot = -Infinity;
      let mainIsSecondary = false;
      for (const s of seeds) {
        const dot = seedPos.dot(s.pos);
        if (dot > bestDot) { bestDot = dot; mainIsSecondary = s.isSecondary; }
      }
      // Angular radius ~8–26 degrees keeps features small-to-medium
      const cosRadius = 0.90 + rng() * 0.09;
      detailSeeds.push({ pos: seedPos, isSecondary: !mainIsSecondary, cosRadius });
    }
  }

  const tmpCenter = new THREE.Vector3();

  for (let i = 0; i < positions.count; i += 3) {
    let avgY = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3 / size;

    let color: THREE.Color;

    if (isGasGiant) {
      const band = Math.floor((avgY + 1) * 4);
      color = (band % 2 === 0 ? c1 : c2).clone();
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
      // Detail seeds override if within their radius — creates islands and lakes
      for (const ds of detailSeeds) {
        if (tmpCenter.dot(ds.pos) >= ds.cosRadius) {
          isSecondary = ds.isSecondary;
          break;
        }
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
