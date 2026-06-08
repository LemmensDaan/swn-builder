import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Sector } from '../../../types/sector';
import {
  GALAXY_RADIUS, GALAXY_DEL, GALAXY_POINTS, GALAXY_Y_VALS, GALAXY_TRIANGLES,
  type GalaxyTriangle,
} from './galaxyData';

function galaxyColor(d: number): THREE.Color {
  if (d < 0.06) return new THREE.Color('#fffef5');
  if (d < 0.18) return new THREE.Color().lerpColors(new THREE.Color('#fffef5'), new THREE.Color('#ffbbdd'), (d - 0.06) / 0.12);
  if (d < 0.35) return new THREE.Color().lerpColors(new THREE.Color('#ffbbdd'), new THREE.Color('#cc8899'), (d - 0.18) / 0.17);
  if (d < 0.55) return new THREE.Color().lerpColors(new THREE.Color('#cc8899'), new THREE.Color('#4455aa'), (d - 0.35) / 0.20);
  if (d < 0.78) return new THREE.Color().lerpColors(new THREE.Color('#4455aa'), new THREE.Color('#111144'), (d - 0.55) / 0.23);
  return new THREE.Color().lerpColors(new THREE.Color('#111144'), new THREE.Color('#050510'), (d - 0.78) / 0.22);
}

function buildGalaxyGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = 0; i < GALAXY_DEL.triangles.length; i += 3) {
    const i0 = GALAXY_DEL.triangles[i], i1 = GALAXY_DEL.triangles[i + 1], i2 = GALAXY_DEL.triangles[i + 2];
    const [x0, z0] = GALAXY_POINTS[i0];
    const [x1, z1] = GALAXY_POINTS[i1];
    const [x2, z2] = GALAXY_POINTS[i2];

    const cx = (x0 + x1 + x2) / 3, cz = (z0 + z1 + z2) / 3;
    const dist = Math.sqrt(cx * cx + cz * cz);

    if (dist > GALAXY_RADIUS * 0.98) continue;
    const e01 = Math.hypot(x1 - x0, z1 - z0);
    const e12 = Math.hypot(x2 - x1, z2 - z1);
    const e20 = Math.hypot(x0 - x2, z0 - z2);
    if (Math.max(e01, e12, e20) > 4.5) continue;

    const d = Math.min(dist / GALAXY_RADIUS, 1);
    const c = galaxyColor(d);

    positions.push(x0, GALAXY_Y_VALS[i0], z0, x1, GALAXY_Y_VALS[i1], z1, x2, GALAXY_Y_VALS[i2], z2);
    for (let v = 0; v < 3; v++) colors.push(c.r, c.g, c.b);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

function buildSparkles(): THREE.BufferGeometry {
  const posList: number[] = [];
  const colorList: number[] = [];
  for (let i = 0; i < 5000; i++) {
    const r = i < 2000
      ? Math.pow(Math.random(), 2.0) * GALAXY_RADIUS
      : Math.sqrt(Math.random()) * GALAXY_RADIUS;
    const angle = Math.random() * Math.PI * 2;
    const d = r / GALAXY_RADIUS;
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

const FILL_Y = 0.15;
const DOT_COUNT = 6;

function randomInTriangle(tri: GalaxyTriangle): [number, number] {
  const r1 = Math.random(), r2 = Math.random();
  const s = Math.sqrt(r1);
  const u = 1 - s, v = s * (1 - r2), w = s * r2;
  return [u * tri.x0 + v * tri.x1 + w * tri.x2, u * tri.z0 + v * tri.z1 + w * tri.z2];
}

function SectorTriangle({
  tri, name, pulsed, onClick,
}: {
  tri: GalaxyTriangle;
  name: string;
  pulsed: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || pulsed;

  // Color from the galaxy palette at this triangle's radial position
  const baseColor = useMemo(() => {
    const dist = Math.sqrt(tri.cx * tri.cx + tri.cz * tri.cz);
    return galaxyColor(Math.min(dist / GALAXY_RADIUS, 1));
  }, [tri]);

  const fillGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      tri.x0, FILL_Y, tri.z0,
      tri.x1, FILL_Y, tri.z1,
      tri.x2, FILL_Y, tri.z2,
    ], 3));
    return g;
  }, [tri]);

  // Twinkling dots — random positions inside the triangle, independent phases
  const dots = useMemo(() => Array.from({ length: DOT_COUNT }, () => {
    const [x, z] = randomInTriangle(tri);
    return { x, z, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.9 };
  }), [tri]);

  const dotColorBuf = useMemo(() => {
    return new THREE.BufferAttribute(new Float32Array(DOT_COUNT * 3), 3);
  }, []);

  const dotsGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(
      dots.flatMap(d => [d.x, FILL_Y + 0.08, d.z]), 3,
    ));
    g.setAttribute('color', dotColorBuf);
    return g;
  }, [dots, dotColorBuf]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    dots.forEach((dot, i) => {
      // sin^8: mostly off, sharp brief flash when cresting
      const v = Math.max(0, Math.pow(Math.sin(t * dot.speed + dot.phase), 8));
      // Rest at baseColor; flash toward warm-white when twinkling
      dotColorBuf.setXYZ(i,
        Math.min(1, baseColor.r + v),
        Math.min(1, baseColor.g + v * 0.92),
        Math.min(1, baseColor.b + v * 0.72),
      );
    });
    dotColorBuf.needsUpdate = true;
  });

  return (
    <group>
      <mesh
        geometry={fillGeo}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={e => { e.stopPropagation(); onClick(); }}
      >
        <meshBasicMaterial
          color={baseColor}
          transparent
          opacity={active ? 0.85 : 0.65}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <points geometry={dotsGeo}>
        <pointsMaterial
          vertexColors
          size={0.22}
          transparent
          opacity={1}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
      {active && (
        <Html
          center
          position={[tri.cx, 0.6, tri.cz]}
          distanceFactor={48}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'rgba(255,240,180,0.95)',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px #000',
          }}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

interface Props {
  sectors: Sector[];
  highlightedId: string | null;
  onSectorClick: (id: string) => void;
}

export default function GalaxyMesh({ sectors, highlightedId, onSectorClick }: Props) {
  const groupRef    = useRef<THREE.Group>(null);
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
      {sectors.map(s => {
        const tri = GALAXY_TRIANGLES[s.triangleIndex];
        if (!tri) return null;
        return (
          <SectorTriangle
            key={s.id}
            tri={tri}
            name={s.name}
            pulsed={highlightedId === s.id}
            onClick={() => onSectorClick(s.id)}
          />
        );
      })}
    </group>
  );
}
