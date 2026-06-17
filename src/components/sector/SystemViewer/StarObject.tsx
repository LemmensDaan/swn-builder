import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { getOrbitPosition } from './orbitUtils';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

// ─── Shared glow texture ───────────────────────────────────────────────────────

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

// ─── Black hole accretion disk ────────────────────────────────────────────────

function makeBlackHoleAccretionDisk(baseHex: string, size: number, hq: boolean): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hue = Math.round(hsl.h * 360);

  const texCanvas = document.createElement('canvas');
  texCanvas.width = 512; texCanvas.height = 1;
  const texCtx = texCanvas.getContext('2d')!;
  const grad = texCtx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0,    'rgba(255,255,255,1)');
  grad.addColorStop(0.05, 'rgba(255,248,220,1)');
  grad.addColorStop(0.15, `hsla(${hue},100%,72%,1)`);
  grad.addColorStop(0.38, `hsla(${hue},95%,52%,0.92)`);
  grad.addColorStop(0.62, `hsla(${hue},85%,32%,0.55)`);
  grad.addColorStop(0.84, `hsla(${hue},70%,18%,0.14)`);
  grad.addColorStop(1,    'rgba(0,0,0,0)');
  texCtx.fillStyle = grad;
  texCtx.fillRect(0, 0, 512, 1);
  const diskTex = new THREE.CanvasTexture(texCanvas);

  const innerR = size * 1.12;
  const outerR = size * 5.8;
  const ringGeo = new THREE.RingGeometry(innerR, outerR, hq ? 128 : 64, hq ? 8 : 4);
  const posAttr = ringGeo.attributes.position as THREE.BufferAttribute;
  const uvAttr  = ringGeo.attributes.uv  as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const r = Math.sqrt(x * x + y * y);
    const t = (r - innerR) / (outerR - innerR);
    uvAttr.setXY(i, Math.max(0, Math.min(1, t)), 0.5);
  }
  uvAttr.needsUpdate = true;

  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex, side: THREE.DoubleSide, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
  });

  const disk1 = new THREE.Mesh(ringGeo, diskMat);
  disk1.rotation.x = -Math.PI / 2;
  group.add(disk1);

  const disk2 = new THREE.Mesh(ringGeo, diskMat.clone());
  disk2.rotation.x = -Math.PI / 2;
  disk2.scale.setScalar(0.96);
  group.add(disk2);

  return group;
}

// ─── Black hole orbiting debris chunks ────────────────────────────────────────

interface ChunkOrbit { radius: number; speed: number; }

function makeBlackHoleChunks(
  baseHex: string, size: number, rng: () => number, hq: boolean,
): { group: THREE.Group; orbits: ChunkOrbit[] } {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const innerR = size * 1.35;
  const outerR = size * 5.2;
  const count  = hq ? 80 : 36;
  const orbits: ChunkOrbit[] = [];

  for (let i = 0; i < count; i++) {
    const t      = Math.pow(rng(), 1.6);
    const radius = innerR + t * (outerR - innerR);
    const normR  = (radius - innerR) / (outerR - innerR);
    const speed  = 1.6 / Math.sqrt(radius / size);
    const angle  = rng() * Math.PI * 2;

    const sizeClass = rng();
    const baseSize  = sizeClass < 0.55
      ? size * (0.025 + rng() * 0.04)
      : sizeClass < 0.85
      ? size * (0.07  + rng() * 0.07)
      : size * (0.10  + rng() * 0.12);
    const chunkSize = baseSize * (0.8 + normR * 0.5);

    const lightness  = 0.85 - normR * 0.52;
    const saturation = 0.15 + normR * 0.85;
    const chunkColor = new THREE.Color().setHSL(hsl.h, Math.min(1, saturation), lightness);

    const geo = rng() > 0.45
      ? new THREE.TetrahedronGeometry(chunkSize)
      : new THREE.IcosahedronGeometry(chunkSize, 0);

    const mat = new THREE.MeshLambertMaterial({
      color: chunkColor, emissive: chunkColor,
      emissiveIntensity: 0.25 + (1 - normR) * 0.4,
      flatShading: true, toneMapped: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isStar = true;
    mesh.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    mesh.userData.selfRot = (rng() - 0.5) * 1.8;
    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.add(mesh);
    orbits.push({ radius, speed });
  }

  return { group, orbits };
}

// ─── Solar prominence lifecycle ────────────────────────────────────────────────
// Arch flares: form quickly → whole arch grows outward → dissipate in place or eject as CME
// Linear jets: form → travel outward as expanding blob while fading

const PROM_N        = 36;
const STREAK_ASPECT = 1.1;

let _pStreakTex: THREE.Texture            | null = null;
let _pPlaneGeo: THREE.PlaneGeometry       | null = null;
let _pIco:      THREE.IcosahedronGeometry | null = null;
let _pTet:      THREE.TetrahedronGeometry | null = null;

function getIco() { if (!_pIco) _pIco = new THREE.IcosahedronGeometry(1, 0); return _pIco; }
function getTet() { if (!_pTet) _pTet = new THREE.TetrahedronGeometry(1);    return _pTet; }

// Reusable vectors for orientStreak — avoids per-frame allocation
const _sN  = new THREE.Vector3();
const _sUp = new THREE.Vector3();
const _sR  = new THREE.Vector3();
const _sM4 = new THREE.Matrix4();
const _sWP = new THREE.Vector3();  // world position temp
const _gp  = new THREE.Vector3();  // grown position temp

function getPromStreakTex(): THREE.Texture {
  if (_pStreakTex) return _pStreakTex;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  // Simple circular radial glow — plane scale (baseLen × baseWid) creates the elongation
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0,    'rgba(255,255,255,1)');
  g.addColorStop(0.18, 'rgba(255,255,255,0.95)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.50)');
  g.addColorStop(0.75, 'rgba(255,255,255,0.12)');
  g.addColorStop(1,    'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  _pStreakTex = new THREE.CanvasTexture(canvas);
  return _pStreakTex;
}

function getPromPlaneGeo(): THREE.PlaneGeometry {
  if (!_pPlaneGeo) _pPlaneGeo = new THREE.PlaneGeometry(1, 1);
  return _pPlaneGeo;
}

// Sine-weighted position: base particles (tParam≈0/1) stay at star surface,
// apex particle (tParam≈0.5) lifts by growScale. Used for growing/ejecting/dissipating.
function getGrownPos(p: PromParticle, growScale: number, out: THREE.Vector3): THREE.Vector3 {
  const sineW = Math.sin(p.tParam * Math.PI);
  return out.copy(p.basePos).multiplyScalar(1 + (growScale - 1) * sineW);
}

// Orient mesh to face camera with Y-axis (length) along arc tangent.
// Uses world position so it stays correct when slotGroup is scaled/translated.
function orientStreak(mesh: THREE.Mesh, tangent: THREE.Vector3, camPos: THREE.Vector3): void {
  mesh.getWorldPosition(_sWP);
  _sN.subVectors(camPos, _sWP).normalize();
  const tDotN = tangent.dot(_sN);
  _sUp.copy(tangent).addScaledVector(_sN, -tDotN);
  if (_sUp.lengthSq() < 1e-6) return;
  _sUp.normalize();
  _sR.crossVectors(_sUp, _sN);
  _sM4.makeBasis(_sR, _sUp, _sN);
  mesh.quaternion.setFromRotationMatrix(_sM4);
}

interface PromParticle {
  mesh:    THREE.Mesh;
  poly:    THREE.Mesh;
  polyRx:  number;
  polyRy:  number;
  polyRz:  number;
  tangent: THREE.Vector3;
  basePos: THREE.Vector3;
  tParam:  number;   // curve parameter 0-1: 0 & 1 = base (star surface), 0.5 = apex
  baseOp:  number;
  baseLen: number;
  baseWid: number;
}

interface PromSlot {
  slotGroup:       THREE.Group;
  rng:             () => number;
  particles:       PromParticle[];
  hsl:             { h: number; s: number; l: number };
  // arch:  forming → growing → ejecting | dissipating → dead
  // open:  forming → traveling → dead
  phase:           'forming' | 'growing' | 'ejecting' | 'traveling' | 'dissipating' | 'dead';
  isOpen:          boolean;
  formProgress:    number;
  growProgress:    number;
  travelProgress:  number;
  disperseProgress:number;
  maxGrowScale:    number;
  willEject:       boolean;
  ejectDir:        THREE.Vector3;
  formSpd:         number;
  growSpd:         number;
  travelSpd:       number;
  disperseSpd:     number;
  deadTime:        number;
  deadDur:         number;
}

function buildPromParticles(
  slotGroup: THREE.Group,
  baseHex:   string,
  size:      number,
  rng:       () => number,
  isOpen:    boolean,
): { particles: PromParticle[]; ejectDir: THREE.Vector3 } {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(baseHex).getHSL(hsl);

  const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
  const tmp  = Math.abs(axis.x) < 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3().crossVectors(axis, tmp).normalize();
  const side = new THREE.Vector3().crossVectors(axis, perp).normalize();

  const spread = 0.18 + rng() * 0.22;
  const p0 = axis.clone()
    .multiplyScalar(Math.cos(spread)).addScaledVector(perp, Math.sin(spread))
    .normalize().multiplyScalar(size * 1.05);
  // Very low apex — arch is flat/wide rather than tall
  const h  = size * (0.04 + rng() * 0.05);
  const p1 = axis.clone()
    .multiplyScalar(size + h)
    .addScaledVector(side, h * (rng() - 0.5) * 0.4);
  const p2 = isOpen
    ? axis.clone().multiplyScalar(size + h * 1.7).addScaledVector(side, h * (rng() - 0.5) * 0.3)
    : axis.clone()
        .multiplyScalar(Math.cos(spread)).addScaledVector(perp, -Math.sin(spread))
        .normalize().multiplyScalar(size * 1.05);

  const ejectDir = p1.clone().normalize();
  const curve = new THREE.QuadraticBezierCurve3(p0.clone(), p1.clone(), p2.clone());
  const particles: PromParticle[] = [];
  const tex = getPromStreakTex();

  for (let i = 0; i < PROM_N; i++) {
    const t        = i / (PROM_N - 1);
    const curvePos = curve.getPoint(t);
    const tangent  = curve.getTangent(t).normalize();

    const sineT  = Math.sin(t * Math.PI);
    const baseLen = size * (0.038 + sineT * 0.052) * (0.6 + rng() * 0.5);
    const baseWid = baseLen / STREAK_ASPECT;

    const jitterDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    const basePos   = curvePos.clone().addScaledVector(jitterDir, size * (0.008 + rng() * 0.018));

    const col = new THREE.Color().setHSL(
      Math.max(0, hsl.h - sineT * 0.08),
      Math.min(1, hsl.s + 0.15 + sineT * 0.20),
      Math.min(1, hsl.l * (0.90 + sineT * 0.28)),
    );

    // ── streak plane ──
    const mat = new THREE.MeshBasicMaterial({
      map: tex, color: col,
      transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(getPromPlaneGeo(), mat);
    mesh.userData.isStar = true;
    mesh.scale.set(baseWid, baseLen, 1);
    mesh.position.copy(basePos);
    mesh.visible = false;
    slotGroup.add(mesh);

    // ── low-poly crystal fragment ──
    const polySize = size * (0.003 + sineT * 0.005) * (0.5 + rng() * 0.8);
    const polyMat  = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const poly = new THREE.Mesh(rng() > 0.45 ? getIco() : getTet(), polyMat);
    poly.userData.isStar = true;
    poly.scale.setScalar(polySize);
    poly.position.copy(basePos);
    poly.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    poly.visible = false;
    slotGroup.add(poly);

    particles.push({
      mesh, poly, tangent, basePos, tParam: t,
      baseOp:  0.28 + sineT * 0.22 + rng() * 0.10,
      baseLen, baseWid,
      polyRx: (rng() - 0.5) * 2.0,
      polyRy: (rng() - 0.5) * 2.0,
      polyRz: (rng() - 0.5) * 2.0,
    });
  }

  return { particles, ejectDir };
}

function respawnPromSlot(slot: PromSlot, baseHex: string, size: number): void {
  for (const p of slot.particles) {
    (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    (p.poly.material as THREE.MeshBasicMaterial).dispose();
    slot.slotGroup.remove(p.mesh);
    slot.slotGroup.remove(p.poly);
  }

  // Reset group transform for reuse
  slot.slotGroup.scale.setScalar(1);
  slot.slotGroup.position.set(0, 0, 0);

  new THREE.Color(baseHex).getHSL(slot.hsl);

  slot.isOpen = slot.rng() < 0.25; // 25% linear jets, 75% arches

  const built = buildPromParticles(slot.slotGroup, baseHex, size, slot.rng, slot.isOpen);
  slot.particles = built.particles;
  slot.ejectDir  = built.ejectDir;

  slot.phase           = 'forming';
  slot.formProgress    = 0;
  slot.growProgress    = 0;
  slot.travelProgress  = 0;
  slot.disperseProgress = 0;

  slot.maxGrowScale = 1.3 + slot.rng() * 0.5;  // arch apex grows 1.3×–1.8× in height
  slot.willEject    = slot.rng() < 0.40;        // 40% chance of CME ejection

  slot.formSpd     = 0.5 + slot.rng() * 0.4;   // arc appears in ~1–2 s
  slot.growSpd     = 0.07 + slot.rng() * 0.08; // arch grows over 6–14 s
  slot.travelSpd   = 0.22 + slot.rng() * 0.20; // travel/eject over 2–4.5 s
  slot.disperseSpd = 0.18 + slot.rng() * 0.15; // dissipate over 3–5.5 s
}

function makeProminenceRoot(
  baseHex: string, size: number, seed: number, hq: boolean,
): { root: THREE.Group; slots: PromSlot[] } {
  const root = new THREE.Group();
  root.userData.isStar = true;
  const N     = hq ? 3 : 2;
  const slots: PromSlot[] = [];

  for (let i = 0; i < N; i++) {
    const rng = mulberry32(((seed + i * 7919) >>> 0));
    const slotGroup = new THREE.Group();
    slotGroup.userData.isStar = true;
    root.add(slotGroup);

    slots.push({
      slotGroup, rng,
      particles: [],
      hsl: { h: 0, s: 0, l: 0 },
      phase: 'dead',
      isOpen: false,
      formProgress: 0, growProgress: 0, travelProgress: 0, disperseProgress: 0,
      maxGrowScale: 2.0, willEject: false,
      ejectDir: new THREE.Vector3(0, 1, 0),
      formSpd: 4.0, growSpd: 0.15, travelSpd: 0.25, disperseSpd: 0.25,
      deadTime: 0,
      deadDur: 4.0 + (i / N) * 12.0,
    });
  }

  return { root, slots };
}

function advancePromSlot(
  slot: PromSlot, dt: number, _time: number, baseHex: string, size: number,
  camera: THREE.Camera,
): void {
  if (slot.phase === 'dead') {
    slot.deadTime += dt;
    if (slot.deadTime >= slot.deadDur) respawnPromSlot(slot, baseHex, size);
    return;
  }

  const N = slot.particles.length;
  if (N === 0) return;

  // ── forming: fast wavefront fade-in ─────────────────────────────────────────
  if (slot.phase === 'forming') {
    slot.formProgress = Math.min(1, slot.formProgress + dt * slot.formSpd);
    const wavefront = slot.formProgress * N;
    for (let i = 0; i < N; i++) {
      const alpha = Math.max(0, Math.min(1, wavefront - i));
      const p = slot.particles[i];
      const on = alpha > 0.005;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp * alpha;
      (p.poly.material as THREE.MeshBasicMaterial).opacity = p.baseOp * alpha * 0.75;
      p.mesh.visible = on; p.poly.visible = on;
      if (on) {
        orientStreak(p.mesh, p.tangent, camera.position);
        p.poly.rotation.x += dt * p.polyRx;
        p.poly.rotation.y += dt * p.polyRy;
        p.poly.rotation.z += dt * p.polyRz;
      }
    }
    if (slot.formProgress >= 1) {
      slot.phase = 'growing';
    }
    return;
  }

  // ── growing: apex lifts while base stays glued to star surface ─────────────
  if (slot.phase === 'growing') {
    slot.growProgress = Math.min(1, slot.growProgress + dt * slot.growSpd);
    const currentScale = 1 + slot.growProgress * (slot.maxGrowScale - 1);
    // slotGroup stays at identity — particles are positioned individually
    slot.slotGroup.scale.setScalar(1);

    for (let i = 0; i < N; i++) {
      const p = slot.particles[i];
      getGrownPos(p, currentScale, _gp);
      p.mesh.position.copy(_gp);
      p.poly.position.copy(_gp);
      p.mesh.visible = true; p.poly.visible = true;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp;
      (p.poly.material as THREE.MeshBasicMaterial).opacity = p.baseOp * 0.75;
      orientStreak(p.mesh, p.tangent, camera.position);
      p.poly.rotation.x += dt * p.polyRx;
      p.poly.rotation.y += dt * p.polyRy;
      p.poly.rotation.z += dt * p.polyRz;
    }

    if (slot.growProgress >= 1) {
      slot.phase = 'dissipating';
    }
    return;
  }

  // ── dissipating: arch fades in place, expanding slightly ─────────────────────
  if (slot.phase === 'dissipating') {
    slot.disperseProgress = Math.min(1, slot.disperseProgress + dt * slot.disperseSpd);
    const t = slot.disperseProgress;

    const expandScale = slot.maxGrowScale * (1 + t * 0.3);
    const diffuse = 1 + t * 0.7;
    const opacity = Math.pow(1 - t, 1.2);

    for (let i = 0; i < N; i++) {
      const p = slot.particles[i];
      getGrownPos(p, expandScale, _gp);
      p.mesh.position.copy(_gp);
      p.poly.position.copy(_gp);
      p.mesh.scale.set(p.baseWid * diffuse, p.baseLen * diffuse, 1);
      const on = opacity > 0.01;
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp * opacity;
      (p.poly.material as THREE.MeshBasicMaterial).opacity = p.baseOp * opacity * 0.75;
      p.mesh.visible = on; p.poly.visible = on;
      if (on) {
        orientStreak(p.mesh, p.tangent, camera.position);
        p.poly.rotation.x += dt * p.polyRx;
        p.poly.rotation.y += dt * p.polyRy;
        p.poly.rotation.z += dt * p.polyRz;
      }
    }

    if (slot.disperseProgress >= 1) {
      for (const p of slot.particles) { p.mesh.visible = false; p.poly.visible = false; }
      slot.phase = 'dead'; slot.deadTime = 0; slot.deadDur = 6.0 + slot.rng() * 8.0;
    }
    return;
  }
}

// ─── Neutron star geometry (vertex-painted checkerboard) ────────────────────────
// The icosahedron is non-indexed (each triangle owns its 3 vertices), so painting
// all 3 vertices of a face the same colour gives flat, crisp two-tone cells.
// A checkerboard is derived from each face's spherical coords: white vs a light tint.

function makeNeutronStarGeometry(color: string, size: number, detail: number): THREE.BufferGeometry {
  const geo = new THREE.IcosahedronGeometry(size, detail);
  const pos = geo.attributes.position as THREE.BufferAttribute;
  const count = pos.count; // multiple of 3 — one triple per triangle

  const W = new THREE.Color(1, 1, 1);
  // Two tints of the selected colour — the lighter cell is 80% toward white,
  // the darker cell 60%, so the whole star keeps a hint of its colour.
  const light = new THREE.Color(color).lerp(W, 0.8);
  const tint  = new THREE.Color(color).lerp(W, 0.6);

  const colors = new Float32Array(count * 3);

  // IcosahedronGeometry subdivides each of the 20 base faces into a triangular grid.
  // We replicate three.js's exact triangle-emission order so we can two-colour by the
  // triangle's orientation within its row (j even / odd) — every triangle alternates
  // with its edge-neighbours, producing a regular triangular checkerboard.
  const cols = detail + 1;
  let tri = 0;

  const paint = (t: number, c: THREE.Color) => {
    for (let k = 0; k < 3; k++) {
      const vi = (t * 3 + k) * 3;
      colors[vi] = c.r; colors[vi + 1] = c.g; colors[vi + 2] = c.b;
    }
  };

  for (let face = 0; face < 20; face++) {
    for (let i = 0; i < cols; i++) {
      for (let j = 0; j < 2 * (cols - i) - 1; j++) {
        if (tri * 3 >= count) break;          // safety against version drift
        paint(tri, (j % 2 === 0) ? light : tint);
        tri++;
      }
    }
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

// ─── Neutron star bipolar jets ─────────────────────────────────────────────

// Length gradient for the beam, built the same way as the black-hole accretion disc:
// white-hot at the tip (the star), through the hue, fading to transparent at the far
// end — so the beam glows and dissolves into space instead of ending on a hard edge.
function makeJetTexture(baseHex: string): THREE.Texture {
  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(baseHex).getHSL(hsl);
  const hue = Math.round(hsl.h * 360);

  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0,    'rgba(255,255,255,1)');         // tip at the star — hottest
  grad.addColorStop(0.04, 'rgba(255,250,235,1)');
  grad.addColorStop(0.14, `hsla(${hue},100%,75%,0.95)`);
  grad.addColorStop(0.40, `hsla(${hue},95%,58%,0.55)`);
  grad.addColorStop(0.70, `hsla(${hue},85%,42%,0.22)`);
  grad.addColorStop(0.90, `hsla(${hue},75%,30%,0.06)`);
  grad.addColorStop(1,    'rgba(0,0,0,0)');               // far end fades out
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 1);
  return new THREE.CanvasTexture(canvas);
}

function makeNeutronJets(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  group.userData.isStar = true;

  const H    = size * 540; // immense — pulsar beams extend far beyond the system scale
  const farR = size * 16;  // radius at the far (wide) end

  const tex = makeJetTexture(baseHex);

  // Smooth, open-ended cone: narrow tip at y=0 (the star) widening to its base at y=1.
  // High radial segment count keeps the surface smooth (not the old faceted 4-gon), and
  // we remap the UVs so the gradient runs along the BEAM LENGTH (u = y) rather than around
  // it — the same inner→outer falloff the accretion disc uses.
  const unitGeo = new THREE.ConeGeometry(1, 1, 64, 1, true);
  unitGeo.rotateX(Math.PI);     // flip the apex to the bottom
  unitGeo.translate(0, 0.5, 0); // tip at y=0, wide base at y=1
  {
    const pos = unitGeo.attributes.position as THREE.BufferAttribute;
    const uv  = unitGeo.attributes.uv as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getY(i), 0.5);
    uv.needsUpdate = true;
  }

  // Bright tight core → soft halo → wide faint haze, all sharing the gradient texture.
  const layers = [
    { rMult: 0.4, op: 0.95 },
    { rMult: 1.0, op: 0.50 },
    { rMult: 1.9, op: 0.20 },
  ];

  for (const dir of [1, -1]) {
    for (const layer of layers) {
      const mat = new THREE.MeshBasicMaterial({
        map: tex, transparent: true, opacity: layer.op,
        toneMapped: false, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(unitGeo, mat);
      mesh.userData.isStar = true;
      mesh.userData.isJet  = true;
      mesh.userData.baseOp = layer.op;

      const r = farR * layer.rMult;
      mesh.scale.set(r, H, r);

      if (dir === 1) {
        mesh.position.set(0, size * 0.9, 0);
      } else {
        mesh.position.set(0, -size * 0.9, 0);
        mesh.rotation.x = Math.PI;
      }

      group.add(mesh);
    }
  }

  return group;
}

// ─── Component ───────────────────────────────────────────────────────────────

// Pulsar beam motion: the beam is offset from the spin axis (so it sweeps a cone as
// the star turns — the lighthouse), and that cone slowly precesses (the wobble).
const JET_OFFSET = THREE.MathUtils.degToRad(14); // magnetic-axis offset from spin axis
const JET_CONE   = THREE.MathUtils.degToRad(7);  // precession cone half-angle
const JET_PRECESS_SPEED = 0.4; // rad/s — slow precession wobble (independent of spin)

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  previewMode?: boolean;
  showOrbits?: boolean;
  highQuality?: boolean;
}

export default function StarObject({ obj, children, onPositionUpdate, onClick, previewMode, showOrbits = true, highQuality = true }: Props) {
  const groupRef        = useRef<THREE.Group>(null);
  const axisGroupRef    = useRef<THREE.Group>(null);
  const meshRef         = useRef<THREE.Mesh>(null);
  const diskGroupRef    = useRef<THREE.Group>(null);
  const photonGroupRef  = useRef<THREE.Group>(null);
  const chunkGroupRef   = useRef<THREE.Group>(null);
  const coronaRootRef   = useRef<THREE.Group>(null);
  const nsJetsRef       = useRef<THREE.Group>(null);
  const jetSpinRef      = useRef<THREE.Group>(null);
  const jetPrecessRef   = useRef<THREE.Group>(null);
  const localTimeRef    = useRef(0);

  const [hovered, setHovered] = useState(false);
  const color      = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex    = useMemo(() => makeStarGlowTexture(), []);

  // Black hole geometry
  const bhDisk   = useMemo(() => makeBlackHoleAccretionDisk(color, obj.size, highQuality), [color, obj.size, highQuality]);
  const bhChunks = useMemo(() => {
    const rng = mulberry32((obj.seed ?? obj.id.charCodeAt(0) * 73) >>> 0);
    return makeBlackHoleChunks(color, obj.size, rng, highQuality);
  }, [color, obj.size, obj.seed, obj.id, highQuality]);

  // Normal star prominence lifecycle
  const coronaData = useMemo(() => {
    if (isBlackHole || isNeutron) return null;
    const seed = (obj.seed ?? obj.id.charCodeAt(0) * 191) >>> 0;
    return makeProminenceRoot(color, obj.size, seed, highQuality);
  }, [color, obj.size, obj.seed, obj.id, isBlackHole, isNeutron, highQuality]);
  const coronaDataRef = useRef(coronaData);
  coronaDataRef.current = coronaData;

  // Neutron star effects — jets are optional (a neutron star with jets is a pulsar)
  const showJets  = isNeutron && (obj.nsJets ?? true);
  const nsJets = useMemo(() => showJets ? makeNeutronJets(color, obj.size) : null, [color, obj.size, showJets]);

  // Neutron star geometry — checkerboard painted into vertex colours
  const nsGeo = useMemo(
    () => isNeutron ? makeNeutronStarGeometry(color, obj.size, highQuality ? 4 : 2) : null,
    [color, obj.size, isNeutron, highQuality],
  );

  const camera = useThree(state => state.camera);

  // Track BH chunk angles
  const chunkAnglesRef = useRef<number[]>([]);
  if (chunkAnglesRef.current.length !== bhChunks.orbits.length) {
    const ch = bhChunks.group.children;
    chunkAnglesRef.current = bhChunks.orbits.map((_, i) => {
      const p = ch[i]?.position;
      return p ? Math.atan2(p.z, p.x) : 0;
    });
  }

  // Disk inclination — editable field takes priority over seed-based random
  const discInclination = useMemo(() => {
    if (obj.bhDiscInclination !== undefined) return THREE.MathUtils.degToRad(obj.bhDiscInclination);
    const rng = mulberry32(obj.seed ?? obj.id.charCodeAt(0) * 137);
    return (rng() - 0.5) * Math.PI * 0.35;
  }, [obj.bhDiscInclination, obj.seed, obj.id]);

  // Binary orbit
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  if (obj.sortOrder === 1) initialAngle += Math.PI;
  // Apply random phase offset to secondary star
  initialAngle += obj.orbitPhaseOffset ?? 0;
  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0);
  const orbitDelay = obj.orbitDelay ?? 0;
  const angleRef   = useRef(initialAngle);

  useFrame(({ camera }, delta) => {
    localTimeRef.current += delta;
    const time = localTimeRef.current;

    // Binary orbit
    if (obj.orbitRadius > 0 && groupRef.current) {
      // Only start orbiting after delay time
      if (time >= orbitDelay) {
        angleRef.current += delta * orbitSpeed;
      }
      const incRad = THREE.MathUtils.degToRad(obj.inclination);
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
      groupRef.current.position.set(x, y, z);
      onPositionUpdate?.([x, y, z]);
    } else if (groupRef.current && obj.orbitRadius === 0) {
      onPositionUpdate?.([0, 0, 0]);
    }

    // Self-rotation around the spin axis (neutron stars spin rapidly by default).
    const spinSpeed = obj.selfRotationSpeed || (isNeutron ? 7 : 0.08);

    // Apply axis inclination (tilts the rotation axis)
    if (axisGroupRef.current && obj.axisInclination !== undefined) {
      axisGroupRef.current.rotation.z = THREE.MathUtils.degToRad(obj.axisInclination);
    }

    if (meshRef.current && !isBlackHole) {
      meshRef.current.rotation.y += delta * spinSpeed;
    }
    // Pulsar beams: sweep the offset beam around the spin axis at the star's own spin
    // rate (lighthouse), and let the whole cone slowly precess (wobble) — two distinct
    // rotations on top of the crust spin.
    if (jetSpinRef.current)    jetSpinRef.current.rotation.y    += delta * spinSpeed;
    if (jetPrecessRef.current) jetPrecessRef.current.rotation.y += delta * JET_PRECESS_SPEED;

    // Black hole disk + chunks
    if (diskGroupRef.current)  diskGroupRef.current.rotation.y += delta * 0.5;
    if (photonGroupRef.current) photonGroupRef.current.lookAt(camera.position);
    if (chunkGroupRef.current) {
      const children = chunkGroupRef.current.children;
      const angles   = chunkAnglesRef.current;
      const orbits   = bhChunks.orbits;
      for (let i = 0; i < children.length; i++) {
        angles[i] += delta * orbits[i].speed;
        const r = orbits[i].radius;
        children[i].position.set(Math.cos(angles[i]) * r, 0, Math.sin(angles[i]) * r);
        children[i].rotation.y += delta * (children[i].userData.selfRot as number);
      }
    }

    // Solar prominence lifecycle
    const cd = coronaDataRef.current;
    if (cd) {
      for (const slot of cd.slots) {
        advancePromSlot(slot, delta, time, color, obj.size, camera);
      }
    }

    // Neutron star jets: subtle shimmer, never dims much
    if (nsJetsRef.current) {
      const pulse = 0.88 + 0.12 * Math.sin(time * 2.6);
      for (const child of nsJetsRef.current.children) {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m && child.userData.isJet) m.opacity = pulse * child.userData.baseOp;
      }
    }
  });

  const photonR = obj.size * 1.06;

  return (
    <>
      {showOrbits && obj.parentId !== null && obj.orbitRadius > 0 && (
        <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />
      )}
      <group ref={groupRef}>
        {!previewMode && (
          <pointLight
            color={color}
            intensity={isBlackHole ? 180 : isNeutron ? 350 : 250}
            distance={isBlackHole ? 400 : isNeutron ? 700 : 500}
            decay={1}
            castShadow
            shadow-mapSize-width={highQuality ? 2048 : 512}
            shadow-mapSize-height={highQuality ? 2048 : 512}
          />
        )}

        {/* ── Normal star ─────────────────────────────────────────────────── */}
        {!isBlackHole && !isNeutron && (
          <>
            {/* Multi-layer additive bloom */}
            <sprite userData={{ isStar: true }} scale={[obj.size * 11, obj.size * 11, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.22}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 5.5, obj.size * 5.5, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.65}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 2.8, obj.size * 2.8, 1]}>
              <spriteMaterial map={glowTex} color="white" transparent depthWrite={false} opacity={0.85}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            {/* Solar prominence arcs — lifecycle driven */}
            {coronaData && <primitive ref={coronaRootRef} object={coronaData.root} />}
          </>
        )}

        {/* ── Neutron star ─────────────────────────────────────────────────── */}
        {isNeutron && (
          <>
            {/* Immense diffuse glow — huge radius even though the body is tiny */}
            <sprite userData={{ isStar: true }} scale={[obj.size * 80, obj.size * 80, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.18}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 35, obj.size * 35, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.60}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 14, obj.size * 14, 1]}>
              <spriteMaterial map={glowTex} color="white" transparent depthWrite={false} opacity={0.90}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
          </>
        )}

        {/* ── Black hole ───────────────────────────────────────────────────── */}
        {isBlackHole && (
          <group userData={{ isStar: true }} rotation={[discInclination, 0, 0]}>
            <primitive ref={diskGroupRef} object={bhDisk} />
            <primitive ref={chunkGroupRef} object={bhChunks.group} />

            {/* Photon ring — billboards to camera */}
            <group ref={photonGroupRef}>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.048, 16, highQuality ? 128 : 64]} />
                <meshBasicMaterial color={new THREE.Color(1, 0.97, 0.92)} toneMapped={false}
                  transparent opacity={0.95} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.13, 16, highQuality ? 128 : 64]} />
                <meshBasicMaterial color={new THREE.Color(1, 0.82, 0.55)} toneMapped={false}
                  transparent opacity={0.52} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.30, 16, highQuality ? 128 : 64]} />
                <meshBasicMaterial color={new THREE.Color(0.9, 0.55, 0.25)} toneMapped={false}
                  transparent opacity={0.22} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
            </group>

            <mesh renderOrder={1}>
              <icosahedronGeometry args={[obj.size * 0.85, highQuality ? 4 : 2]} />
              <meshBasicMaterial color="#000000" toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* ── Main body (all types) ────────────────────────────────────────── */}
        <group ref={axisGroupRef}>
          <mesh
            ref={meshRef}
            userData={{ isStar: true }}
            onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
            castShadow={false}
            receiveShadow={false}
          >
            {isNeutron && nsGeo
              ? <primitive object={nsGeo} attach="geometry" />
              : <icosahedronGeometry args={[obj.size, highQuality ? 4 : 2]} />}
            {isNeutron && nsGeo ? (
              // Self-luminous: meshBasicMaterial ignores all scene lights & shadows,
              // so the neutron star looks identical whether or not a companion star
              // is nearby. vertexColors render the painted checkerboard directly.
              <meshBasicMaterial
                vertexColors
                toneMapped={false}
              />
            ) : (
              <meshLambertMaterial
                color={isBlackHole ? '#050008' : '#000000'}
                emissive={isBlackHole ? '#000000' : color}
                emissiveIntensity={isBlackHole ? 0 : isNeutron ? 1.5 : 1.4}
                flatShading
                toneMapped={false}
              />
            )}
          </mesh>

          {/* Pulsar beams — emitted along the star's (axis-tilted) spin axis, with two
              extra rotations layered on:
                · precession group  → slowly wobbles the whole beam cone
                · cone tilt          → half-angle of that precession wobble
                · sweep group        → offset from the spin axis + fast spin = lighthouse
              The point lights ride inside the sweep so they track the beams. */}
          {nsJets && (
            <group ref={jetPrecessRef}>
              <group rotation-z={JET_CONE}>
                <group ref={jetSpinRef} rotation-z={JET_OFFSET}>
                  <primitive ref={nsJetsRef} object={nsJets} />
                  {!previewMode && (
                    <>
                      <pointLight color={color} intensity={60} distance={120} decay={1.4} position={[0, obj.size * 30, 0]} />
                      <pointLight color={color} intensity={60} distance={120} decay={1.4} position={[0, -obj.size * 30, 0]} />
                    </>
                  )}
                </group>
              </group>
            </group>
          )}
        </group>

        {hovered && (
          <Html center distanceFactor={50} position={[0, obj.size + 1.2, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
        {children}
      </group>
    </>
  );
}
