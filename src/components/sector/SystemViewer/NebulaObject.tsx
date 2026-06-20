import { useEffect, useMemo, useRef } from 'react';
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
  const grd = ctx.createRadialGradient(h, h, 0, h, h, h * 0.82);
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
  // Circular edge mask — fades content to 0 before the canvas boundary so
  // GPU frustum-clipping the plane geometry hits only transparent pixels.
  ctx.globalCompositeOperation = 'destination-out';
  const edgeMask = ctx.createRadialGradient(h, h, h * 0.68, h, h, h * 0.96);
  edgeMask.addColorStop(0, 'rgba(0,0,0,0)');
  edgeMask.addColorStop(1, 'rgba(0,0,0,1)');
  ctx.fillStyle = edgeMask;
  ctx.fillRect(0, 0, size, size);
  ctx.globalCompositeOperation = 'source-over';
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

// Directional cone/fan texture built from soft radial blobs.
// Canvas-top (y=0) → plane local +Y (outward from star) = wide end.
// Canvas-bottom (y=size) → narrow tip at star.
// Edges emerge organically from blob density — no post-process blur masks.
function coneFlareTex(size: number, r: number, g: number, b: number, alpha: number, seed: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const cx = size / 2;
  let s = (seed | 1) >>> 0;
  const rnd = (): number => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };

  // t=0 = outer/wide end, t=1 = tip toward star
  for (let i = 0; i < 160; i++) {
    const t     = rnd();
    const y     = t * size;
    const outer = 1 - t;
    const hw    = size * outer * outer * 0.44;
    if (hw < 2) continue;

    // X spread: mostly within cone but sometimes 15% beyond for natural wispy tendrils
    const xoff   = (rnd() * 2 - 1) * hw * (0.55 + rnd() * 0.60);
    const inside = hw - Math.abs(xoff);          // positive = inside cone, negative = outside
    if (inside < -hw * 0.15) continue;           // too far outside, skip entirely

    // Clamp radius so blob never touches canvas boundary → no hard rectangular clip
    const bx    = cx + xoff;
    const rawBr = hw * (0.15 + rnd() * 0.52);
    const br    = Math.min(rawBr, bx, size - bx, y + 1, size - y) * 0.88;
    if (br < 1) continue;

    // Alpha: heavy random variation + edge falloff → irregular, dynamic boundary
    const edgeFade = Math.min(1, Math.max(0, inside / (hw * 0.30) + rnd() * 0.85));
    const a = alpha * outer * edgeFade * (0.15 + rnd() * 0.28);
    if (a < 0.005) continue;

    const grd = ctx.createRadialGradient(bx, y, 0, bx, y, br);
    grd.addColorStop(0,    `rgba(${r},${g},${b},${a.toFixed(3)})`);
    grd.addColorStop(0.60, `rgba(${r},${g},${b},${(a * 0.30).toFixed(3)})`);
    grd.addColorStop(1,    `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(bx, y, br, 0, Math.PI * 2); ctx.fill();
  }

  // Rim pass: smaller blobs biased near cone edges for subtle brightening
  for (let i = 0; i < 45; i++) {
    const t     = rnd();
    const y     = t * size;
    const outer = 1 - t;
    const hw    = size * outer * outer * 0.44;
    if (hw < 3) continue;
    const side   = rnd() > 0.5 ? 1 : -1;
    const xoff   = side * hw * (0.60 + rnd() * 0.35);
    const inside = hw - Math.abs(xoff);
    const bx     = cx + xoff;
    const rawBr  = hw * 0.10 + 2;
    const br     = Math.min(rawBr, bx, size - bx, y + 1, size - y) * 0.85;
    if (br < 1) continue;
    const edgeFade = Math.min(1, Math.max(0, inside / (hw * 0.25) + rnd() * 0.70));
    const a = alpha * outer * edgeFade * 0.22;
    if (a < 0.005) continue;
    const grd = ctx.createRadialGradient(bx, y, 0, bx, y, br);
    grd.addColorStop(0, `rgba(${r},${g},${b},${a.toFixed(3)})`);
    grd.addColorStop(1, `rgba(${r},${g},${b},0)`);
    ctx.fillStyle = grd;
    ctx.beginPath(); ctx.arc(bx, y, br, 0, Math.PI * 2); ctx.fill();
  }

  // Wide non-linear edge fade: aggressive at the very boundary, long gentle tail.
  // Multi-stop curve gives thinning-gas feel rather than a uniform blur band.
  ctx.globalCompositeOperation = 'destination-out';
  const erode = (x0: number, y0: number, x1: number, y1: number, rx: number, ry: number, rw: number, rh: number) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    g.addColorStop(0,    'rgba(0,0,0,1)');
    g.addColorStop(0.30, 'rgba(0,0,0,0.72)');
    g.addColorStop(0.60, 'rgba(0,0,0,0.28)');
    g.addColorStop(0.85, 'rgba(0,0,0,0.06)');
    g.addColorStop(1,    'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(rx, ry, rw, rh);
  };
  const fS = size * 0.34;   // sides — widest, lobe flanks melt away
  const fO = size * 0.38;   // outer flare end — also very wide
  const fT = size * 0.22;   // tip — narrower, already sparse from blobs
  erode(0,    0,    fS,      0,    0,      0,      fS,   size);
  erode(size, 0,    size-fS, 0,    size-fS, 0,     fS,   size);
  erode(0,    0,    0,       fO,   0,       0,      size, fO  );
  erode(0,    size, 0,   size-fT,  0,       size-fT, size, fT );
  ctx.globalCompositeOperation = 'source-over';

  return new THREE.CanvasTexture(canvas);
}

// ── Bipolar Nebula 0: Lumpy lobes with finger projections ────────────────────
// Two lumpy cloud lobes with finger-like internal projections; outer diffuse halo
// per lobe; extended shaft/cone; no end orbs.
function bipolarLayers0(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  const texSeed = Math.round(rng() * 999983);

  const d  = vr * 0.85;
  const lx = Math.sin(ax) * d;  const ly = Math.cos(ax) * d;
  const od = d + vr * 0.35;
  const ox = Math.sin(ax) * od; const oy = Math.cos(ax) * od;

  const numFingers = 5 + Math.floor(rng() * 4);
  const px = Math.cos(ax); const py = -Math.sin(ax);
  const fingers = Array.from({ length: numFingers }, () => {
    const tAlong = 0.20 + rng() * 0.75;
    const tPerp  = (rng() - 0.5) * 0.42;
    return {
      x:   Math.sin(ax) * d * tAlong + px * vr * tPerp,
      y:   Math.cos(ax) * d * tAlong + py * vr * tPerp,
      rot: -ax + (rng() - 0.5) * 0.45,
      fh:  0.30 + rng() * 0.28,
      op:  0.38 + rng() * 0.35,
    };
  });

  const Rl = blend(208, R); const Gl = blend( 28, G); const Bl = blend( 20, B);
  const Ro = blend(178, R); const Go = blend( 72, G); const Bo = blend( 25, B);
  const Rfp = blend(255, R); const Gfp = blend(108, G); const Bfp = blend( 38, B);

  const tHaze   = cloudTex(128,     Rl,  Gl,  Bl,  0.35, 0.30);
  const tLobeO  = cloudTex(256,     Ro,  Go,  Bo,  0.55, 0.46);
  const tLobe   = lumpyCloudTex(256, Rl,  Gl,  Bl,  1.00, texSeed);
  const tLobe2  = lumpyCloudTex(256, Ro,  Go,  Bo,  0.70, texSeed + 17);
  const tFinger = cloudTex(64,      Rfp, Gfp, Bfp, 0.88, 0.22);
  const tStar   = cloudTex(64,      255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',    x: 0,   y: 0,   rotZ: 0,       w: vr * 2.7,  h: vr * 2.7,  tex: tHaze,   op: 0.16, blend: ADD, order: -10 },
    { key: 'lobeO1',  x: ox,  y: oy,  rotZ: lobeRot,  w: vr * 0.95, h: vr * 1.90, tex: tLobeO,  op: 0.35, blend: ADD, order: -9 },
    { key: 'lobeO2',  x: -ox, y: -oy, rotZ: lobeRot,  w: vr * 0.95, h: vr * 1.90, tex: tLobeO,  op: 0.35, blend: ADD, order: -9 },
    { key: 'lobe1',   x: lx,  y: ly,  rotZ: lobeRot,  w: vr * 0.66, h: vr * 1.60, tex: tLobe,   op: 0.85, blend: ADD, order: -8 },
    { key: 'lobe2',   x: -lx, y: -ly, rotZ: lobeRot,  w: vr * 0.66, h: vr * 1.60, tex: tLobe,   op: 0.85, blend: ADD, order: -8 },
    { key: 'lobe1b',  x: lx,  y: ly,  rotZ: lobeRot + 0.3, w: vr * 0.55, h: vr * 1.40, tex: tLobe2, op: 0.45, blend: ADD, order: -7 },
    { key: 'lobe2b',  x: -lx, y: -ly, rotZ: lobeRot + 0.3, w: vr * 0.55, h: vr * 1.40, tex: tLobe2, op: 0.45, blend: ADD, order: -7 },
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
    { key: 'star',    x: 0,   y: 0,   rotZ: 0,        w: vr * 0.06, h: vr * 0.06, tex: tStar,   op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Bipolar Nebula 1: Shell-rim style with inner H-alpha zones ─────────────────
// Elongated oval shell rim (lumpyRingTex) per lobe; lumpy fill; H-alpha inner zone
// near star; soft outer diffuse halo; warm waist glow at crossing point.
function bipolarLayers1(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  const texSeed = Math.round(rng() * 999983);

  const d  = vr * 0.62;
  const lx = Math.sin(ax) * d;  const ly = Math.cos(ax) * d;

  const Ro = blend( 12, R); const Go = blend(178, G); const Bo = blend(215, B);
  const Rh = blend(228, R); const Gh = blend( 42, G); const Bh = blend( 55, B);
  const Rd = blend(  8, R); const Gd = blend(112, G); const Bd = blend(160, B);
  const Rw = blend(255, R); const Gw = blend(200, G); const Bw = blend(105, B);

  const tHaze  = cloudTex(128,     Rd, Gd, Bd, 0.32, 0.36);
  const tFill  = lumpyCloudTex(256, Ro, Go, Bo, 0.65, texSeed + 11);
  const tInner = lumpyCloudTex(256, Rh, Gh, Bh, 0.80, texSeed + 29);
  const tWaist = cloudTex(128,     Rw, Gw, Bw, 1.00, 0.14);
  const tStar  = cloudTex(64,      255, 255, 255, 1.00, 0.04);

  return [
    { key: 'haze',   x: 0,    y: 0,    rotZ: 0,            w: vr * 3.0,  h: vr * 3.0,  tex: tHaze,  op: 0.12, blend: ADD, order: -10 },
    { key: 'fill1',  x: lx,   y: ly,   rotZ: lobeRot + 0.2, w: vr * 0.64, h: vr * 1.05, tex: tFill,  op: 0.42, blend: ADD, order: -7 },
    { key: 'fill2',  x: -lx,  y: -ly,  rotZ: lobeRot + 0.2, w: vr * 0.64, h: vr * 1.05, tex: tFill,  op: 0.42, blend: ADD, order: -7 },
    { key: 'inn1',   x: lx * 0.52, y: ly * 0.52, rotZ: lobeRot, w: vr * 0.52, h: vr * 0.72, tex: tInner, op: 0.52, blend: ADD, order: -6 },
    { key: 'inn2',   x: -lx * 0.52, y: -ly * 0.52, rotZ: lobeRot, w: vr * 0.52, h: vr * 0.72, tex: tInner, op: 0.52, blend: ADD, order: -6 },
    { key: 'waist',  x: 0,    y: 0,    rotZ: 0,            w: vr * 0.55, h: vr * 0.55, tex: tWaist, op: 0.78, blend: ADD, order: -5 },
    { key: 'star',   x: 0,    y: 0,    rotZ: 0,            w: vr * 0.06, h: vr * 0.06, tex: tStar,  op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Bipolar Nebula 2: Cone/bowtie style ───────────────────────────────────────
// One cone per side: narrow tip at the central star, flaring outward with soft
// blobs and bright rims. Organic, non-geometric boundary via wide edge erosion.
function bipolarLayers2(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax      = rng() * Math.PI;
  const lobeRot = -ax;
  const texSeed = Math.round(rng() * 999983);

  const d  = vr * 0.58;
  const lx = Math.sin(ax) * d;  const ly = Math.cos(ax) * d;
  const lh = d * 2;
  const lw = vr * 0.90;

  const Ro = blend( 12, R); const Go = blend(182, G); const Bo = blend(218, B);
  const Rd = blend(  6, R); const Gd = blend(108, G); const Bd = blend(162, B);
  const Rw = blend(255, R); const Gw = blend(198, G); const Bw = blend(102, B);

  const tCone  = coneFlareTex(256, Ro, Go, Bo, 1.00, texSeed);
  const tGlow  = cloudTex(128,    Rd, Gd, Bd, 0.45, 0.38);
  const tWaist = cloudTex(128,    Rw, Gw, Bw, 1.00, 0.14);
  const tStar  = cloudTex(64,     255, 255, 255, 1.00, 0.04);

  return [
    { key: 'glow1',  x: lx,  y: ly,  rotZ: 0,                   w: lh * 1.05, h: lh * 1.05, tex: tGlow,  op: 0.26, blend: ADD, order: -9 },
    { key: 'glow2',  x: -lx, y: -ly, rotZ: 0,                   w: lh * 1.05, h: lh * 1.05, tex: tGlow,  op: 0.26, blend: ADD, order: -9 },
    { key: 'cone1',  x: lx,  y: ly,  rotZ: lobeRot,             w: lw,        h: lh,        tex: tCone,  op: 0.92, blend: ADD, order: -8 },
    { key: 'cone2',  x: -lx, y: -ly, rotZ: lobeRot + Math.PI,   w: lw,        h: lh,        tex: tCone,  op: 0.92, blend: ADD, order: -8 },
    { key: 'waist',  x: 0,   y: 0,   rotZ: 0,                   w: vr * 0.26, h: vr * 0.26, tex: tWaist, op: 0.82, blend: ADD, order: -5 },
    { key: 'star',   x: 0,   y: 0,   rotZ: 0,                   w: vr * 0.06, h: vr * 0.06, tex: tStar,  op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Wall Nebula (ionization front / Cygnus Wall style) ────────────────────────
// Structure: large dark crimson body filling below the edge; a bright ionization
// front line right at the edge; a short thin fringe fading quickly above it.
// Body blobs are square and randomly rotated — axis only controls placement.
function wallLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  const ax = rng() * Math.PI;
  const axC = Math.cos(ax); const axS = Math.sin(ax);  // along band
  const pxC = -Math.sin(ax); const pxS = Math.cos(ax); // perpendicular, toward fringe

  // Body: deep crimson
  const Rb  = blend(178, R); const Gb  = blend(13,  G); const Bb  = blend(19,  B);
  const Rb2 = blend(205, R); const Gb2 = blend(22,  G); const Bb2 = blend(30,  B);
  // Ionization edge: bright warm pink-white
  const Rr  = blend(255, R); const Gr  = blend(188, G); const Br  = blend(178, B);
  // Fringe: lighter pink-red, fades fast
  const Rfr = blend(215, R); const Gfr = blend( 75, G); const Bfr = blend( 70, B);
  // Background haze: very dark red
  const Rh  = blend(122, R); const Gh  = blend(  7, G); const Bh  = blend(11,  B);

  const texSeed = Math.round(rng() * 999983);
  const edge = vr * 0.20;

  // ── BODY: square blobs distributed along axis, all centered on the body side (perp < 0)
  const numBody = 11 + Math.floor(rng() * 4);
  const bodyBlobs = Array.from({ length: numBody }, (_, i) => {
    const t     = numBody > 1 ? i / (numBody - 1) : 0.5;
    const along = (t - 0.5) * vr * 2.8 + (rng() - 0.5) * vr * 0.32;
    const perp  = -(edge * 0.4 + rng() * vr * 0.72);
    return {
      x:   axC * along + pxC * perp,
      y:   axS * along + pxS * perp,
      rot: rng() * Math.PI,
      sz:  1.05 + rng() * 0.70,
      op:  0.32 + rng() * 0.40,
      alt: i % 3 === 1,
    };
  });

  // ── EDGE KNOTS: bright blobs chained along the ionization front
  const numEdge = 9 + Math.floor(rng() * 6);
  const edgeKnots = Array.from({ length: numEdge }, () => {
    const along   = (rng() - 0.5) * vr * 2.6;
    const perpOff = edge + (rng() - 0.5) * vr * 0.07;
    return {
      x:  axC * along + pxC * perpOff,
      y:  axS * along + pxS * perpOff,
      sz: 0.14 + rng() * 0.20,
      op: 0.62 + rng() * 0.36,
    };
  });

  // ── FRINGE: thin zone just above the edge, fades quickly
  const numFringe = 4 + Math.floor(rng() * 4);
  const fringeBlobs = Array.from({ length: numFringe }, () => {
    const along   = (rng() - 0.5) * vr * 2.2;
    const perpOff = edge + vr * 0.05 + rng() * vr * 0.20;
    return {
      x:  axC * along + pxC * perpOff,
      y:  axS * along + pxS * perpOff,
      sz: 0.20 + rng() * 0.28,
      op: 0.10 + rng() * 0.12,
    };
  });

  const tHaze   = cloudTex(128,      Rh,  Gh,  Bh,  0.40, 0.32);
  const tBody   = lumpyCloudTex(256, Rb,  Gb,  Bb,  1.00, texSeed);
  const tBody2  = lumpyCloudTex(256, Rb2, Gb2, Bb2, 0.88, texSeed + 11);
  const tEdge   = cloudTex(64,       Rr,  Gr,  Br,  1.00, 0.09);
  const tFringe = cloudTex(128,      Rfr, Gfr, Bfr, 0.80, 0.24);

  return [
    { key: 'haze', x: 0, y: 0, rotZ: ax, w: vr * 3.2, h: vr * 2.2, tex: tHaze, op: 0.16, blend: ADD, order: -10 },
    ...bodyBlobs.map((b, i) => ({
      key: `body${i}`, x: b.x, y: b.y, rotZ: b.rot,
      w: vr * b.sz, h: vr * b.sz,
      tex: b.alt ? tBody2 : tBody, op: b.op, blend: ADD, order: -9,
    })),
    ...fringeBlobs.map((f, i) => ({
      key: `fr${i}`, x: f.x, y: f.y, rotZ: 0,
      w: vr * f.sz, h: vr * f.sz,
      tex: tFringe, op: f.op, blend: ADD, order: -7,
    })),
    ...edgeKnots.map((k, i) => ({
      key: `edge${i}`, x: k.x, y: k.y, rotZ: 0,
      w: vr * k.sz, h: vr * k.sz,
      tex: tEdge, op: k.op, blend: ADD, order: -6,
    })),
  ];
}

// ── Diffuse Nebula (Orion M42 style) ─────────────────────────────────────────
// Large billowing hot-pink/magenta body; blue-lavender outer wisps; blazing
// white-cream core; dark dust lane patch with normal blending to occlude emission.
function diffuseLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  // Hot pink/magenta main body
  const Rm  = blend(215, R); const Gm  = blend( 22, G); const Bm  = blend(110, B);
  // Secondary pink (slightly cooler/purpler)
  const Rm2 = blend(175, R); const Gm2 = blend( 35, G); const Bm2 = blend(130, B);
  // Bright inner rose/salmon ionization zone
  const Ri  = blend(255, R); const Gi  = blend( 90, G); const Bi  = blend(150, B);
  // Blue-lavender outer haze
  const Rl  = blend( 82, R); const Gl  = blend( 68, G); const Bl  = blend(195, B);
  // Blue-lavender wisp blobs
  const Rl2 = blend(105, R); const Gl2 = blend( 88, G); const Bl2 = blend(215, B);
  // White-cream core (Trapezium equivalent)
  const Rc  = blend(255, R); const Gc  = blend(232, G); const Bc  = blend(215, B);

  const texSeed = Math.round(rng() * 999983);

  // Scattered pink blob arms — overlap creates the irregular swept silhouette
  const blobs = Array.from({ length: 7 }, (_, i) => ({
    x:    (rng() - 0.5) * vr * 0.90,
    y:    (rng() - 0.5) * vr * 0.65,
    sx:    0.60 + rng() * 0.85,
    sy:    0.42 + rng() * 0.62,
    rot:   rng() * Math.PI,
    op:    0.20 + rng() * 0.30,
    alt:   i % 2 === 1,   // alternate texture for variety
  }));

  // Blue-lavender wisps scattered around the perimeter
  const wisps = Array.from({ length: 6 }, () => ({
    x:  (rng() - 0.5) * vr * 1.35,
    y:  (rng() - 0.5) * vr * 1.35,
    sx:  0.70 + rng() * 1.10,
    sy:  0.45 + rng() * 0.75,
    rot: rng() * Math.PI,
    op:  0.11 + rng() * 0.16,
  }));

  // Dust lane — offset to one side of the core
  const dustA = rng() * Math.PI * 2;
  const dustD = vr * (0.18 + rng() * 0.32);
  const dustX = Math.cos(dustA) * dustD;
  const dustY = Math.sin(dustA) * dustD;
  const dustRot = rng() * Math.PI;

  const tHaze  = cloudTex(128,      Rl,  Gl,  Bl,  0.55, 0.32);
  const tMain  = lumpyCloudTex(256, Rm,  Gm,  Bm,  1.00, texSeed);
  const tBlob  = lumpyCloudTex(256, Rm,  Gm,  Bm,  0.88, texSeed + 7);
  const tBlob2 = lumpyCloudTex(256, Rm2, Gm2, Bm2, 0.82, texSeed + 19);
  const tWisp  = lumpyCloudTex(256, Rl2, Gl2, Bl2, 0.75, texSeed + 31);
  const tInner = cloudTex(128,      Ri,  Gi,  Bi,  0.90, 0.21);
  const tDust  = lumpyCloudTex(256, 32,  12,  6,   0.88, texSeed + 43);
  const tCore  = cloudTex(128,      Rc,  Gc,  Bc,  1.00, 0.11);
  const tStar  = cloudTex(64,       255, 255, 255,  1.00, 0.04);

  return [
    // Wide blue-lavender outer haze
    { key: 'haze',  x: 0, y: 0, rotZ: 0, w: vr * 3.8, h: vr * 3.8, tex: tHaze, op: 0.28, blend: ADD, order: -10 },
    // Perimeter blue-lavender wisps
    ...wisps.map((w, i) => ({
      key: `wisp${i}`, x: w.x, y: w.y, rotZ: w.rot,
      w: vr * w.sx * 1.5, h: vr * w.sy * 1.5,
      tex: tWisp, op: w.op, blend: ADD, order: -9,
    })),
    // Main pink/magenta body
    { key: 'main', x: 0, y: 0, rotZ: 0, w: vr * 2.1, h: vr * 1.85, tex: tMain, op: 0.62, blend: ADD, order: -8 },
    // Scattered blob arms — alternating two textures for irregular colour variation
    ...blobs.map((b, i) => ({
      key: `blob${i}`, x: b.x, y: b.y, rotZ: b.rot,
      w: vr * b.sx * 1.35, h: vr * b.sy * 1.35,
      tex: b.alt ? tBlob2 : tBlob, op: b.op, blend: ADD, order: -7,
    })),
    // Bright inner ionization zone
    { key: 'inner', x: 0, y: 0, rotZ: 0, w: vr * 1.05, h: vr * 0.95, tex: tInner, op: 0.72, blend: ADD, order: -6 },
    // Dark dust lane — NormalBlending occludes the emission below
    { key: 'dust', x: dustX, y: dustY, rotZ: dustRot, w: vr * 1.2, h: vr * 0.95, tex: tDust, op: 0.72, blend: THREE.NormalBlending, order: -5 },
    // Blazing white-cream core
    { key: 'core', x: 0, y: 0, rotZ: 0, w: vr * 0.48, h: vr * 0.48, tex: tCore, op: 0.88, blend: ADD, order: -4 },
    // Central star point
    { key: 'star', x: 0, y: 0, rotZ: 0, w: vr * 0.06, h: vr * 0.06, tex: tStar, op: 1.00, blend: ADD, order: -4 },
  ];
}

// ── Supernova Remnant (Crab / Veil / Cassiopeia A style) ─────────────────────
// Billowing, lumpy cloud body lit from within by a diffuse synchrotron glow, with
// faint filament structure threaded through it and bright shrapnel knots. Unlike the
// other shapes (which lean 75% on a characteristic colour), this is strongly tinted
// to the supplied colour so the whole nebula reads in that hue — it represents the
// explosion that birthed the system's neutron star.
function supernovaLayers(rng: () => number, vr: number, R: number, G: number, B: number): Layer[] {
  // Derive tints directly from the user/neutron-star colour so the hue dominates.
  const wt = (t: number, ch: number) => Math.round(ch + (255 - ch) * t); // toward white
  const dk = (t: number, ch: number) => Math.round(ch * t);              // toward black
  const Rb = wt(0.40, R); const Gb = wt(0.40, G); const Bb = wt(0.40, B); // bright filament
  const Rm = wt(0.12, R); const Gm = wt(0.12, G); const Bm = wt(0.12, B); // mid body (the hue)
  const Rc = wt(0.80, R); const Gc = wt(0.80, G); const Bc = wt(0.80, B); // synchrotron core
  const Rd = dk(0.70, R); const Gd = dk(0.70, G); const Bd = dk(0.70, B); // deep haze

  const texSeed = Math.round(rng() * 999983);

  const blobs = Array.from({ length: 6 }, () => ({
    x:  (rng() - 0.5) * vr * 1.5,
    y:  (rng() - 0.5) * vr * 1.2,
    sx:  0.70 + rng() * 0.80,
    sy:  0.60 + rng() * 0.70,
    rot: rng() * Math.PI,
    op:  0.20 + rng() * 0.22,
  }));
  const knots = Array.from({ length: 6 }, () => ({
    x:  (rng() - 0.5) * vr * 1.4,
    y:  (rng() - 0.5) * vr * 1.4,
    sz:  0.05 + rng() * 0.10,
    op:  0.40 + rng() * 0.40,
  }));

  const tHaze = cloudTex(128,       Rd, Gd, Bd, 0.50, 0.40);
  const tMain = lumpyCloudTex(256,  Rm, Gm, Bm, 1.00, texSeed);
  const tBlob = lumpyCloudTex(256,  Rb, Gb, Bb, 0.85, texSeed + 11);
  const tWeb  = webFilamentTex(256, Rb, Gb, Bb, 0.50, texSeed + 31);
  const tCore = cloudTex(256,       Rc, Gc, Bc, 0.70, 0.28);
  const tKnot = cloudTex(64,        Rc, Gc, Bc, 1.00, 0.10);

  return [
    { key: 'haze', x: 0, y: 0, rotZ: 0,               w: vr * 3.6, h: vr * 3.4, tex: tHaze, op: 0.30, blend: ADD, order: -10 },
    { key: 'main', x: 0, y: 0, rotZ: rng() * Math.PI, w: vr * 2.4, h: vr * 2.0, tex: tMain, op: 0.55, blend: ADD, order: -9 },
    ...blobs.map((b, i) => ({
      key: `blob${i}`, x: b.x, y: b.y, rotZ: b.rot,
      w: vr * b.sx * 1.4, h: vr * b.sy * 1.4,
      tex: tBlob, op: b.op, blend: ADD, order: -8,
    })),
    { key: 'web',  x: 0, y: 0, rotZ: rng() * Math.PI, w: vr * 2.8, h: vr * 2.8, tex: tWeb,  op: 0.28, blend: ADD, order: -7 },
    { key: 'core', x: 0, y: 0, rotZ: 0,               w: vr * 1.1, h: vr * 1.0, tex: tCore, op: 0.45, blend: ADD, order: -6 },
    ...knots.map((k, i) => ({
      key: `knot${i}`, x: k.x, y: k.y, rotZ: 0,
      w: vr * k.sz, h: vr * k.sz,
      tex: tKnot, op: k.op, blend: ADD, order: -5,
    })),
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
      case 'diffuse':     return diffuseLayers(rng, vr, R, G, B);
      case 'wall':        return wallLayers(rng, vr, R, G, B);
      case 'reflection':  return reflectionLayers(rng, vr, R, G, B);
      case 'bipolar0':    return bipolarLayers0(rng, vr, R, G, B);
      case 'bipolar1':    return bipolarLayers1(rng, vr, R, G, B);
      case 'bipolar2':    return bipolarLayers2(rng, vr, R, G, B);
      case 'supernova':   return supernovaLayers(rng, vr, R, G, B);
      default:            return emissionLayers(rng, vr, R, G, B);
    }
  }, [obj.colors, obj.nebulaShape, seed, vr]);

  const breatheT = useRef(0);

  useEffect(() => () => {
    const seen = new Set<THREE.Texture>();
    for (const l of layers) {
      if (!seen.has(l.tex)) { seen.add(l.tex); l.tex.dispose(); }
    }
  }, [layers]);

  useFrame(({ camera }, delta) => {
    // Clamp delta to prevent animation lurches after tab backgrounding
    delta = Math.min(delta, 0.05);

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
          frustumCulled={false}
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

// ── Supernova-remnant backdrop ───────────────────────────────────────────────
// Rendered automatically by SystemScene whenever a system contains a neutron star
// (a neutron star is the remnant of a supernova). Unlike a placed NebulaObject this
// is a VOLUMETRIC shell of camera-facing cloud puffs distributed on an oval around
// the system origin — so it surrounds the system and gives real parallax as the
// camera orbits, rather than being a flat billboard glued to the lens. Tinted to the
// neutron star's colour. Draws behind every scene object (negative renderOrder +
// depthTest off) but in front of the starfield.
interface Puff { pos: [number, number, number]; tex: THREE.Texture; size: number; op: number; }

export function SupernovaBackdrop({ color, seed }: { color: string; seed: number }) {
  const groupRef = useRef<THREE.Group>(null);

  const { puffs, glow, haze } = useMemo(() => {
    const [R, G, B] = hexToRgb(color);
    const rng = mulberry32((seed + 7) >>> 0);
    const wt = (t: number, ch: number) => Math.round(ch + (255 - ch) * t);
    const dk = (t: number, ch: number) => Math.round(ch * t);

    // Three filament tints (bright → hue → deep) plus knots, core glow, outer haze.
    const filaTex = [
      lumpyCloudTex(256, wt(0.42, R), wt(0.42, G), wt(0.42, B), 1.00, Math.round(rng() * 1e6)),
      lumpyCloudTex(256, wt(0.10, R), wt(0.10, G), wt(0.10, B), 0.95, Math.round(rng() * 1e6)),
      lumpyCloudTex(256, dk(0.78, R), dk(0.78, G), dk(0.78, B), 0.90, Math.round(rng() * 1e6)),
    ];
    const knotTex = cloudTex(64,  wt(0.70, R), wt(0.70, G), wt(0.70, B), 1.00, 0.12);
    // Hollow (ring) glow + haze: peaks toward the edges with a clear centre, so the
    // region right around the star stays readable while the surround still glows.
    const glow    = ringTex(256, wt(0.82, R), wt(0.82, G), wt(0.82, B), 0.52, 0.80);
    const haze    = ringTex(256, dk(0.85, R), dk(0.85, G), dk(0.85, B), 0.42, 0.65);

    const baseR = 230; // shell radius — inside the starfield (~400), around the system
    // Random point on an oval shell (Y squashed) at a fraction of the base radius.
    const onShell = (rMul: number): [number, number, number] => {
      const u  = rng() * 2 - 1;
      const th = rng() * Math.PI * 2;
      const s  = Math.sqrt(1 - u * u);
      const r  = baseR * (0.72 + rng() * 0.40) * rMul;
      return [s * Math.cos(th) * r, u * r * 0.70, s * Math.sin(th) * r];
    };

    const puffs: Puff[] = [];
    for (let i = 0; i < 64; i++) {
      puffs.push({
        pos:  onShell(1),
        tex:  filaTex[Math.floor(rng() * filaTex.length)],
        size: baseR * (0.30 + rng() * 0.40),
        op:   0.09 + rng() * 0.15,
      });
    }
    for (let i = 0; i < 9; i++) {
      puffs.push({
        pos:  onShell(0.95),
        tex:  knotTex,
        size: baseR * (0.045 + rng() * 0.06),
        op:   0.45 + rng() * 0.40,
      });
    }
    return { puffs, glow, haze };
  }, [color, seed]);

  useEffect(() => () => {
    const seen = new Set<THREE.Texture>();
    seen.add(glow); glow.dispose();
    seen.add(haze); haze.dispose();
    for (const p of puffs) {
      if (!seen.has(p.tex)) { seen.add(p.tex); p.tex.dispose(); }
    }
  }, [puffs, glow, haze]);

  // Centred on the origin (where the supernova happened) → orbiting gives parallax.
  // A very slow drift keeps it from feeling dead-static.
  useFrame((_, delta) => {
    // Clamp delta to prevent animation lurches after tab backgrounding
    delta = Math.min(delta, 0.05);

    if (groupRef.current) groupRef.current.rotation.y += delta * 0.006;
  });

  return (
    <group ref={groupRef}>
      {/* Overall outer haze + diffuse interior synchrotron glow */}
      <sprite scale={[520, 380, 1]} renderOrder={-12}>
        <spriteMaterial map={haze} transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} opacity={0.34} toneMapped={false} />
      </sprite>
      <sprite scale={[320, 250, 1]} renderOrder={-11}>
        <spriteMaterial map={glow} transparent depthWrite={false} depthTest={false}
          blending={THREE.AdditiveBlending} opacity={0.32} toneMapped={false} />
      </sprite>
      {puffs.map((p, i) => (
        <sprite key={i} position={p.pos} scale={[p.size, p.size, 1]} renderOrder={-10}>
          <spriteMaterial map={p.tex} transparent depthWrite={false} depthTest={false}
            blending={THREE.AdditiveBlending} opacity={p.op} toneMapped={false} />
        </sprite>
      ))}
    </group>
  );
}
