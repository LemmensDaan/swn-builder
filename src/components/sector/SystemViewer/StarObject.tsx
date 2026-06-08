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

function makeBlackHoleDiskTexture(): THREE.Texture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  const cx = size / 2, cy = size / 2;
  // Radial gradient: bright hot inner disk fading to dim outer edges
  const g = ctx.createRadialGradient(cx, cy, 30, cx, cy, size / 2);
  g.addColorStop(0,   'rgba(255, 120, 40, 0.95)');  // event horizon - hot orange
  g.addColorStop(0.25, 'rgba(200, 80, 30, 0.85)');  // inner disk
  g.addColorStop(0.5,  'rgba(120, 40, 15, 0.6)');   // mid disk
  g.addColorStop(0.8,  'rgba(60, 20, 8, 0.3)');     // outer disk
  g.addColorStop(1,    'rgba(40, 10, 5, 0)');       // fade to black
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(canvas);
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
}

export default function StarObject({ obj, children, onPositionUpdate }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex = useMemo(() => makeStarGlowTexture(), []);
  const bhDiskTex = useMemo(() => makeBlackHoleDiskTexture(), []);

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
      {/* Orbit ring for binary stars */}
      {obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef}>
        {/* The only meaningful light source in the scene */}
        <pointLight
        color={isBlackHole ? '#ff6620' : color}
        intensity={isBlackHole ? 80 : 120}
        distance={isBlackHole ? 180 : 220}
        decay={1}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      {/* Soft glow behind the body */}
      {!isBlackHole && (
        <sprite scale={[obj.size * 5, obj.size * 5, 1]}>
          <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} />
        </sprite>
      )}
      {/* Black hole accretion disc: glowing disk sprite */}
      {isBlackHole && (
        <>
          {/* Disk sprite (top-down view) */}
          <sprite scale={[obj.size * 5.2, obj.size * 5.2, 1]} position={[0, -0.05, 0]} rotation={[0, 0, 0]}>
            <spriteMaterial map={bhDiskTex} transparent depthWrite={false} toneMapped={false} />
          </sprite>
          {/* Event horizon sphere — barely visible dark core */}
          <mesh position={[0, 0, 0]}>
            <icosahedronGeometry args={[obj.size * 0.85, 1]} />
            <meshBasicMaterial color="#000000" toneMapped={false} />
          </mesh>
        </>
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
