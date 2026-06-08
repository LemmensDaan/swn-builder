import { useMemo } from 'react';
import * as THREE from 'three';

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

export default function Starfield({ count = 900 }: { count?: number }) {
  const tex = useMemo(() => makeStarTexture(), []);

  // Place every star on the surface of a large sphere so they are ALWAYS
  // in the background regardless of where the camera is.
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 190 + Math.random() * 20;
      pos[i*3]   = r * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = r * Math.cos(phi);
    }
    return pos;
  }, [count]);

  return (
    <points renderOrder={-100}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial
        map={tex}
        size={2.2}
        sizeAttenuation
        color="#d4e0ff"
        transparent
        opacity={0.85}
        alphaTest={0.01}
        depthWrite={false}
      />
    </points>
  );
}
