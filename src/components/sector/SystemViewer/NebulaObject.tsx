import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { mulberry32 } from './planetRenderer';

interface Props {
  obj: SystemObject;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
}

interface Layer {
  key: string;
  x: number; y: number;
  rotZ: number;
  w: number; h: number;
  tex: THREE.CanvasTexture;
  op: number;
  blend: THREE.Blending;
  order: number;
}

function hexToRgb(hex: string): [number, number, number] {
  const c = hex.replace('#', '');
  return [parseInt(c.slice(0, 2), 16), parseInt(c.slice(2, 4), 16), parseInt(c.slice(4, 6), 16)];
}

// Single smooth radial blob — for halos, cores, and point sources
function cloudTex(size: number, r: number, g: number, b: number, alpha: number, falloff: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  const grd = ctx.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0,       `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
  grd.addColorStop(falloff, `rgba(${r},${g},${b},${(alpha * 0.22).toFixed(3)})`);
  grd.addColorStop(1,       `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Many overlapping small blobs — gives lumpy, irregular cloud edges like real nebulas
function lumpyCloudTex(size: number, r: number, g: number, b: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  for (let i = 0; i < 30; i++) {
    const dist  = Math.sqrt(rnd()) * h * 0.88;
    const angle = rnd() * Math.PI * 2;
    const bx    = h + Math.cos(angle) * dist;
    const by    = h + Math.sin(angle) * dist;
    const br    = h * (0.09 + rnd() * 0.25);
    const ba    = alpha * (0.18 + rnd() * 0.38);
    const grd   = ctx.createRadialGradient(bx, by, 0, bx, by, br);
    grd.addColorStop(0, `rgba(${r},${g},${b},${ba.toFixed(3)})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(bx, by, br, 0, Math.PI * 2);
    ctx.fill();
  }
  return new THREE.CanvasTexture(canvas);
}

// Sharp ring / shell
function ringTex(size: number, r: number, g: number, b: number, innerFrac: number, alpha: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  const f = innerFrac;
  const grd = ctx.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0,                     `rgba(${r},${g},${b},0)`);
  grd.addColorStop(f * 0.5,               `rgba(${r},${g},${b},${(alpha * 0.08).toFixed(3)})`);
  grd.addColorStop(f * 0.85,              `rgba(${r},${g},${b},${(alpha * 0.55).toFixed(3)})`);
  grd.addColorStop(f,                     `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
  grd.addColorStop(Math.min(1, f + 0.13), `rgba(${r},${g},${b},${(alpha * 0.28).toFixed(3)})`);
  grd.addColorStop(1,                     `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Bezier strands radiating from the centre — for supernova filaments
function filamentTex(size: number, fr: number, fg: number, fb: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2 + (rnd() - 0.5) * 0.60;
    const len   = h * (0.30 + rnd() * 0.65);
    const curve = (rnd() - 0.5) * 1.2;
    const ex    = h + Math.cos(angle) * len;
    const ey    = h + Math.sin(angle) * len;
    const cx    = h + Math.cos(angle + curve * 0.5) * len * 0.52;
    const cy    = h + Math.sin(angle + curve * 0.5) * len * 0.52;
    const a     = alpha * (0.50 + rnd() * 0.40);
    const lw    = 1.5 + rnd() * 4.0;
    const grd   = ctx.createLinearGradient(h, h, ex, ey);
    grd.addColorStop(0, `rgba(${fr},${fg},${fb},${a.toFixed(3)})`);
    grd.addColorStop(1, `rgba(${fr},${fg},${fb},0)`);
    ctx.beginPath();
    ctx.moveTo(h, h);
    ctx.quadraticCurveTo(cx, cy, ex, ey);
    ctx.strokeStyle = grd;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

// Mix characteristic nebula color (75%) with user tint (25%)
function blend(characteristic: number, userVal: number): number {
  return Math.min(255, Math.round(characteristic * 0.75 + userVal * 0.25));
}

const ADD = THREE.AdditiveBlending;
const _Z  = new THREE.Vector3(0, 0, 1);

// ── Emission Nebula (Orion / Eagle / Carina style) ────────────────────────────
// Crimson H-alpha cloud body, teal OIII ionized core, lumpy irregular texture.
function emissionLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  // Ha: deep crimson-red (dominant)
  const Rh = blend(185, R); const Gh = blend(15, G); const Bh = blend(18, B);
  // Second cloud region: slightly more orange-red
  const Rh2 = blend(155, R); const Gh2 = blend(38, G); const Bh2 = blend(10, B);
  // OIII core: teal (fixed, characteristic)
  const Ro = 10; const Go = 148; const Bo = 148;
  // Hot knots: bright orange-white
  const Rk = blend(255, R); const Gk = blend(120, G); const Bk = blend(60, B);

  const texSeed = Math.round(rng() * 999983);
  const blobs = Array.from({ length: 5 }, () => ({
    x:   (rng() - 0.5) * vr * 1.10,
    y:   (rng() - 0.5) * vr * 0.75,
    sx:   0.52 + rng() * 0.72,
    sy:   0.32 + rng() * 0.56,
    rot:  rng() * Math.PI,
    op:   0.25 + rng() * 0.22,
  }));
  const knots = Array.from({ length: 3 }, () => ({
    x: (rng() - 0.5) * vr * 0.55,
    y: (rng() - 0.5) * vr * 0.38,
  }));

  const tHaze = cloudTex(128, Rh, Gh, Bh, 0.45, 0.34);
  const tMain = lumpyCloudTex(256, Rh,  Gh,  Bh,  1.0, texSeed);
  const tBlob = lumpyCloudTex(256, Rh2, Gh2, Bh2, 0.9, texSeed + 11);
  const tOIII = cloudTex(128, Ro, Go, Bo, 0.82, 0.18);
  const tKnot = cloudTex(64,  Rk, Gk, Bk, 1.00, 0.11);

  return [
    { key: 'haze', x: 0, y: 0, rotZ: 0, w: vr * 3.0,  h: vr * 3.0,  tex: tHaze, op: 0.28, blend: ADD, order: -10 },
    { key: 'main', x: 0, y: 0, rotZ: 0, w: vr * 2.10, h: vr * 1.78, tex: tMain, op: 0.55, blend: ADD, order: -9 },
    ...blobs.map((b, i) => ({
      key: `blob${i}`, x: b.x, y: b.y, rotZ: b.rot,
      w: vr * b.sx * 1.45, h: vr * b.sy * 1.45,
      tex: tBlob, op: b.op, blend: ADD, order: -8,
    })),
    { key: 'oiii', x: 0, y: 0, rotZ: 0, w: vr * 0.88, h: vr * 0.88, tex: tOIII, op: 0.55, blend: ADD, order: -7 },
    ...knots.map((k, i) => ({
      key: `knot${i}`, x: k.x, y: k.y, rotZ: 0,
      w: vr * 0.16, h: vr * 0.16,
      tex: tKnot, op: 0.68, blend: ADD, order: -4,
    })),
  ];
}

// ── Planetary Nebula (Ring / Helix style) ─────────────────────────────────────
// Three clean concentric shells: teal inner, blended middle, red outer. White dwarf at centre.
function planetaryLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ellipse = 0.68 + rng() * 0.26;
  const rot2    = rng() * Math.PI;
  // Inner: OIII teal-blue (fixed)
  const Ri = blend(  5, R); const Gi = blend(168, G); const Bi = blend(165, B);
  // Outer: Ha red (fixed)
  const Ro = blend(200, R); const Go = blend( 22, G); const Bo = blend( 20, B);
  // Middle: blend
  const Rm = Math.round((Ri + Ro) / 2);
  const Gm = Math.round((Gi + Go) / 2);
  const Bm = Math.round((Bi + Bo) / 2);

  const tHaze   = cloudTex(128, Ri, Gi, Bi, 0.30, 0.30);
  const tOuter  = ringTex(256,  Ro, Go, Bo, 0.46, 0.68);
  const tMiddle = ringTex(256,  Rm, Gm, Bm, 0.37, 0.84);
  const tInner  = ringTex(256,  Ri, Gi, Bi, 0.28, 1.00);
  const tStar   = cloudTex(64,  255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0, y: 0, rotZ: 0,    w: vr * 2.3,  h: vr * 2.3  * ellipse, tex: tHaze,   op: 0.20, blend: ADD, order: -10 },
    { key: 'outer',  x: 0, y: 0, rotZ: rot2,  w: vr * 1.95, h: vr * 1.95 * ellipse, tex: tOuter,  op: 0.58, blend: ADD, order: -9 },
    { key: 'middle', x: 0, y: 0, rotZ: 0,    w: vr * 1.60, h: vr * 1.60 * ellipse, tex: tMiddle, op: 0.75, blend: ADD, order: -8 },
    { key: 'inner',  x: 0, y: 0, rotZ: 0,    w: vr * 1.30, h: vr * 1.30 * ellipse, tex: tInner,  op: 0.98, blend: ADD, order: -7 },
    { key: 'star',   x: 0, y: 0, rotZ: 0,    w: vr * 0.07, h: vr * 0.07,           tex: tStar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Supernova Remnant (Crab / Veil style) ─────────────────────────────────────
// Filaments are the hero: red outer, blue-white inner. Broken shell ring behind.
function supernovaLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const texSeed    = Math.round(rng() * 999983);
  const brightSide = rng() * Math.PI * 2;
  // Outer filaments: Ha red
  const Rf  = blend(210, R); const Gf  = blend(20, G);  const Bf  = blend(18, B);
  // Inner synchrotron: bright blue-white
  const Rc2 = blend( 80, R); const Gc2 = blend(120, G); const Bc2 = blend(255, B);
  // Shell: muted mixed version
  const Rsh = blend(155, R); const Gsh = blend( 55, G); const Bsh = blend( 95, B);

  const tFilOuter = filamentTex(256, Rf,  Gf,  Bf,  0.90, texSeed);
  const tFilInner = filamentTex(256, Rc2, Gc2, Bc2, 0.75, texSeed + 37);
  const tShell    = ringTex(256,  Rsh, Gsh, Bsh, 0.37, 0.78);
  const tInner    = cloudTex(128, Rc2, Gc2, Bc2, 0.38, 0.40);
  const tPulsar   = cloudTex(64,  230, 245, 255, 1.00, 0.04);

  return [
    { key: 'fil_outer', x: 0, y: 0, rotZ: 0,          w: vr * 2.6,  h: vr * 2.6,  tex: tFilOuter, op: 0.78, blend: ADD, order: -10 },
    { key: 'shell',     x: 0, y: 0, rotZ: brightSide,  w: vr * 2.25, h: vr * 2.25, tex: tShell,    op: 0.55, blend: ADD, order: -9 },
    { key: 'fil_inner', x: 0, y: 0, rotZ: 0.72,        w: vr * 1.50, h: vr * 1.50, tex: tFilInner, op: 0.60, blend: ADD, order: -7 },
    { key: 'inner',     x: 0, y: 0, rotZ: 0,           w: vr * 0.90, h: vr * 0.90, tex: tInner,    op: 0.28, blend: ADD, order: -6 },
    { key: 'pulsar',    x: 0, y: 0, rotZ: 0,           w: vr * 0.06, h: vr * 0.06, tex: tPulsar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Reflection Nebula (Pleiades / Witch Head style) ───────────────────────────
// Blue-white only. Fan of wisps spreading from an off-centre illuminating star.
function reflectionLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const fanAngle  = rng() * Math.PI * 2;
  const halfAngle = 0.65 + rng() * 0.48;
  const texSeed   = Math.round(rng() * 999983);
  const wispsRaw  = Array.from({ length: 7 }, () => ({
    da:  (rng() - 0.5) * halfAngle * 2,
    len:  0.90 + rng() * 1.0,
    wid:  0.12 + rng() * 0.18,
    op:   0.13 + rng() * 0.14,
  }));
  // Always blue-white — reflected starlight. User color ignored except as faint tint.
  const Rb = blend( 28, R); const Gb = blend( 68, G); const Bb = blend(225, B);
  const Rb2 = blend(18, R); const Gb2 = blend(90, G); const Bb2 = blend(255, B);

  const starX = Math.cos(fanAngle + Math.PI) * vr * 0.42;
  const starY = Math.sin(fanAngle + Math.PI) * vr * 0.42;
  const rootX = Math.cos(fanAngle + Math.PI) * vr * 0.12;
  const rootY = Math.sin(fanAngle + Math.PI) * vr * 0.12;
  const wisps = wispsRaw.map(w => ({
    x: rootX, y: rootY,
    rot: fanAngle + w.da,
    len: w.len, wid: w.wid, op: w.op,
  }));

  const tBase  = lumpyCloudTex(128, Rb,  Gb,  Bb,  0.80, texSeed);
  const tWisp  = cloudTex(256,     Rb2, Gb2, Bb2, 0.70, 0.44);
  const tStar  = cloudTex(64,      220, 235, 255, 1.00, 0.05);

  return [
    { key: 'base', x: 0,     y: 0,     rotZ: 0,   w: vr * 1.8,  h: vr * 1.8,  tex: tBase, op: 0.20, blend: ADD, order: -10 },
    ...wisps.map((w, i) => ({
      key: `wisp${i}`, x: w.x, y: w.y, rotZ: w.rot,
      w: vr * w.len, h: vr * w.wid,
      tex: tWisp, op: w.op, blend: ADD, order: -9,
    })),
    { key: 'star', x: starX, y: starY, rotZ: 0,   w: vr * 0.09, h: vr * 0.09, tex: tStar, op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Bipolar Nebula (Butterfly / Hourglass style) ──────────────────────────────
// Two far-apart red lobes with a clear dark gap between them. Off-axis central star.
function bipolarLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  // Lobes are well-separated — the gap is what makes this type recognisable
  const d   = vr * 0.72;
  const lx  = Math.sin(ax) * d;  const ly  = Math.cos(ax) * d;
  const od  = d + vr * 0.30;
  const ox  = Math.sin(ax) * od; const oy  = Math.cos(ax) * od;
  const kd  = d + vr * 0.56;
  const kx  = Math.sin(ax) * kd; const ky  = Math.cos(ax) * kd;

  // Lobes: Ha red-orange
  const Rl = blend(205, R); const Gl = blend(30, G); const Bl = blend(22, B);
  // Outer halo: warmer, slightly orange
  const Ro = blend(175, R); const Go = blend(75, G); const Bo = blend(28, B);
  // Knot tips: bright orange-white
  const Rk = blend(255, R); const Gk = blend(140, G); const Bk = blend(50, B);

  const tHaze  = cloudTex(128, Rl, Gl, Bl, 0.35, 0.30);
  const tLobeO = cloudTex(256, Ro, Go, Bo, 0.55, 0.46);
  const tLobe  = cloudTex(256, Rl, Gl, Bl, 0.92, 0.38);
  const tKnot  = cloudTex(64,  Rk, Gk, Bk, 1.00, 0.10);
  const tStar  = cloudTex(64,  255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0,   y: 0,   rotZ: 0,      w: vr * 2.6,  h: vr * 2.6,  tex: tHaze,  op: 0.16, blend: ADD, order: -10 },
    { key: 'lobeO1', x: ox,  y: oy,  rotZ: lobeRot, w: vr * 0.92, h: vr * 1.55, tex: tLobeO, op: 0.35, blend: ADD, order: -9 },
    { key: 'lobeO2', x: -ox, y: -oy, rotZ: lobeRot, w: vr * 0.92, h: vr * 1.55, tex: tLobeO, op: 0.35, blend: ADD, order: -9 },
    { key: 'lobe1',  x: lx,  y: ly,  rotZ: lobeRot, w: vr * 0.64, h: vr * 1.22, tex: tLobe,  op: 0.84, blend: ADD, order: -8 },
    { key: 'lobe2',  x: -lx, y: -ly, rotZ: lobeRot, w: vr * 0.64, h: vr * 1.22, tex: tLobe,  op: 0.84, blend: ADD, order: -8 },
    { key: 'knot1',  x: kx,  y: ky,  rotZ: 0,       w: vr * 0.22, h: vr * 0.22, tex: tKnot,  op: 0.88, blend: ADD, order: -6 },
    { key: 'knot2',  x: -kx, y: -ky, rotZ: 0,       w: vr * 0.22, h: vr * 0.22, tex: tKnot,  op: 0.88, blend: ADD, order: -6 },
    { key: 'star',   x: 0,   y: 0,   rotZ: 0,       w: vr * 0.06, h: vr * 0.06, tex: tStar,  op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function NebulaObject({ obj, onPositionUpdate }: Props) {
  const groupRef = useRef<THREE.Group>(null);

  const seed = obj.seed ?? Math.abs(obj.name.charCodeAt(0) * 137 + obj.sortOrder * 31);

  const { dir, dist, fixedQuat } = useMemo(() => {
    const rng = mulberry32(seed);
    const theta = rng() * Math.PI * 2;
    const phi   = (rng() * 0.55 + 0.22) * Math.PI;
    const d = new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi) * 0.4,
      Math.sin(phi) * Math.sin(theta),
    ).normalize();
    const dist = 300 + rng() * 80;
    const q = new THREE.Quaternion().setFromUnitVectors(_Z, d.clone().negate());
    return { dir: d, dist, fixedQuat: q };
  }, [seed]);

  const vr = Math.max(obj.size * 2000, 200);

  const layers = useMemo<Layer[]>(() => {
    const [R, G, B] = hexToRgb(obj.colors?.[0] ?? '#9b0d7c');
    const rng = mulberry32(seed + 7);
    const shape = obj.nebulaShape ?? 'emission';
    switch (shape) {
      case 'planetary':  return planetaryLayers(rng, vr, R, G, B);
      case 'supernova':  return supernovaLayers(rng, vr, R, G, B);
      case 'reflection': return reflectionLayers(rng, vr, R, G, B);
      case 'bipolar':    return bipolarLayers(rng, vr, R, G, B);
      default:           return emissionLayers(rng, vr, R, G, B);
    }
  }, [obj.colors, obj.nebulaShape, seed, vr]);

  const breatheT = useRef(0);

  useFrame(({ camera }, delta) => {
    if (!groupRef.current) return;
    groupRef.current.position.copy(camera.position).addScaledVector(dir, dist);
    groupRef.current.quaternion.copy(fixedQuat);
    breatheT.current += delta * 0.18;
    groupRef.current.scale.setScalar(1 + Math.sin(breatheT.current) * 0.016);
  });

  const reported = useRef(false);
  useFrame(({ camera }) => {
    if (reported.current || !onPositionUpdate) return;
    const p = camera.position.clone().addScaledVector(dir, dist);
    onPositionUpdate([p.x, p.y, p.z]);
    reported.current = true;
  });

  return (
    <group ref={groupRef}>
      {layers.map(l => (
        <mesh
          key={l.key}
          position={[l.x, l.y, 0]}
          rotation={[0, 0, l.rotZ]}
          renderOrder={l.order}
        >
          <planeGeometry args={[l.w, l.h]} />
          <meshBasicMaterial
            map={l.tex}
            transparent
            depthWrite={false}
            blending={l.blend}
            opacity={l.op}
          />
        </mesh>
      ))}
    </group>
  );
}
