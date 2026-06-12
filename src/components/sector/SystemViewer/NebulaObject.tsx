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

// Soft radial blob
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
  grd.addColorStop(Math.min(1, f + 0.14), `rgba(${r},${g},${b},${(alpha * 0.30).toFixed(3)})`);
  grd.addColorStop(1,                     `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// Wispy bezier strands radiating from centre — for supernova filaments
function filamentTex(size: number, fr: number, fg: number, fb: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  for (let i = 0; i < 22; i++) {
    const angle = (i / 22) * Math.PI * 2 + (rnd() - 0.5) * 0.65;
    const len   = h * (0.30 + rnd() * 0.65);
    const curve = (rnd() - 0.5) * 1.2;
    const ex    = h + Math.cos(angle) * len;
    const ey    = h + Math.sin(angle) * len;
    const cx    = h + Math.cos(angle + curve * 0.5) * len * 0.52;
    const cy    = h + Math.sin(angle + curve * 0.5) * len * 0.52;
    const a     = alpha * (0.45 + rnd() * 0.45);
    const lw    = 1.2 + rnd() * 3.8;
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

const ADD = THREE.AdditiveBlending;
const _Z  = new THREE.Vector3(0, 0, 1);

// ── Emission Nebula (Orion / Eagle / Carina style) ────────────────────────────
// Large irregular H-alpha cloud with teal OIII ionized core. No dark overlays.
function emissionLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  // H-alpha: push hard toward red
  const Rh = Math.min(255, Math.round(R * 0.70 + 115));
  const Gh = Math.min(255, Math.round(G * 0.20 +  10));
  const Bh = Math.min(255, Math.round(B * 0.12 +   6));
  // OIII: teal/cyan at the ionized core
  const Ro = 12;
  const Go = Math.min(255, Math.round(G * 0.35 + 100));
  const Bo = Math.min(255, Math.round(B * 0.55 + 125));
  // Bright knots: lighter version of Ha
  const Rc = Math.min(255, Math.round(Rh + 55));
  const Gc = Math.min(255, Math.round(Gh + 35));
  const Bc = Math.min(255, Math.round(Bh + 45));

  const blobs = Array.from({ length: 6 }, () => ({
    x:   (rng() - 0.5) * vr * 1.10,
    y:   (rng() - 0.5) * vr * 0.75,
    sx:   0.50 + rng() * 0.75,
    sy:   0.30 + rng() * 0.58,
    rot:  rng() * Math.PI,
    op:   0.28 + rng() * 0.20,
  }));
  const knots = Array.from({ length: 4 }, () => ({
    x: (rng() - 0.5) * vr * 0.60,
    y: (rng() - 0.5) * vr * 0.40,
  }));

  const tHaze = cloudTex(128, Rh, Gh, Bh, 0.50, 0.32);
  const tMain = cloudTex(256, Rh, Gh, Bh, 0.85, 0.44);
  const tBlob = cloudTex(256, Rh, Gh, Bh, 0.78, 0.50);
  const tOIII = cloudTex(128, Ro, Go, Bo, 0.80, 0.18);
  const tCore = cloudTex(128, Rc, Gc, Bc, 1.00, 0.14);
  const tKnot = cloudTex(64,  Rc, Gc, Bc, 1.00, 0.12);

  return [
    { key: 'haze', x: 0, y: 0, rotZ: 0, w: vr * 3.0,  h: vr * 3.0,  tex: tHaze, op: 0.30, blend: ADD, order: -10 },
    { key: 'main', x: 0, y: 0, rotZ: 0, w: vr * 2.05, h: vr * 1.75, tex: tMain, op: 0.55, blend: ADD, order: -9 },
    ...blobs.map((b, i) => ({
      key: `blob${i}`, x: b.x, y: b.y, rotZ: b.rot,
      w: vr * b.sx * 1.45, h: vr * b.sy * 1.45,
      tex: tBlob, op: b.op, blend: ADD, order: -8,
    })),
    { key: 'oiii', x: 0, y: 0, rotZ: 0, w: vr * 0.85, h: vr * 0.85, tex: tOIII, op: 0.55, blend: ADD, order: -7 },
    { key: 'core', x: 0, y: 0, rotZ: 0, w: vr * 0.42, h: vr * 0.42, tex: tCore, op: 0.90, blend: ADD, order: -5 },
    ...knots.map((k, i) => ({
      key: `knot${i}`, x: k.x, y: k.y, rotZ: 0,
      w: vr * 0.15, h: vr * 0.15,
      tex: tKnot, op: 0.65, blend: ADD, order: -4,
    })),
  ];
}

// ── Planetary Nebula (Ring / Helix style) ─────────────────────────────────────
// Clean concentric shells: bright blue-green inner ring, red outer ring, white dwarf.
function planetaryLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ellipse = 0.70 + rng() * 0.24;
  const rot2    = rng() * Math.PI;
  // Inner shell: OIII blue-green
  const Ri = Math.min(255, Math.round(R * 0.10 + 15));
  const Gi = Math.min(255, Math.round(G * 0.50 + 92));
  const Bi = Math.min(255, Math.round(B * 0.72 + 122));
  // Outer shell: Ha red
  const Ro = Math.min(255, Math.round(R * 0.62 + 88));
  const Go = Math.min(255, Math.round(G * 0.20 + 16));
  const Bo = Math.min(255, Math.round(B * 0.20 + 20));
  // Middle blend
  const Rm = Math.min(255, Math.round((Ri + Ro) / 2));
  const Gm = Math.min(255, Math.round((Gi + Go) / 2));
  const Bm = Math.min(255, Math.round((Bi + Bo) / 2));

  const tHaze   = cloudTex(128, Ri, Gi, Bi, 0.35, 0.28);
  const tOuter  = ringTex(256,  Ro, Go, Bo, 0.46, 0.65);
  const tMiddle = ringTex(256,  Rm, Gm, Bm, 0.37, 0.82);
  const tInner  = ringTex(256,  Ri, Gi, Bi, 0.28, 1.00);
  const tStar   = cloudTex(64,  255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0, y: 0, rotZ: 0,    w: vr * 2.3,  h: vr * 2.3  * ellipse, tex: tHaze,   op: 0.20, blend: ADD, order: -10 },
    { key: 'outer',  x: 0, y: 0, rotZ: rot2,  w: vr * 1.92, h: vr * 1.92 * ellipse, tex: tOuter,  op: 0.55, blend: ADD, order: -9 },
    { key: 'middle', x: 0, y: 0, rotZ: 0,    w: vr * 1.58, h: vr * 1.58 * ellipse, tex: tMiddle, op: 0.72, blend: ADD, order: -8 },
    { key: 'inner',  x: 0, y: 0, rotZ: 0,    w: vr * 1.28, h: vr * 1.28 * ellipse, tex: tInner,  op: 0.95, blend: ADD, order: -7 },
    { key: 'star',   x: 0, y: 0, rotZ: 0,    w: vr * 0.07, h: vr * 0.07,           tex: tStar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Supernova Remnant (Crab / Veil style) ─────────────────────────────────────
// Dominant radiating filaments + broken shell; blue-white inner, red outer.
function supernovaLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const texSeed    = Math.round(rng() * 999983);
  const brightSide = rng() * Math.PI * 2;
  // Outer filaments: Ha red
  const Rf  = Math.min(255, Math.round(R * 0.88 + 100));
  const Gf  = Math.min(255, Math.round(G * 0.16 +  10));
  const Bf  = Math.min(255, Math.round(B * 0.24 +  15));
  // Inner synchrotron: blue-white
  const Rc2 = Math.min(255, Math.round(R * 0.25 +  42));
  const Gc2 = Math.min(255, Math.round(G * 0.45 +  72));
  const Bc2 = Math.min(255, Math.round(B * 0.78 + 118));
  // Shell: base color shifted
  const Rsh = Math.min(255, Math.round(R * 0.92 + 45));
  const Gsh = Math.min(255, Math.round(G * 0.45 + 20));
  const Bsh = Math.min(255, Math.round(B * 0.62 + 50));

  const tFilOuter = filamentTex(256, Rf,  Gf,  Bf,  0.88, texSeed);
  const tFilInner = filamentTex(256, Rc2, Gc2, Bc2, 0.72, texSeed + 37);
  const tShell1   = ringTex(256,  Rsh, Gsh, Bsh, 0.37, 0.82);
  const tShell2   = ringTex(256,  Rsh, Gsh, Bsh, 0.32, 0.58);
  const tInner    = cloudTex(128, Rc2, Gc2, Bc2, 0.42, 0.38);
  const tPulsar   = cloudTex(64,  220, 240, 255, 1.00, 0.04);

  return [
    { key: 'fil_outer', x: 0, y: 0, rotZ: 0,         w: vr * 2.55, h: vr * 2.55, tex: tFilOuter, op: 0.75, blend: ADD, order: -10 },
    { key: 'shell1',    x: 0, y: 0, rotZ: brightSide, w: vr * 2.25, h: vr * 2.25, tex: tShell1,   op: 0.60, blend: ADD, order: -9 },
    { key: 'shell2',    x: 0, y: 0, rotZ: 0.42,       w: vr * 1.90, h: vr * 1.90, tex: tShell2,   op: 0.30, blend: ADD, order: -8 },
    { key: 'fil_inner', x: 0, y: 0, rotZ: 0.72,       w: vr * 1.45, h: vr * 1.45, tex: tFilInner, op: 0.55, blend: ADD, order: -7 },
    { key: 'inner',     x: 0, y: 0, rotZ: 0,          w: vr * 0.90, h: vr * 0.90, tex: tInner,    op: 0.25, blend: ADD, order: -6 },
    { key: 'pulsar',    x: 0, y: 0, rotZ: 0,          w: vr * 0.06, h: vr * 0.06, tex: tPulsar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Reflection Nebula (Pleiades / Witch Head style) ───────────────────────────
// Always blue; fan-shaped wisps spreading from an off-centre illuminating star.
function reflectionLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const fanAngle  = rng() * Math.PI * 2;
  const halfAngle = 0.65 + rng() * 0.48;
  const wispsRaw  = Array.from({ length: 7 }, () => ({
    da:  (rng() - 0.5) * halfAngle * 2,
    len:  0.90 + rng() * 1.00,
    wid:  0.12 + rng() * 0.17,
    op:   0.13 + rng() * 0.14,
  }));
  // Force strongly blue regardless of input color
  const Rb = Math.min(255, Math.round(R * 0.10 + 20));
  const Gb = Math.min(255, Math.round(G * 0.30 + 58));
  const Bb = Math.min(255, Math.round(B * 0.80 + 118));

  // Star is offset in the direction opposite to the fan opening
  const starX = Math.cos(fanAngle + Math.PI) * vr * 0.40;
  const starY = Math.sin(fanAngle + Math.PI) * vr * 0.40;
  // Wisp roots are near the star
  const rootX = Math.cos(fanAngle + Math.PI) * vr * 0.10;
  const rootY = Math.sin(fanAngle + Math.PI) * vr * 0.10;
  const wisps = wispsRaw.map(w => ({
    x: rootX, y: rootY,
    rot: fanAngle + w.da,
    len: w.len, wid: w.wid, op: w.op,
  }));

  const tBase = cloudTex(128, Rb, Gb, Bb, 0.45, 0.32);
  const tWisp = cloudTex(256, Rb, Gb, Bb, 0.72, 0.44);
  const tStar = cloudTex(64,  210, 228, 255, 1.00, 0.05);

  return [
    { key: 'base', x: 0,     y: 0,     rotZ: 0,   w: vr * 2.1,  h: vr * 2.1,  tex: tBase, op: 0.18, blend: ADD, order: -10 },
    ...wisps.map((w, i) => ({
      key: `wisp${i}`, x: w.x, y: w.y, rotZ: w.rot,
      w: vr * w.len, h: vr * w.wid,
      tex: tWisp, op: w.op, blend: ADD, order: -9,
    })),
    { key: 'star', x: starX, y: starY, rotZ: 0,   w: vr * 0.09, h: vr * 0.09, tex: tStar, op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Bipolar Nebula (Butterfly / Hourglass style) ──────────────────────────────
// Two well-separated Ha-red lobes; outer halos; bright central star.
function bipolarLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  // Inner lobes: tightly separated
  const d  = vr * 0.64;
  const lx = Math.sin(ax) * d;   const ly = Math.cos(ax) * d;
  // Outer halos: further out
  const od = d + vr * 0.32;
  const ox = Math.sin(ax) * od;  const oy = Math.cos(ax) * od;
  // Tips/knots: at the very ends
  const kd = d + vr * 0.54;
  const kx = Math.sin(ax) * kd;  const ky = Math.cos(ax) * kd;
  // Lobes: Ha red
  const Rl = Math.min(255, Math.round(R * 0.78 + 108));
  const Gl = Math.min(255, Math.round(G * 0.16 +  10));
  const Bl = Math.min(255, Math.round(B * 0.25 +  15));
  // Outer halo: softer warm tint
  const Rc = Math.min(255, Math.round(R * 1.10 + 85));
  const Gc = Math.min(255, Math.round(G * 1.05 + 70));
  const Bc = Math.min(255, Math.round(B * 1.05 + 85));

  const tHaze  = cloudTex(128, R,   G,   B,   0.38, 0.28);
  const tLobeO = cloudTex(256, Rc,  Gc,  Bc,  0.55, 0.46);
  const tLobe  = cloudTex(256, Rl,  Gl,  Bl,  0.92, 0.38);
  const tKnot  = cloudTex(64,  Rc,  Gc,  Bc,  1.00, 0.10);
  const tStar  = cloudTex(64,  255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0,   y: 0,   rotZ: 0,      w: vr * 2.8,  h: vr * 2.8,  tex: tHaze,  op: 0.18, blend: ADD, order: -10 },
    { key: 'lobeO1', x: ox,  y: oy,  rotZ: lobeRot, w: vr * 0.90, h: vr * 1.52, tex: tLobeO, op: 0.35, blend: ADD, order: -9 },
    { key: 'lobeO2', x: -ox, y: -oy, rotZ: lobeRot, w: vr * 0.90, h: vr * 1.52, tex: tLobeO, op: 0.35, blend: ADD, order: -9 },
    { key: 'lobe1',  x: lx,  y: ly,  rotZ: lobeRot, w: vr * 0.63, h: vr * 1.20, tex: tLobe,  op: 0.82, blend: ADD, order: -8 },
    { key: 'lobe2',  x: -lx, y: -ly, rotZ: lobeRot, w: vr * 0.63, h: vr * 1.20, tex: tLobe,  op: 0.82, blend: ADD, order: -8 },
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
