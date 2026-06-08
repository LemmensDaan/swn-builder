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
  detail: 0 | 1 | 2;
}

export const PLANET_PRESETS: Record<PlanetType, PlanetPreset> = {
  Terran:   { primaryColor: '#3a7bd5', secondaryColor: '#3d9e3d', iceCaps: true,  detail: 2 },
  Arid:     { primaryColor: '#c8a05a', secondaryColor: '#8b4513', iceCaps: false, detail: 1 },
  Ocean:    { primaryColor: '#1a5ca8', secondaryColor: '#2a7acc', iceCaps: true,  detail: 2 },
  Ice:      { primaryColor: '#c8dde8', secondaryColor: '#8899aa', iceCaps: true,  detail: 1 },
  GasGiant: { primaryColor: '#d4924a', secondaryColor: '#c1783b', iceCaps: false, detail: 2 },
  Toxic:    { primaryColor: '#7ab528', secondaryColor: '#3d6b10', iceCaps: false, detail: 1 },
  Barren:   { primaryColor: '#777777', secondaryColor: '#555555', iceCaps: false, detail: 1 },
  Volcanic: { primaryColor: '#333333', secondaryColor: '#cc4400', iceCaps: false, detail: 1 },
};

export function generatePlanetGeometry(
  seed: number,
  type: PlanetType,
  primaryColor: string,
  secondaryColor: string,
  iceCaps: boolean,
  size: number = 1,
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

  for (let i = 0; i < positions.count; i += 3) {
    const avgY = (positions.getY(i) + positions.getY(i + 1) + positions.getY(i + 2)) / 3 / size;
    const noise = rng();

    let color: THREE.Color;

    if (type === 'GasGiant') {
      // Horizontal bands — no noise, strict banding by Y height
      const band = Math.floor((avgY + 1) * 4);
      color = (band % 2 === 0 ? c1 : c2).clone();
    } else {
      if (iceCaps && avgY > 0.7)       color = iceCap1.clone();
      else if (iceCaps && avgY < -0.65) color = iceCap2.clone();
      else if (noise > 0.22)            color = c2.clone();
      else                              color = c1.clone();
    }

    // Slight per-face brightness variation so each triangle reads distinctly
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
