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

// ─── Solar prominence lifecycle (particle-based) ───────────────────────────────

const PROM_N = 32;  // particles per arc

// Shared low-poly geometries — created once, scaled per particle
let _pIco: THREE.IcosahedronGeometry | null = null;
let _pTet: THREE.TetrahedronGeometry | null = null;

interface PromParticle {
  mesh:       THREE.Mesh;
  basePos:    THREE.Vector3;
  scatterVel: THREE.Vector3;
  baseOp:     number;
  rotSpeed:   number;
}

interface PromSlot {
  slotGroup:   THREE.Group;
  rng:         () => number;
  particles:   PromParticle[];
  hsl:         { h: number; s: number; l: number };
  phase:       'erupting' | 'retracting' | 'dissipating' | 'dead';
  progress:    number;
  maxProgress: number;   // <1 = partial arc that diffuses before completing
  isOpen:      boolean;  // open jet: doesn't return to star surface
  eruptSpd:    number;
  finishSpd:   number;
  willRetract: boolean;
  deadTime:    number;
  deadDur:     number;
}

function buildPromParticles(
  slotGroup: THREE.Group,
  baseHex:   string,
  size:      number,
  rng:       () => number,
  isOpen:    boolean,
): PromParticle[] {
  if (!_pIco) _pIco = new THREE.IcosahedronGeometry(1, 0);
  if (!_pTet) _pTet = new THREE.TetrahedronGeometry(1);

  const hsl = { h: 0, s: 0, l: 0 };
  new THREE.Color(baseHex).getHSL(hsl);

  const axis = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
  const tmp  = Math.abs(axis.x) < 0.9
    ? new THREE.Vector3(1, 0, 0)
    : new THREE.Vector3(0, 1, 0);
  const perp = new THREE.Vector3().crossVectors(axis, tmp).normalize();
  const side = new THREE.Vector3().crossVectors(axis, perp).normalize();

  const spread = 0.14 + rng() * 0.32;
  const p0 = axis.clone()
    .multiplyScalar(Math.cos(spread)).addScaledVector(perp, Math.sin(spread))
    .normalize().multiplyScalar(size * 0.98);
  const h  = size * (0.45 + rng() * 1.3);
  const p1 = axis.clone()
    .multiplyScalar(size + h)
    .addScaledVector(side, h * (rng() - 0.5) * 0.7);

  // Open arcs continue outward; loop arcs return to the surface
  const p2 = isOpen
    ? axis.clone().multiplyScalar(size + h * 1.7).addScaledVector(side, h * (rng() - 0.5) * 0.3)
    : axis.clone()
        .multiplyScalar(Math.cos(spread)).addScaledVector(perp, -Math.sin(spread))
        .normalize().multiplyScalar(size * 0.98);

  const curve = new THREE.QuadraticBezierCurve3(p0.clone(), p1.clone(), p2.clone());
  const particles: PromParticle[] = [];

  for (let i = 0; i < PROM_N; i++) {
    const t        = i / (PROM_N - 1);
    const curvePos = curve.getPoint(t);
    const outward  = curvePos.clone().normalize();

    const sineT = Math.sin(t * Math.PI);
    const r     = size * (0.012 + sineT * 0.018) * (0.65 + rng() * 0.65);

    // Tight jitter — particles hug the curve
    const jitterDir = new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize();
    const basePos   = curvePos.clone().addScaledVector(jitterDir, r * (0.2 + rng() * 0.7));

    const col = new THREE.Color().setHSL(
      Math.max(0, hsl.h - sineT * 0.10),
      Math.min(1, hsl.s + 0.15 + sineT * 0.10),
      Math.min(1, hsl.l * (0.85 + sineT * 0.35)),
    );

    const geo = rng() > 0.45 ? _pIco : _pTet;
    const mat = new THREE.MeshBasicMaterial({
      color: col, transparent: true, opacity: 0,
      toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isStar = true;
    mesh.scale.setScalar(r);
    mesh.position.copy(basePos);
    mesh.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    mesh.visible = false;
    slotGroup.add(mesh);

    const scatterVel = outward.clone()
      .addScaledVector(new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize(), 0.55)
      .normalize()
      .multiplyScalar(size * (0.25 + rng() * 0.45));

    particles.push({
      mesh, basePos, scatterVel,
      baseOp:   0.45 + sineT * 0.40 + rng() * 0.12,
      rotSpeed: (rng() - 0.5) * 1.8,
    });
  }

  return particles;
}

function respawnPromSlot(slot: PromSlot, baseHex: string, size: number): void {
  for (const p of slot.particles) {
    (p.mesh.material as THREE.MeshBasicMaterial).dispose();
    slot.slotGroup.remove(p.mesh);
  }

  new THREE.Color(baseHex).getHSL(slot.hsl);

  // 30% open jets, 40% partial arcs, rest full loops
  slot.isOpen       = slot.rng() < 0.30;
  slot.maxProgress  = (!slot.isOpen && slot.rng() < 0.40)
    ? 0.35 + slot.rng() * 0.50   // partial: stop at 35–85%
    : 1.0;

  slot.particles  = buildPromParticles(slot.slotGroup, baseHex, size, slot.rng, slot.isOpen);
  slot.phase      = 'erupting';
  slot.progress   = 0;
  slot.eruptSpd   = 0.35 + slot.rng() * 0.35;
  slot.finishSpd  = 0.25 + slot.rng() * 0.30;
  // Open arcs and partial arcs always dissipate — no retraction
  slot.willRetract = !slot.isOpen && slot.maxProgress >= 1.0 && slot.rng() > 0.40;
}

function makeProminenceRoot(
  baseHex: string, size: number, seed: number, hq: boolean,
): { root: THREE.Group; slots: PromSlot[] } {
  const root = new THREE.Group();
  root.userData.isStar = true;
  const N     = hq ? 7 : 4;
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
      progress: 0, maxProgress: 1, isOpen: false,
      eruptSpd: 0, finishSpd: 0, willRetract: false,
      deadTime: 0,
      deadDur: (i / N) * 4.0,
    });
  }

  return { root, slots };
}

function advancePromSlot(
  slot: PromSlot, dt: number, time: number, baseHex: string, size: number,
): void {
  if (slot.phase === 'dead') {
    slot.deadTime += dt;
    if (slot.deadTime >= slot.deadDur) respawnPromSlot(slot, baseHex, size);
    return;
  }

  const N = slot.particles.length;
  if (N === 0) return;

  if (slot.phase === 'erupting') {
    slot.progress = Math.min(slot.maxProgress, slot.progress + dt * slot.eruptSpd);
    const wavefront = slot.progress * N;
    for (let i = 0; i < N; i++) {
      const alpha = Math.max(0, Math.min(1, wavefront - i));
      const p = slot.particles[i];
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp * alpha;
      p.mesh.visible = alpha > 0.005;
    }
    if (slot.progress >= slot.maxProgress) {
      // Flow directly into next phase — no static hold
      slot.phase = slot.willRetract ? 'retracting' : 'dissipating';
      slot.progress = 1;
    }
    return;
  }

  if (slot.phase === 'retracting') {
    slot.progress = Math.max(0, slot.progress - dt * slot.finishSpd);
    const half   = (N - 1) / 2;
    const FADE_W = 0.18;
    for (let i = 0; i < N; i++) {
      const distFromEnd = Math.min(i, N - 1 - i) / half;
      const threshold   = 1 - distFromEnd;
      const alpha = Math.max(0, Math.min(1,
        (slot.progress - (threshold - FADE_W)) / FADE_W,
      ));
      const p = slot.particles[i];
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp * alpha;
      p.mesh.visible = alpha > 0.005;
      p.mesh.rotation.y += dt * p.rotSpeed;
    }
    if (slot.progress <= 0) {
      for (const p of slot.particles) p.mesh.visible = false;
      slot.phase = 'dead'; slot.deadTime = 0; slot.deadDur = 1.5 + slot.rng() * 3.0;
    }
    return;
  }

  if (slot.phase === 'dissipating') {
    slot.progress = Math.max(0, slot.progress - dt * slot.finishSpd * 0.55);
    // Eased scatter: slow drift at first, accelerates as particles fade
    const scatter  = Math.pow(1 - slot.progress, 1.6) * 0.60;
    // Smooth opacity curve: stays bright longer, then graceful fade
    const easedOp  = Math.sqrt(slot.progress);
    for (const p of slot.particles) {
      if (!p.mesh.visible) continue;  // skip particles never reached by eruption
      p.mesh.position.copy(p.basePos).addScaledVector(p.scatterVel, scatter);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.baseOp * easedOp;
      p.mesh.visible = p.mesh.visible && easedOp > 0.01;
      p.mesh.rotation.y += dt * p.rotSpeed;
    }
    if (slot.progress <= 0) {
      for (const p of slot.particles) p.mesh.visible = false;
      slot.phase = 'dead'; slot.deadTime = 0; slot.deadDur = 1.0 + slot.rng() * 2.5;
    }
    return;
  }
}

// ─── Neutron star bipolar jets ─────────────────────────────────────────────────

function makeNeutronJets(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  group.userData.isStar = true;

  const base  = new THREE.Color(baseHex);
  const white = new THREE.Color(1, 1, 1);
  const H     = size * 18; // very long exhaust beams

  // Unit cone: base at y=0, tip at y=1 (after translate) — narrow, beam-like
  const unitGeo = new THREE.ConeGeometry(1, 1, 4);
  unitGeo.translate(0, 0.5, 0);

  // Three additive layers per jet: razor-thin bright core → soft halo → wide outer glow
  const layers = [
    { wMult: 0.018, col: white.clone(),                 op: 0.92 },
    { wMult: 0.07,  col: white.clone().lerp(base, 0.35), op: 0.38 },
    { wMult: 0.18,  col: base.clone(),                  op: 0.14 },
  ];

  for (const dir of [1, -1]) {
    for (const layer of layers) {
      const mat = new THREE.MeshBasicMaterial({
        color: layer.col, transparent: true, opacity: layer.op,
        toneMapped: false, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(unitGeo, mat);
      mesh.userData.isStar = true;
      mesh.userData.isJet  = true;
      mesh.userData.baseOp = layer.op;

      const w = size * layer.wMult;
      mesh.scale.set(w, H, w);

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
  const meshRef         = useRef<THREE.Mesh>(null);
  const diskGroupRef    = useRef<THREE.Group>(null);
  const photonGroupRef  = useRef<THREE.Group>(null);
  const chunkGroupRef   = useRef<THREE.Group>(null);
  const coronaRootRef   = useRef<THREE.Group>(null);
  const nsJetsRef       = useRef<THREE.Group>(null);
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

  // Neutron star effects
  const nsJets = useMemo(() => isNeutron ? makeNeutronJets(color, obj.size) : null, [color, obj.size, isNeutron]);

  // Neutron star jet tilt — from stored values or seeded random
  const nsJetTilt = useMemo(() => {
    if (!isNeutron) return null;
    if (obj.nsJetTiltX !== undefined || obj.nsJetTiltZ !== undefined) {
      return {
        x: THREE.MathUtils.degToRad(obj.nsJetTiltX ?? 0),
        z: THREE.MathUtils.degToRad(obj.nsJetTiltZ ?? 0),
      };
    }
    const rng = mulberry32((obj.seed ?? obj.id.charCodeAt(0) * 79) >>> 0);
    return { x: (rng() - 0.5) * Math.PI * 0.5, z: (rng() - 0.5) * Math.PI * 0.5 };
  }, [isNeutron, obj.nsJetTiltX, obj.nsJetTiltZ, obj.seed, obj.id]);


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
  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef   = useRef(initialAngle);

  useFrame((_, delta) => {
    localTimeRef.current += delta;
    const time = localTimeRef.current;

    // Binary orbit
    if (obj.orbitRadius > 0 && groupRef.current) {
      angleRef.current += delta * orbitSpeed;
      const incRad = THREE.MathUtils.degToRad(obj.inclination);
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
      groupRef.current.position.set(x, y, z);
      onPositionUpdate?.([x, y, z]);
    } else if (groupRef.current && obj.orbitRadius === 0) {
      onPositionUpdate?.([0, 0, 0]);
    }

    // Normal star self-rotation
    if (meshRef.current && !isBlackHole && !isNeutron) {
      meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.08);
    }

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
        advancePromSlot(slot, delta, time, color, obj.size);
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
            intensity={isBlackHole ? 80 : 120}
            distance={isBlackHole ? 180 : 220}
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
            {/* Intense blue-tinted multi-layer glow */}
            <sprite userData={{ isStar: true }} scale={[obj.size * 18, obj.size * 18, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.18}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 8, obj.size * 8, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.6}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 3.5, obj.size * 3.5, 1]}>
              <spriteMaterial map={glowTex} color="white" transparent depthWrite={false} opacity={0.9}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            {/* Bipolar jets */}
            {nsJets && <primitive ref={nsJetsRef} object={nsJets} rotation-x={nsJetTilt?.x ?? 0} rotation-z={nsJetTilt?.z ?? 0} />}
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
        <mesh
          ref={meshRef}
          userData={{ isStar: true }}
          onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
          castShadow={false}
          receiveShadow={false}
        >
          <icosahedronGeometry args={[obj.size, highQuality ? 4 : 2]} />
          <meshLambertMaterial
            color={isBlackHole ? '#050008' : '#000000'}
            emissive={isBlackHole ? '#000000' : color}
            emissiveIntensity={isBlackHole ? 0 : isNeutron ? 1.5 : 0.9}
            flatShading
            toneMapped={false}
          />
        </mesh>

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
