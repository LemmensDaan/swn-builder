import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemObject, RingBand } from '../../../types/sector';
import { mulberry32 } from './planetRenderer';

// Debris grains per unit of ring area — broad rings get proportionally more.
const GRAIN_DENSITY = 3800;
const MIN_GRAINS = 700;
const MAX_GRAINS = 3600;
const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export const RING_EARTH_TONES = [
  '#8C7B6B', '#9a8878', '#7a6a5a', '#6B6B5A', '#8B8B7A',
  '#A09080', '#9A8A7A', '#7A7A6A', '#A5956B', '#8B8B63',
  '#7B7B5A', '#9B8B6B', '#6B6B4A', '#8B8B8B', '#7A7A7A',
];

const DEFAULT_WIDTH = 0.4;

// Lift very dark colors to a minimum lightness so they still reflect enough of the
// star's (dim, angled) light to be visible — kept lit (no emissive) so shadows work.
const MIN_RING_LIGHTNESS = 0.4;
function ringColorFromHex(hex: string): THREE.Color {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  if (hsl.l < MIN_RING_LIGHTNESS) c.setHSL(hsl.h, hsl.s, MIN_RING_LIGHTNESS);
  return c;
}

// Resolve the ring bands from the current settings, migrating from legacy fields
// (ringCount/ringSize/ringColors/ringInclination) when ringBands isn't set yet.
export function resolveRingBands(obj: SystemObject): RingBand[] {
  if (obj.ringBands && obj.ringBands.length > 0) return obj.ringBands;
  const count = Math.max(1, Math.min(8, Math.round(obj.ringCount ?? 3)));
  const inc = obj.ringInclination ?? 0;
  const span = obj.ringSize ?? 1;
  return Array.from({ length: count }, (_, i) => ({
    color: obj.ringColors?.[i] ?? RING_EARTH_TONES[i % RING_EARTH_TONES.length],
    size: 1.5 + i * 0.45 * span,
    width: DEFAULT_WIDTH,
    inclination: inc,
  }));
}

// A seeded radial "ringlet" density profile: smooth random concentric bright/dark
// variation across the band (0 = empty gap, 1 = dense/bright), like Saturn's rings.
function makeDensityFn(seed: number): (u: number) => number {
  const rng = mulberry32(seed >>> 0);
  const comps = Array.from({ length: 6 }, () => ({
    freq: 2 + Math.floor(rng() * 11),
    phase: rng() * Math.PI * 2,
    amp: 0.3 + rng() * 0.7,
  }));
  const total = comps.reduce((s, c) => s + c.amp, 0);
  return (u: number) => {
    let v = 0;
    for (const c of comps) v += c.amp * (0.5 + 0.5 * Math.sin(u * c.freq * Math.PI * 2 + c.phase));
    return Math.pow(v / total, 1.5); // contrast → some near-black gaps
  };
}

interface BandMeshProps {
  band: RingBand;
  planetSize: number;
  opacity: number;
  seed: number;
}

// One ring band: a translucent disc plus fine debris grains, tilted to its own
// inclination, with radial density/brightness variation (bright & dark strokes).
function RingBandMesh({ band, planetSize, opacity, seed }: BandMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const spinRef = useRef<THREE.Group>(null);

  const baseColor = useMemo(() => ringColorFromHex(band.color), [band.color]);
  const incRad = THREE.MathUtils.degToRad(band.inclination);
  // Debris orbits within the ring's own plane — inner rings a touch faster (Keplerian-ish).
  const orbitSpeed = 0.12 / Math.sqrt(Math.max(0.5, band.size));

  useFrame((_, delta) => {
    if (spinRef.current) spinRef.current.rotation.y += delta * orbitSpeed;
  });

  const width = (band.width ?? DEFAULT_WIDTH) * planetSize;
  const centerR = band.size * planetSize;
  const inner = Math.max(0.02, centerR - width / 2);
  const outer = centerR + width / 2;

  const count = Math.max(
    MIN_GRAINS,
    Math.min(MAX_GRAINS, Math.round(GRAIN_DENSITY * Math.PI * (outer * outer - inner * inner))),
  );

  const geo = useMemo(() => new THREE.OctahedronGeometry(0.020, 0), []);
  const mat = useMemo(() => new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), []);

  useEffect(() => {
    if (!meshRef.current) return;
    const rng = mulberry32(seed >>> 0);
    const density = makeDensityFn(seed * 31 + 13);
    for (let i = 0; i < count; i++) {
      const u = rng(); // radial position 0..1 across the band
      const r = inner + u * (outer - inner);
      const a = rng() * Math.PI * 2;
      const d = density(u);
      dummy.position.set(
        Math.cos(a) * r,
        (rng() - 0.5) * 0.02 * planetSize, // thin, flat disc
        Math.sin(a) * r,
      );
      dummy.rotation.set(rng() * Math.PI, rng() * Math.PI, rng() * Math.PI);
      // Gaps (low density) hide grains; brightness scales with density with higher contrast.
      dummy.scale.setScalar(d < 0.12 ? 0 : (0.5 + rng() * 0.6));
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
      tmpColor.copy(baseColor).multiplyScalar(0.25 + d * 1.2);
      meshRef.current.setColorAt(i, tmpColor);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
  }, [inner, outer, planetSize, baseColor, seed, count]);

  return (
    <group rotation={[incRad, 0, 0]}>
      {/* Spin around the ring-local axis so debris orbits within the (tilted) ring plane
          rather than precessing around the planet's vertical axis. */}
      <group ref={spinRef}>
        {/* Faint translucent base so gaps read as dim rather than pure black; the grains
            carry the bright/dark strokes. Doesn't receiveShadow (coplanar → acne). */}
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[inner, outer, 96]} />
          <meshLambertMaterial
            color={baseColor}
            transparent
            opacity={opacity * 0.7}
            side={THREE.DoubleSide}
            depthWrite={false}
            flatShading
          />
        </mesh>
        <instancedMesh ref={meshRef} args={[geo, mat, count]} receiveShadow />
      </group>
    </group>
  );
}

interface Props {
  obj: SystemObject;
}

export default function PlanetRings({ obj }: Props) {
  const bands = useMemo(() => resolveRingBands(obj), [obj.ringBands, obj.ringCount, obj.ringSize, obj.ringColors, obj.ringInclination]);

  // Deterministic per-band opacity so bands read as distinct without flicker on edit.
  const opacities = useMemo(() => {
    const rng = mulberry32(((obj.seed ?? 1) * 2654435761) >>> 0);
    return bands.map(() => 0.45 + rng() * 0.35);
  }, [obj.seed, bands.length]);

  // Invisible flat annulus spanning the full ring extent is the sole shadow caster,
  // tilted to the average ring inclination (the original ring-shadow behavior).
  const avgInc = bands.reduce((s, b) => s + b.inclination, 0) / (bands.length || 1);
  const shadowInner = bands.reduce(
    (m, b) => Math.min(m, (b.size - (b.width ?? DEFAULT_WIDTH) / 2) * obj.size),
    Infinity,
  );
  const shadowOuter = bands.reduce(
    (m, b) => Math.max(m, (b.size + (b.width ?? DEFAULT_WIDTH) / 2) * obj.size),
    0,
  );

  return (
    <group>
      {bands.map((band, i) => (
        <RingBandMesh
          key={i}
          band={band}
          planetSize={obj.size}
          opacity={opacities[i] ?? 0.6}
          seed={((obj.seed ?? 1) * 40503 + i * 9176 + 7) >>> 0}
        />
      ))}
      {/* Invisible flat annulus — sole shadow caster, gives a smooth ring shadow on the planet. */}
      <group rotation={[THREE.MathUtils.degToRad(avgInc), 0, 0]}>
        <mesh castShadow rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(0.02, shadowInner), shadowOuter, 64]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
        </mesh>
      </group>
    </group>
  );
}
