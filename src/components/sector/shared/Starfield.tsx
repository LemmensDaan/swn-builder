import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// Seeded PRNG — same seed → identical star positions across canvases
function mulberry32(seed: number) {
  let s = seed;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 0x100000000;
  };
}

// Generate a circular soft-dot texture for each star point
function makeStarTexture(): THREE.Texture {
  const size = 32;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.35,'rgba(255,255,255,0.7)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

export default function Starfield({ count = 900, seed = 42 }: { count?: number; seed?: number }) {
  const tex      = useMemo(() => makeStarTexture(), []);
  const groupRef = useRef<THREE.Group>(null);

  const positions = useMemo(() => {
    const rng = mulberry32(seed);
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = rng() * Math.PI * 2;
      const phi   = Math.acos(2 * rng() - 1);
      const r     = 400 + rng() * 50;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    return pos;
  }, [count, seed]);

  // Keep the starfield centred on the camera so it acts as a skybox —
  // the camera can never move close to or past the stars.
  useFrame(({ camera }) => {
    groupRef.current?.position.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <points renderOrder={-100}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={tex}
          size={3.5}
          sizeAttenuation
          color="#d4e0ff"
          transparent
          opacity={0.85}
          alphaTest={0.01}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
