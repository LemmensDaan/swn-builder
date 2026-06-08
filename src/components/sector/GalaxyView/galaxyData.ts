import Delaunator from 'delaunator';

export const GALAXY_RADIUS = 14;

// Mulberry32 — fast, deterministic PRNG so triangle indices are stable across sessions
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface GalaxyTriangle {
  cx: number; cz: number;
  x0: number; z0: number;
  x1: number; z1: number;
  x2: number; z2: number;
}

function buildGalaxyData() {
  const rng = mulberry32(0xA55A1234);
  const points: [number, number][] = [];

  for (let i = 0; i < 420; i++) {
    const r = Math.pow(rng(), 2.0) * GALAXY_RADIUS;
    const a = rng() * Math.PI * 2;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  for (let i = 0; i < 460; i++) {
    const r = Math.sqrt(rng()) * GALAXY_RADIUS;
    const a = rng() * Math.PI * 2;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  const yVals: number[] = points.map(([px, py]) => {
    const r = Math.sqrt(px * px + py * py);
    const d = r / GALAXY_RADIUS;
    const maxHalf = 0.35 * Math.sqrt(Math.max(0, 1 - d * d));
    return (rng() - 0.5) * 2 * maxHalf;
  });

  const del = Delaunator.from(points, p => p[0], p => p[1]);
  const triangles: GalaxyTriangle[] = [];

  for (let i = 0; i < del.triangles.length; i += 3) {
    const i0 = del.triangles[i], i1 = del.triangles[i + 1], i2 = del.triangles[i + 2];
    const [x0, z0] = points[i0];
    const [x1, z1] = points[i1];
    const [x2, z2] = points[i2];
    const cx = (x0 + x1 + x2) / 3;
    const cz = (z0 + z1 + z2) / 3;
    const dist = Math.sqrt(cx * cx + cz * cz);

    if (dist > GALAXY_RADIUS * 0.98) continue;
    const e01 = Math.hypot(x1 - x0, z1 - z0);
    const e12 = Math.hypot(x2 - x1, z2 - z1);
    const e20 = Math.hypot(x0 - x2, z0 - z2);
    if (Math.max(e01, e12, e20) > 4.5) continue;

    triangles.push({ cx, cz, x0, z0, x1, z1, x2, z2 });
  }

  return { points, yVals, del, triangles };
}

const DATA = buildGalaxyData();
export const GALAXY_POINTS    = DATA.points;
export const GALAXY_Y_VALS    = DATA.yVals;
export const GALAXY_DEL       = DATA.del;
export const GALAXY_TRIANGLES = DATA.triangles;
