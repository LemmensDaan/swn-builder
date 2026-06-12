import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { mulberry32 } from './planetRenderer';

interface Props {
  obj: SystemObject;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

function cloudTex(size: number, r: number, g: number, b: number, alpha: number, falloff: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  const grd = ctx.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0,       `rgba(${r},${g},${b},${alpha})`);
  grd.addColorStop(falloff, `rgba(${r},${g},${b},${+(alpha * 0.25).toFixed(3)})`);
  grd.addColorStop(1,       `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

const _Z = new THREE.Vector3(0, 0, 1);

export default function NebulaObject({ obj, onPositionUpdate, onClick }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const seed = obj.seed ?? Math.abs(obj.name.charCodeAt(0) * 137 + obj.sortOrder * 31);

  // Seeded direction unit vector — where in the sky the nebula lives
  const { dir, dist, fixedQuat } = useMemo(() => {
    const rng = mulberry32(seed);
    const theta = rng() * Math.PI * 2;
    const phi   = (rng() * 0.55 + 0.22) * Math.PI; // keep off the poles
    const d = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi) * 0.4,                           // flatten Y: horizon-ish
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const dist = 280 + rng() * 80;
    // Planes face –dir (toward camera from nebula)
    const q = new THREE.Quaternion().setFromUnitVectors(_Z, d.clone().negate());
    return { dir: d, dist, fixedQuat: q };
  }, [seed]);

  // Visual radius: default size 0.1 → 150 units; feel free to raise obj.size for a larger cloud
  const vr = Math.max(obj.size * 1500, 120);

  const { tex, blobs, knots } = useMemo(() => {
    const [R, G, B] = hexToRgb(obj.colors?.[0] ?? '#9b0d7c');
    const R2 = Math.min(255, Math.round(R * 0.55 + 15));
    const G2 = Math.min(255, Math.round(G * 0.75 + 25));
    const B2 = Math.min(255, Math.round(B * 1.25 + 55));
    const Rc = Math.min(255, Math.round(R * 1.15 + 90));
    const Gc = Math.min(255, Math.round(G * 1.1  + 75));
    const Bc = Math.min(255, Math.round(B * 1.1  + 90));

    const rng = mulberry32(seed + 3);
    return {
      tex: {
        outerHaze: cloudTex(128, R,  G,  B,  0.50, 0.28),
        main:      cloudTex(256, R,  G,  B,  0.82, 0.42),
        blob1:     cloudTex(256, R,  G,  B,  0.72, 0.48),
        blob2:     cloudTex(256, R2, G2, B2, 0.68, 0.44),
        core:      cloudTex(128, Rc, Gc, Bc, 1.0,  0.18),
        knot:      cloudTex(64,  Rc, Gc, Bc, 1.0,  0.14),
        dust:      cloudTex(256, 2,  1,  8,  0.65, 0.52),
      },
      blobs: Array.from({ length: 4 }, () => ({
        x:   (rng() - 0.5) * vr * 0.85,
        y:   (rng() - 0.5) * vr * 0.45,
        sx:  0.5 + rng() * 0.65,
        sy:  0.4 + rng() * 0.55,
        rot: rng() * Math.PI,
      })),
      knots: Array.from({ length: 3 }, () => ({
        x: (rng() - 0.5) * vr * 0.5,
        y: (rng() - 0.5) * vr * 0.3,
      })),
    };
  }, [obj.colors, seed, vr]);

  const breatheT = useRef(0);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    // Follow camera position so the nebula is locked to the sky (zero parallax)
    groupRef.current.position.copy(camera.position).addScaledVector(dir, dist);
    groupRef.current.quaternion.copy(fixedQuat);
    breatheT.current += delta * 0.18;
    groupRef.current.scale.setScalar(1 + Math.sin(breatheT.current) * 0.016);
  });

  // Report a stable "world" position once for the object panel (approximate centre)
  const reported = useRef(false);
  useFrame(({ camera }) => {
    if (reported.current || !onPositionUpdate) return;
    const p = camera.position.clone().addScaledVector(dir, dist);
    onPositionUpdate([p.x, p.y, p.z]);
    reported.current = true;
  });

  const ADD = THREE.AdditiveBlending;
  const NRM = THREE.NormalBlending;

  return (
    <group ref={groupRef}>

      {/* Outer diffuse haze */}
      <mesh renderOrder={-10}>
        <planeGeometry args={[vr * 2.8, vr * 2.8]} />
        <meshBasicMaterial map={tex.outerHaze} transparent depthWrite={false} blending={ADD} opacity={0.35} />
      </mesh>

      {/* Main cloud body */}
      <mesh renderOrder={-9}>
        <planeGeometry args={[vr * 1.8, vr * 1.65]} />
        <meshBasicMaterial map={tex.main} transparent depthWrite={false} blending={ADD} opacity={0.60} />
      </mesh>

      {/* Sub-blobs */}
      {blobs.map((b, i) => (
        <mesh key={i} position={[b.x, b.y, 0]} rotation={[0, 0, b.rot]} renderOrder={-8}>
          <planeGeometry args={[vr * b.sx * 1.5, vr * b.sy * 1.5]} />
          <meshBasicMaterial
            map={i % 2 === 0 ? tex.blob1 : tex.blob2}
            transparent depthWrite={false} blending={ADD} opacity={0.38}
          />
        </mesh>
      ))}

      {/* Dark dust lane */}
      <mesh rotation={[0, 0, 0.55]} renderOrder={-7}>
        <planeGeometry args={[vr * 1.9, vr * 0.52]} />
        <meshBasicMaterial map={tex.dust} transparent depthWrite={false} blending={NRM} opacity={0.25} />
      </mesh>

      {/* Bright emission core */}
      <mesh renderOrder={-6}>
        <planeGeometry args={[vr * 0.42, vr * 0.42]} />
        <meshBasicMaterial map={tex.core} transparent depthWrite={false} blending={ADD} opacity={0.88} />
      </mesh>

      {/* Emission knots */}
      {knots.map((k, i) => (
        <mesh key={i} position={[k.x, k.y, 0]} renderOrder={-5}>
          <planeGeometry args={[vr * 0.17, vr * 0.17]} />
          <meshBasicMaterial map={tex.knot} transparent depthWrite={false} blending={ADD} opacity={0.68} />
        </mesh>
      ))}

      {/* Invisible click target — large sphere centred on cloud */}
      <mesh
        visible={false}
        onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
        onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
      >
        <sphereGeometry args={[vr * 0.6, 8, 6]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {hovered && (
        <Html center distanceFactor={45} position={[0, vr * 0.7, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#ddd', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
            {obj.name}
            {obj.tags.length > 0 && <div style={{ color: '#aaa', marginTop: '2px' }}>{obj.tags.join(' · ')}</div>}
          </div>
        </Html>
      )}
    </group>
  );
}
