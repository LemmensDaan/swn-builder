import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { getOrbitPosition } from './orbitUtils';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

function makeStarGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeBlackHoleDiskTexture(baseHex: string): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const toRgba = (c: THREE.Color, a: number) =>
    `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${a})`;

  const inner = new THREE.Color().setHSL(hsl.h, hsl.s, Math.min(1, hsl.l + 0.35));
  const mid   = base.clone();
  const outer = new THREE.Color().setHSL(hsl.h, Math.max(0, hsl.s - 0.1), Math.max(0, hsl.l - 0.3));

  const cx = size / 2, cy = size / 2;
  const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, size / 2);
  g.addColorStop(0,    toRgba(inner, 0.95));
  g.addColorStop(0.25, toRgba(mid,   0.85));
  g.addColorStop(0.5,  toRgba(outer, 0.6));
  g.addColorStop(0.8,  toRgba(outer, 0.3));
  g.addColorStop(1,    toRgba(outer, 0));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  previewMode?: boolean;
  showOrbits?: boolean;
}

export default function StarObject({ obj, children, onPositionUpdate, onClick, previewMode, showOrbits = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex = useMemo(() => makeStarGlowTexture(), []);
  const bhDiskTex = useMemo(() => makeBlackHoleDiskTexture(color), [color]);

  // Orbit setup (for binary stars)
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  // Secondary star (sortOrder 1) starts 180° opposite from primary
  if (obj.sortOrder === 1) {
    initialAngle += Math.PI;
  }

  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef = useRef(initialAngle);

  useFrame((_, delta) => {
    // Update orbit position if this star orbits (secondary in binary)
    if (obj.orbitRadius > 0 && groupRef.current) {
      angleRef.current += delta * orbitSpeed;
      const incRad = THREE.MathUtils.degToRad(obj.inclination);
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
      groupRef.current.position.set(x, y, z);
      onPositionUpdate?.([x, y, z]);
    } else if (groupRef.current && obj.orbitRadius === 0) {
      // Star at center
      onPositionUpdate?.([0, 0, 0]);
    }

    if (meshRef.current && !isBlackHole) {
      meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.08);
    }
  });

  return (
    <>
      {/* Orbit ring only for hierarchical orbits (has a specific parent), not binary barycenter orbits */}
      {showOrbits && obj.parentId !== null && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef}>
        {/* The only meaningful light source in the scene */}
        {!previewMode && (
          <pointLight
            color={color}
            intensity={isBlackHole ? 80 : 120}
            distance={isBlackHole ? 180 : 220}
            decay={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
        )}
      {/* Soft glow behind the body */}
      {!isBlackHole && (
        <sprite userData={{ isStar: true }} scale={[obj.size * 5, obj.size * 5, 1]}>
          <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} />
        </sprite>
      )}
      {/* Black hole accretion disc: glowing disk sprite */}
      {isBlackHole && (
        <>
          <sprite userData={{ isStar: true }} scale={[obj.size * 5.2, obj.size * 5.2, 1]} position={[0, -0.05, 0]}>
            <spriteMaterial map={bhDiskTex} transparent depthWrite={false} toneMapped={false} />
          </sprite>
          <mesh userData={{ isStar: true }} position={[0, 0, 0]}>
            <icosahedronGeometry args={[obj.size * 0.85, 1]} />
            <meshBasicMaterial color="#000000" toneMapped={false} />
          </mesh>
        </>
      )}
      {/* Main body: IcosahedronGeometry detail 2, flatShading, MeshLambertMaterial */}
      <mesh
        ref={meshRef}
        userData={{ isStar: true }}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
        castShadow={false}
        receiveShadow={false}
      >
        <icosahedronGeometry args={[obj.size, 2]} />
        <meshLambertMaterial
          color={isBlackHole ? '#050008' : color}
          emissive={isBlackHole ? '#000000' : color}
          emissiveIntensity={isBlackHole ? 0 : isNeutron ? 1.5 : 0.9}
          flatShading
          toneMapped={false}
        />
      </mesh>
      {/* Hover label — plain monospace text, no box, no line */}
      {hovered && (
        <Html center distanceFactor={50} position={[0, obj.size + 1.2, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
            {obj.name}
          </div>
        </Html>
      )}
      {/* Children (planets, moons, stations) orbit in this star's local space */}
      {children}
      </group>
    </>
  );
}
