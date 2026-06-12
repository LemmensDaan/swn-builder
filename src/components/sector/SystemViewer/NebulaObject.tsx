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

// Tangled web of filaments — strands start/end anywhere, creating a chaotic crosshatch
function webFilamentTex(size: number, fr: number, fg: number, fb: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  for (let i = 0; i < 38; i++) {
    // Start anywhere within inner 65% of the canvas
    const sa = rnd() * Math.PI * 2;
    const sd = h * rnd() * 0.65;
    const sx = h + Math.cos(sa) * sd;
    const sy = h + Math.sin(sa) * sd;
    // End anywhere, biased toward the outer zone
    const ea = rnd() * Math.PI * 2;
    const ed = h * (0.30 + rnd() * 0.65);
    const ex = h + Math.cos(ea) * ed;
    const ey = h + Math.sin(ea) * ed;
    // Curved control point
    const mx = (sx + ex) / 2 + (rnd() - 0.5) * h * 0.55;
    const my = (sy + ey) / 2 + (rnd() - 0.5) * h * 0.55;
    const a  = alpha * (0.42 + rnd() * 0.45);
    const lw = 0.7 + rnd() * 3.0;
    // Strand is visible along its whole length (fades at endpoints only)
    const grd = ctx.createLinearGradient(sx, sy, ex, ey);
    grd.addColorStop(0,    `rgba(${fr},${fg},${fb},0)`);
    grd.addColorStop(0.12, `rgba(${fr},${fg},${fb},${a.toFixed(3)})`);
    grd.addColorStop(0.88, `rgba(${fr},${fg},${fb},${a.toFixed(3)})`);
    grd.addColorStop(1,    `rgba(${fr},${fg},${fb},0)`);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.quadraticCurveTo(mx, my, ex, ey);
    ctx.strokeStyle = grd;
    ctx.lineWidth = lw;
    ctx.stroke();
  }
  return new THREE.CanvasTexture(canvas);
}

// Ring with lumpy knot-etchings along the edge — characteristic of planetary nebula shells
function lumpyRingTex(size: number, r: number, g: number, b: number, innerFrac: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const h = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  const f = innerFrac;
  // Base smooth ring
  const grd = ctx.createRadialGradient(h, h, 0, h, h, h);
  grd.addColorStop(0,                     `rgba(${r},${g},${b},0)`);
  grd.addColorStop(f * 0.50,              `rgba(${r},${g},${b},${(alpha * 0.06).toFixed(3)})`);
  grd.addColorStop(f * 0.85,              `rgba(${r},${g},${b},${(alpha * 0.50).toFixed(3)})`);
  grd.addColorStop(f,                     `rgba(${r},${g},${b},${alpha.toFixed(3)})`);
  grd.addColorStop(Math.min(1, f + 0.12), `rgba(${r},${g},${b},${(alpha * 0.22).toFixed(3)})`);
  grd.addColorStop(1,                     `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, size, size);

  // Knot etchings dotted around the ring edge
  const ringR    = h * f;
  const knotCount = 14 + Math.floor(rnd() * 8);
  for (let i = 0; i < knotCount; i++) {
    const angle = (i / knotCount) * Math.PI * 2 + rnd() * 0.5;
    const kRad  = ringR * (0.87 + rnd() * 0.26);
    const kx    = h + Math.cos(angle) * kRad;
    const ky    = h + Math.sin(angle) * kRad;
    const kr    = h * (0.030 + rnd() * 0.055);
    const ka    = alpha * (0.45 + rnd() * 0.42);
    const kgrd  = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr);
    kgrd.addColorStop(0, `rgba(${r},${g},${b},${ka.toFixed(3)})`);
    kgrd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = kgrd;
    ctx.beginPath();
    ctx.arc(kx, ky, kr, 0, Math.PI * 2);
    ctx.fill();
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

// ── Planetary Nebula (Ring / Helix / Hourglass style) ────────────────────────
// Three lumpy-edged shells in distinct emission-line colours + inner hot glow + white dwarf.
function planetaryLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ellipse  = 0.68 + rng() * 0.26;
  const rot2     = rng() * Math.PI;
  const texSeedO = Math.round(rng() * 999983);
  const texSeedM = texSeedO + 13;
  const texSeedI = texSeedO + 29;
  // Outer shell: nitrogen red
  const Rn = blend(200, R); const Gn = blend( 22, G); const Bn = blend( 20, B);
  // Middle shell: hydrogen green
  const Rg = blend( 22, R); const Gg = blend(162, G); const Bg = blend( 58, B);
  // Inner shell: OIII teal-blue
  const Ri = blend(  5, R); const Gi = blend(165, G); const Bi = blend(210, B);
  // Innermost hot glow: blue-white
  const Rw = blend( 80, R); const Gw = blend(140, G); const Bw = blend(255, B);

  const tHaze   = cloudTex(128,    Ri, Gi, Bi, 0.28, 0.34);
  const tOuter  = lumpyRingTex(256, Rn, Gn, Bn, 0.46, 0.72, texSeedO);
  const tMiddle = lumpyRingTex(256, Rg, Gg, Bg, 0.36, 0.88, texSeedM);
  const tInner  = lumpyRingTex(256, Ri, Gi, Bi, 0.27, 1.00, texSeedI);
  const tGlow   = cloudTex(128,    Rw, Gw, Bw, 0.50, 0.20);
  const tStar   = cloudTex(64,     255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0, y: 0, rotZ: 0,    w: vr * 2.35, h: vr * 2.35 * ellipse, tex: tHaze,   op: 0.18, blend: ADD, order: -10 },
    { key: 'outer',  x: 0, y: 0, rotZ: rot2,  w: vr * 2.02, h: vr * 2.02 * ellipse, tex: tOuter,  op: 0.62, blend: ADD, order: -9 },
    { key: 'middle', x: 0, y: 0, rotZ: 0,    w: vr * 1.64, h: vr * 1.64 * ellipse, tex: tMiddle, op: 0.78, blend: ADD, order: -8 },
    { key: 'inner',  x: 0, y: 0, rotZ: 0,    w: vr * 1.30, h: vr * 1.30 * ellipse, tex: tInner,  op: 0.98, blend: ADD, order: -7 },
    { key: 'glow',   x: 0, y: 0, rotZ: 0,    w: vr * 0.80, h: vr * 0.80 * ellipse, tex: tGlow,   op: 0.42, blend: ADD, order: -6 },
    { key: 'star',   x: 0, y: 0, rotZ: 0,    w: vr * 0.07, h: vr * 0.07,           tex: tStar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Supernova Remnant (Crab / Veil style) ─────────────────────────────────────
// Tangled web of crossed filaments in three colour zones; no clean rings.
function supernovaLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const seed1      = Math.round(rng() * 999983);
  const seed2      = seed1 + 73;
  const seed3      = seed1 + 151;
  const seed4      = seed1 + 229;
  const brightSide = rng() * Math.PI * 2;
  // Orange-red hydrogen filaments (outermost, dominant)
  const Rf  = blend(220, R); const Gf  = blend( 75, G); const Bf  = blend( 12, B);
  // Green sulphur filaments (middle zone)
  const Rg2 = blend( 18, R); const Gg2 = blend(182, G); const Bg2 = blend( 75, B);
  // Blue-white inner synchrotron web
  const Rb  = blend( 55, R); const Gb  = blend(108, G); const Bb  = blend(255, B);
  // Faint outer shell ring
  const Rsh = blend(148, R); const Gsh = blend( 52, G); const Bsh = blend( 92, B);

  const tWebOuter  = webFilamentTex(256, Rf,  Gf,  Bf,  0.88, seed1);
  const tWebOuter2 = webFilamentTex(256, Rf,  Gf,  Bf,  0.65, seed2); // second pass, more chaos
  const tWebGreen  = webFilamentTex(256, Rg2, Gg2, Bg2, 0.60, seed3);
  const tWebBlue   = webFilamentTex(256, Rb,  Gb,  Bb,  0.72, seed4);
  const tShell     = ringTex(256,   Rsh, Gsh, Bsh, 0.37, 0.65);
  const tInner     = cloudTex(128,  Rb,  Gb,  Bb,  0.42, 0.38);
  const tPulsar    = cloudTex(64,   230, 245, 255, 1.00, 0.04);

  return [
    { key: 'web_outer',  x: 0, y: 0, rotZ: 0,          w: vr * 2.65, h: vr * 2.65, tex: tWebOuter,  op: 0.78, blend: ADD, order: -10 },
    { key: 'web_outer2', x: 0, y: 0, rotZ: 1.05,        w: vr * 2.40, h: vr * 2.40, tex: tWebOuter2, op: 0.50, blend: ADD, order: -9 },
    { key: 'shell',      x: 0, y: 0, rotZ: brightSide,  w: vr * 2.25, h: vr * 2.25, tex: tShell,     op: 0.38, blend: ADD, order: -8 },
    { key: 'web_green',  x: 0, y: 0, rotZ: 0.38,        w: vr * 1.90, h: vr * 1.90, tex: tWebGreen,  op: 0.45, blend: ADD, order: -7 },
    { key: 'web_blue',   x: 0, y: 0, rotZ: 0.72,        w: vr * 1.48, h: vr * 1.48, tex: tWebBlue,   op: 0.60, blend: ADD, order: -6 },
    { key: 'inner',      x: 0, y: 0, rotZ: 0,           w: vr * 0.88, h: vr * 0.88, tex: tInner,     op: 0.30, blend: ADD, order: -5 },
    { key: 'pulsar',     x: 0, y: 0, rotZ: 0,           w: vr * 0.06, h: vr * 0.06, tex: tPulsar,    op: 1.00, blend: ADD, order: -4 },
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
// Two long tapered lobes extending from a pinched waist; finger-like internal projections.
function bipolarLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  const texSeed = Math.round(rng() * 999983);

  // Geometry — lobes pushed further out and taller for long shaft/cone appearance
  const d  = vr * 0.92;
  const lx = Math.sin(ax) * d;        const ly = Math.cos(ax) * d;

  // Finger projections scattered inside each lobe, pointing roughly toward centre
  const numFingers = 5 + Math.floor(rng() * 4);
  const px = Math.cos(ax); const py = -Math.sin(ax);
  const fingers = Array.from({ length: numFingers }, () => {
    const tAlong = 0.20 + rng() * 0.75;
    const tPerp  = (rng() - 0.5) * 0.42;
    return {
      x:   Math.sin(ax) * d * tAlong + px * vr * tPerp,
      y:   Math.cos(ax) * d * tAlong + py * vr * tPerp,
      rot: -ax + (rng() - 0.5) * 0.45,
      fh:  0.38 + rng() * 0.34,
      op:  0.38 + rng() * 0.35,
    };
  });

  // Lobe colours
  const Rl = blend(208, R); const Gl = blend( 28, G); const Bl = blend( 20, B);
  // Second lobe pass: slightly warmer/orange
  const Ro = blend(178, R); const Go = blend( 72, G); const Bo = blend( 25, B);
  // Finger projections: bright warm
  const Rfp = blend(255, R); const Gfp = blend(108, G); const Bfp = blend( 38, B);

  const tHaze   = cloudTex(128,     Rl,  Gl,  Bl,  0.35, 0.30);
  const tLobe   = lumpyCloudTex(256, Rl,  Gl,  Bl,  1.00, texSeed);
  const tLobe2  = lumpyCloudTex(256, Ro,  Go,  Bo,  0.70, texSeed + 17);
  const tFinger = cloudTex(64,      Rfp, Gfp, Bfp, 0.88, 0.22);
  const tStar   = cloudTex(64,      255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0,   y: 0,   rotZ: 0,            w: vr * 2.7,  h: vr * 2.7,  tex: tHaze,  op: 0.16, blend: ADD, order: -10 },
    { key: 'lobe1',  x: lx,  y: ly,  rotZ: lobeRot,       w: vr * 0.68, h: vr * 1.72, tex: tLobe,  op: 0.85, blend: ADD, order: -8 },
    { key: 'lobe2',  x: -lx, y: -ly, rotZ: lobeRot,       w: vr * 0.68, h: vr * 1.72, tex: tLobe,  op: 0.85, blend: ADD, order: -8 },
    { key: 'lobe1b', x: lx,  y: ly,  rotZ: lobeRot + 0.3, w: vr * 0.56, h: vr * 1.52, tex: tLobe2, op: 0.45, blend: ADD, order: -7 },
    { key: 'lobe2b', x: -lx, y: -ly, rotZ: lobeRot + 0.3, w: vr * 0.56, h: vr * 1.52, tex: tLobe2, op: 0.45, blend: ADD, order: -7 },
    ...fingers.map((f, i) => ({
      key: `fa${i}`, x: f.x, y: f.y, rotZ: f.rot,
      w: vr * 0.10, h: vr * f.fh,
      tex: tFinger, op: f.op, blend: ADD, order: -6,
    })),
    ...fingers.map((f, i) => ({
      key: `fb${i}`, x: -f.x, y: -f.y, rotZ: f.rot + Math.PI,
      w: vr * 0.10, h: vr * f.fh,
      tex: tFinger, op: f.op, blend: ADD, order: -6,
    })),
    { key: 'star',   x: 0,   y: 0,   rotZ: 0,            w: vr * 0.06, h: vr * 0.06, tex: tStar,  op: 1.00, blend: ADD, order: -4 },
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
