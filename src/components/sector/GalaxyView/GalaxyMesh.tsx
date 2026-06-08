import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import Delaunator from 'delaunator';

const galaxyRadius = 14;

// Warm-to-cool palette: white-cream core → pink → rose/mauve → blue → dark indigo
function galaxyColor(d: number): THREE.Color {
  if (d < 0.06) {
    return new THREE.Color('#fffef5');
  } else if (d < 0.18) {
    return new THREE.Color().lerpColors(new THREE.Color('#fffef5'), new THREE.Color('#ffbbdd'), (d - 0.06) / 0.12);
  } else if (d < 0.35) {
    return new THREE.Color().lerpColors(new THREE.Color('#ffbbdd'), new THREE.Color('#cc8899'), (d - 0.18) / 0.17);
  } else if (d < 0.55) {
    return new THREE.Color().lerpColors(new THREE.Color('#cc8899'), new THREE.Color('#4455aa'), (d - 0.35) / 0.20);
  } else if (d < 0.78) {
    return new THREE.Color().lerpColors(new THREE.Color('#4455aa'), new THREE.Color('#111144'), (d - 0.55) / 0.23);
  } else {
    return new THREE.Color().lerpColors(new THREE.Color('#111144'), new THREE.Color('#050510'), (d - 0.78) / 0.22);
  }
}

function buildGalaxyGeometry(): THREE.BufferGeometry {
  const points: [number, number][] = [];

  // Layer 1 — center-biased: dense small triangles near core
  for (let i = 0; i < 420; i++) {
    const r = Math.pow(Math.random(), 2.0) * galaxyRadius;
    const a = Math.random() * Math.PI * 2;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  // Layer 2 — area-uniform (sqrt bias): guarantees no sparse gaps in the outer disc.
  for (let i = 0; i < 460; i++) {
    const r = Math.sqrt(Math.random()) * galaxyRadius;
    const a = Math.random() * Math.PI * 2;
    points.push([Math.cos(a) * r, Math.sin(a) * r]);
  }

  // Pre-assign Y (thickness) per vertex — shared vertices across triangles must have
  // the same Y position, otherwise adjacent triangles disconnect and create holes.
  const yVals: number[] = points.map(([px, py]) => {
    const r = Math.sqrt(px * px + py * py);
    const d = r / galaxyRadius;
    // Oblate ellipsoid profile: thick at centre, smoothly tapers to zero at rim
    const maxHalf = 1.5 * Math.sqrt(Math.max(0, 1 - d * d));
    return (Math.random() - 0.5) * 2 * maxHalf;
  });

  const del = Delaunator.from(points, p => p[0], p => p[1]);

  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < del.triangles.length; i += 3) {
    const i0 = del.triangles[i], i1 = del.triangles[i + 1], i2 = del.triangles[i + 2];
    const [x0, z0] = points[i0], [x1, z1] = points[i1], [x2, z2] = points[i2];

    const cx = (x0 + x1 + x2) / 3, cz = (z0 + z1 + z2) / 3;
    const dist = Math.sqrt(cx * cx + cz * cz);

    // Drop triangles whose centroid falls outside the disc
    if (dist > galaxyRadius * 0.98) continue;

    // Drop spike triangles via max-edge filter
    const e01 = Math.hypot(x1 - x0, z1 - z0);
    const e12 = Math.hypot(x2 - x1, z2 - z1);
    const e20 = Math.hypot(x0 - x2, z0 - z2);
    if (Math.max(e01, e12, e20) > 4.5) continue;

    const d = Math.min(dist / galaxyRadius, 1);
    const c = galaxyColor(d);

    // Use pre-assigned Y per vertex index — no gaps between adjacent triangles
    positions.push(x0, yVals[i0], z0, x1, yVals[i1], z1, x2, yVals[i2], z2);
    for (let v = 0; v < 3; v++) colors.push(c.r, c.g, c.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors,    3));
  return geo;
}

// Sparkles: dual-layer density + oblate ellipsoid Y distribution for volume
function buildSparkles(): THREE.BufferGeometry {
  const posList: number[] = [];
  const colorList: number[] = [];
  for (let i = 0; i < 5000; i++) {
    const r = i < 2000
      ? Math.pow(Math.random(), 2.0) * galaxyRadius   // center-biased
      : Math.sqrt(Math.random()) * galaxyRadius;       // area-uniform
    const angle = Math.random() * Math.PI * 2;
    const d = r / galaxyRadius;
    // Match the mesh's oblate ellipsoid profile so sparkles fill the same volume
    const maxHalf = 1.6 * Math.sqrt(Math.max(0, 1 - d * d));
    const y = (Math.random() - 0.5) * 2 * maxHalf;
    posList.push(Math.cos(angle) * r, y, Math.sin(angle) * r);
    const c = galaxyColor(d);
    colorList.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(posList), 3));
  geo.setAttribute('color',    new THREE.BufferAttribute(new Float32Array(colorList), 3));
  return geo;
}

export default function GalaxyMesh() {
  const groupRef = useRef<THREE.Group>(null);
  const meshGeo    = useMemo(() => buildGalaxyGeometry(), []);
  const sparkleGeo = useMemo(() => buildSparkles(), []);

  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.05;
  });

  return (
    <group ref={groupRef} rotation={[-1.0, 0, 0]}>
      <mesh geometry={meshGeo}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <points geometry={sparkleGeo}>
        <pointsMaterial
          vertexColors
          size={0.14}
          transparent
          opacity={0.75}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
}
