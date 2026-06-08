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

interface Props { obj: SystemObject; children?: React.ReactNode }

export default function StarObject({ obj, children }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex = useMemo(() => makeStarGlowTexture(), []);

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
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad, obj.eccentricity);
      groupRef.current.position.set(x, y, z);
    }

    if (meshRef.current && !isBlackHole) {
      meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.08);
    }
  });

  return (
    <>
      {/* Orbit ring for binary stars */}
      {obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} eccentricity={obj.eccentricity} />}
      <group ref={groupRef}>
        {/* The only meaningful light source in the scene */}
        <pointLight
        color={isBlackHole ? '#000000' : color}
        intensity={isBlackHole ? 0 : 120}
        distance={220}
        decay={1}
      />
      {/* Soft glow behind the body */}
      {!isBlackHole && (
        <sprite scale={[obj.size * 6, obj.size * 6, 1]}>
          <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} />
        </sprite>
      )}
      {/* Black hole accretion disc effect */}
      {isBlackHole && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[obj.size * 1.4, obj.size * 2.8, 48]} />
          <meshBasicMaterial color="#cc4400" transparent opacity={0.6} side={THREE.DoubleSide} />
        </mesh>
      )}
      {/* Main body: IcosahedronGeometry detail 2, flatShading, MeshLambertMaterial */}
      <mesh
        ref={meshRef}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
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
