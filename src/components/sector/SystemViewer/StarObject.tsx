import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
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

function makeBlackHoleAccretionDisk(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  // 5 rings with significant tilt for 3D effect
  const ringCount = 5;
  const segmentCount = 32;

  for (let ringIdx = 0; ringIdx < ringCount; ringIdx++) {
    const ringProgress = ringIdx / (ringCount - 1);
    const innerRadius = size * (1.2 + ringProgress * 0.8);
    const outerRadius = size * (1.8 + ringProgress * 1.2);

    // More pronounced tilt for 3D look
    const tiltAngle = (ringProgress - 0.5) * 0.4;

    // Color: highly vibrant, closer to chosen color, with more saturation for outer discs
    const brightness = 0.45 + (1 - ringProgress) * 0.2;
    const saturation = Math.min(1, hsl.s * 1.6 + 0.4);
    const ringColor = new THREE.Color().setHSL(hsl.h, saturation, brightness);

    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      const x = Math.cos(angle) * innerRadius;
      const z = Math.sin(angle) * innerRadius;
      const y = Math.sin(tiltAngle) * (innerRadius * 0.25);
      positions.push(x, y, z);
    }

    for (let i = 0; i < segmentCount; i++) {
      const angle = (i / segmentCount) * Math.PI * 2;
      const x = Math.cos(angle) * outerRadius;
      const z = Math.sin(angle) * outerRadius;
      const y = Math.sin(tiltAngle) * (outerRadius * 0.2);
      positions.push(x, y, z);
    }

    for (let i = 0; i < segmentCount; i++) {
      const next = (i + 1) % segmentCount;
      indices.push(i, next, segmentCount + i);
      indices.push(next, segmentCount + next, segmentCount + i);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
    geometry.setIndex(new THREE.BufferAttribute(new Uint32Array(indices), 1));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: ringColor,
      emissive: ringColor,
      emissiveIntensity: 1.2 + ringProgress * 0.2,
      roughness: 0.4,
      metalness: 0.3,
      toneMapped: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(geometry, material);
    group.add(mesh);
  }

  return group;
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
  const diskGroupRef = useRef<THREE.Group>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const color = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex = useMemo(() => makeStarGlowTexture(), []);
  const bhDisk = useMemo(() => makeBlackHoleAccretionDisk(color, obj.size), [color, obj.size]);
  const camera = useThree(state => state.camera);

  // Orbit setup (for binary stars)
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  // Secondary star (sortOrder 1) starts 180° opposite from primary
  if (obj.sortOrder === 1) {
    initialAngle += Math.PI;
  }

  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef = useRef(initialAngle);

  // Random black hole disc inclination based on object seed
  // const discInclination = useMemo(() => {
  //   const rng = mulberry32(obj.seed ?? obj.id.charCodeAt(0) * 137);
  //   const inclX = rng() * Math.PI * 2;
  //   const inclZ = rng() * Math.PI * 2;
  //   return { inclX, inclZ };
  // }, [obj.seed, obj.id]);

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

    // Rotate the accretion disk faster and update disk material emissive intensity for glow effect
    if (diskGroupRef.current) {
      diskGroupRef.current.rotation.y += delta * 0.6;
      // Add pulsing glow effect
      const glowIntensity = 0.9 + Math.sin(Date.now() * 0.003) * 0.15;
      diskGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = glowIntensity;
        }
      });
    }

    // Make the ring face the camera (billboard effect)
    if (ringRef.current) {
      ringRef.current.lookAt(camera.position);
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
      {/* Black hole accretion disk: clean minimal design */}
      {isBlackHole && (
        <group userData={{ isStar: true }} position={[0, 0, 0]} /*rotation={[discInclination.inclX, 0, discInclination.inclZ]}*/>
          <primitive ref={diskGroupRef} object={bhDisk} />
          {/* Event horizon */}
          <mesh position={[0, 0, 0]}>
            <icosahedronGeometry args={[obj.size * 0.85, 4]} />
            <meshBasicMaterial color="#000000" toneMapped={false} />
          </mesh>
          {/* Colored outline ring around event horizon */}
          <mesh ref={ringRef} position={[0, 0, 0]}>
            <torusGeometry args={[obj.size * 1.0, obj.size * 0.03, 16, 100]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={1.5}
              roughness={0.4}
              metalness={0.3}
              toneMapped={false}
            />
          </mesh>
        </group>
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
        <icosahedronGeometry args={[obj.size, 4]} />
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
