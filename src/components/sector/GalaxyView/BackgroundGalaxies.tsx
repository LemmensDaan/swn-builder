import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Texture builders (all white/alpha so we can tint via sprite material) ─────

function makeSpiralTex(size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;

  // Soft disk glow
  const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.47);
  disk.addColorStop(0.0, 'rgba(255,255,255,0.12)');
  disk.addColorStop(0.6, 'rgba(255,255,255,0.05)');
  disk.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = disk;
  ctx.fillRect(0, 0, size, size);

  // 2 spiral arms — thick soft + thin bright
  for (let arm = 0; arm < 2; arm++) {
    const a0 = (arm / 2) * Math.PI * 2;

    const drawArm = (lineWidth: number, alpha: number) => {
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const t = i / 120;
        const r = (0.05 + t * 0.41) * size;
        const angle = a0 + t * Math.PI * 1.65;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    };

    drawArm(size * 0.11, 0.22); // thick, soft
    drawArm(size * 0.03, 0.80); // thin, bright
  }

  // Central bulge
  const bulge = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.13);
  bulge.addColorStop(0.0, 'rgba(255,255,255,1.0)');
  bulge.addColorStop(0.5, 'rgba(255,255,255,0.65)');
  bulge.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = bulge;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

function makeBarredSpiralTex(size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;

  // Disk glow
  const disk = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.47);
  disk.addColorStop(0, 'rgba(255,255,255,0.10)');
  disk.addColorStop(1, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = disk;
  ctx.fillRect(0, 0, size, size);

  // Central bar
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1, 0.22);
  const bar = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.30);
  bar.addColorStop(0.0, 'rgba(255,255,255,0.95)');
  bar.addColorStop(0.5, 'rgba(255,255,255,0.50)');
  bar.addColorStop(1.0, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = bar;
  ctx.fillRect(-cx, -cy / 0.22, size, size / 0.22);
  ctx.restore();

  // 2 arms starting from bar ends
  for (let arm = 0; arm < 2; arm++) {
    const startR = size * 0.28;
    const a0 = arm === 0 ? 0 : Math.PI;

    ctx.beginPath();
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const r = startR + t * size * 0.18;
      const angle = a0 + t * Math.PI * 1.1;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.70)';
    ctx.lineWidth = size * 0.04;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // Core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.08);
  core.addColorStop(0, 'rgba(255,255,255,1.0)');
  core.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

function makeEllipticalTex(size = 96): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.0, 0.58);
  const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, cx * 0.92);
  grad.addColorStop(0.00, 'rgba(255,255,255,1.00)');
  grad.addColorStop(0.12, 'rgba(255,255,255,0.90)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.50)');
  grad.addColorStop(0.65, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = grad;
  ctx.fillRect(-cx, -cy / 0.58, size, size / 0.58);
  ctx.restore();

  return new THREE.CanvasTexture(c);
}

function makeEdgeOnTex(size = 128): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const cx = size / 2, cy = size / 2;

  // Very thin streak
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(1.0, 0.07);
  const streak = ctx.createRadialGradient(0, 0, 0, 0, 0, cx * 0.93);
  streak.addColorStop(0.00, 'rgba(255,255,255,1.0)');
  streak.addColorStop(0.08, 'rgba(255,255,255,0.95)');
  streak.addColorStop(0.40, 'rgba(255,255,255,0.65)');
  streak.addColorStop(0.75, 'rgba(255,255,255,0.25)');
  streak.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = streak;
  ctx.fillRect(-cx, -cy / 0.07, size, size / 0.07);
  ctx.restore();

  // Nucleus
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 0.055);
  core.addColorStop(0, 'rgba(255,255,255,1.0)');
  core.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, size, size);

  return new THREE.CanvasTexture(c);
}

function makeIrregularTex(size = 96): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;

  const blobs: [number, number, number, number][] = [
    [0.48, 0.44, 0.30, 0.72],
    [0.64, 0.56, 0.19, 0.58],
    [0.33, 0.58, 0.17, 0.55],
    [0.56, 0.33, 0.14, 0.50],
    [0.40, 0.66, 0.11, 0.42],
  ];
  for (const [bx, by, br, alpha] of blobs) {
    const bcx = bx * size, bcy = by * size, bRadius = br * size;
    const grad = ctx.createRadialGradient(bcx, bcy, 0, bcx, bcy, bRadius);
    grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.45, `rgba(255,255,255,${(alpha * 0.45).toFixed(2)})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);
  }

  return new THREE.CanvasTexture(c);
}

function makeStarDotTex(size = 32): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(c);
}

// ── Data ──────────────────────────────────────────────────────────────────────

const TINTS = [
  new THREE.Color('#a8c4ff'), // blue-white (young spiral)
  new THREE.Color('#ffd280'), // warm gold (old elliptical)
  new THREE.Color('#ff9ec8'), // pink (starburst)
  new THREE.Color('#80ffdc'), // teal-green (irregular)
  new THREE.Color('#dde8ff'), // pale blue-white
  new THREE.Color('#ffb870'), // peach-orange
  new THREE.Color('#c8a0ff'), // lavender (interacting)
  new THREE.Color('#ffe0b0'), // cream (Sa spiral)
];

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  galaxyCount?: number;
  starCount?: number;
}

export default function BackgroundGalaxies({ galaxyCount = 140, starCount = 500 }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const textures = useMemo(() => [
    makeSpiralTex(128),
    makeBarredSpiralTex(128),
    makeEllipticalTex(96),
    makeEdgeOnTex(128),
    makeIrregularTex(96),
  ], []);

  const starTex = useMemo(() => makeStarDotTex(), []);

  const starPositions = useMemo(() => {
    const pos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 390 + Math.random() * 20;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
    }
    return pos;
  }, [starCount]);

  useEffect(() => {
    const group = groupRef.current;
    if (!group) return;

    const sprites: THREE.Sprite[] = [];

    for (let i = 0; i < galaxyCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 340 + Math.random() * 65;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      const tex    = textures[Math.floor(Math.random() * textures.length)];
      const tint   = TINTS[Math.floor(Math.random() * TINTS.length)].clone();
      // Scale distribution: mostly small, a few medium, rare large
      const u     = Math.random();
      const scale = u < 0.65
        ? 6  + Math.random() * 10   // small  (6–16)
        : u < 0.90
        ? 16 + Math.random() * 12   // medium (16–28)
        : 28 + Math.random() * 16;  // large  (28–44)

      const mat = new THREE.SpriteMaterial({
        map: tex,
        color: tint,
        transparent: true,
        opacity: 0.28 + Math.random() * 0.48,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });

      const sprite = new THREE.Sprite(mat);
      sprite.position.set(x, y, z);
      sprite.scale.set(scale, scale, 1);
      sprite.material.rotation = Math.random() * Math.PI * 2;

      group.add(sprite);
      sprites.push(sprite);
    }

    return () => {
      sprites.forEach(s => { s.material.dispose(); group.remove(s); });
    };
  }, [galaxyCount, textures]);

  // Follow camera so the background acts as a skybox
  useFrame(({ camera }) => {
    groupRef.current?.position.copy(camera.position);
  });

  return (
    <group ref={groupRef}>
      <points renderOrder={-100}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPositions, 3]} />
        </bufferGeometry>
        <pointsMaterial
          map={starTex}
          size={2.8}
          sizeAttenuation
          color="#c0d4ff"
          transparent
          opacity={0.65}
          alphaTest={0.01}
          depthWrite={false}
        />
      </points>
    </group>
  );
}
