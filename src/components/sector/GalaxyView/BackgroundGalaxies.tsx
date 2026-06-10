import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// ── Color helpers ─────────────────────────────────────────────────────────────

type ColorFn = (normR: number, angle: number) => THREE.Color;

function radBri(normR: number): number {
  return normR < 0.10 ? 1.0 : Math.exp(-3.4 * (normR - 0.10) / 0.90);
}
function coreBlend(normR: number, tint: THREE.Color): THREE.Color {
  const c = tint.clone();
  if (normR < 0.20) c.lerp(new THREE.Color(1.0, 1.0, 0.94), (0.20 - normR) / 0.20);
  return c;
}
function spiralFn(tint: THREE.Color, numArms: number): ColorFn {
  const kWind = 1.5, sig = 0.68;
  return (normR, angle) => {
    let minDiff = Math.PI;
    for (let arm = 0; arm < numArms; arm++) {
      const a0 = (arm / numArms) * Math.PI * 2;
      let d = angle - (a0 + kWind * Math.log(Math.max(normR, 0.05)));
      d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
      minDiff = Math.min(minDiff, Math.abs(d));
    }
    const a = normR < 0.15 ? 1.0 : 0.25 + 0.75 * Math.exp(-(minDiff * minDiff) / (2 * sig * sig));
    return coreBlend(normR, tint).multiplyScalar(a * radBri(normR) * 0.90);
  };
}
function barredFn(tint: THREE.Color): ColorFn {
  return (normR, angle) => {
    let bri: number;
    if (normR < 0.28) {
      bri = Math.max(Math.exp(-10 * Math.sin(angle) ** 2), 0.22) * radBri(normR);
    } else {
      let minDiff = Math.PI;
      for (let arm = 0; arm < 2; arm++) {
        const a0 = arm === 0 ? 0 : Math.PI;
        let d = angle - (a0 + 1.8 * (normR - 0.28));
        d -= Math.round(d / (2 * Math.PI)) * 2 * Math.PI;
        minDiff = Math.min(minDiff, Math.abs(d));
      }
      bri = (0.22 + 0.78 * Math.exp(-(minDiff * minDiff) / (2 * 0.70 * 0.70))) * radBri(normR);
    }
    return coreBlend(normR, tint).multiplyScalar(bri * 0.90);
  };
}
function ellipticalFn(tint: THREE.Color): ColorFn {
  return (normR) => {
    const bri = normR < 0.08 ? 1.0 : Math.exp(-4.0 * normR);
    return coreBlend(normR, tint).multiplyScalar(bri * 0.88);
  };
}
function irregularFn(tint: THREE.Color): ColorFn {
  return (normR) => tint.clone().multiplyScalar(radBri(normR) * (0.40 + 0.60 * Math.random()) * 0.84);
}

// ── Low-poly polar-grid geometry (gap-free) ───────────────────────────────────

type GalaxyStyle = 'spiral' | 'barred' | 'elliptical' | 'edge-on' | 'irregular';

function buildLocalArrays(
  style: GalaxyStyle,
  tint: THREE.Color,
  scale: number,
  opacity: number,
): { positions: Float32Array; colors: Float32Array } {
  let angSegs: number, radRings: number, squeezeY: number, jitter: number;
  let colorFn: ColorFn;

  switch (style) {
    case 'spiral':
      angSegs = 10; radRings = 5; squeezeY = 1.00; jitter = scale * 0.040;
      colorFn = spiralFn(tint, 2); break;
    case 'barred':
      angSegs = 10; radRings = 5; squeezeY = 1.00; jitter = scale * 0.030;
      colorFn = barredFn(tint); break;
    case 'elliptical':
      angSegs = 8;  radRings = 4; squeezeY = 0.58; jitter = scale * 0.020;
      colorFn = ellipticalFn(tint); break;
    case 'edge-on':
      angSegs = 6;  radRings = 2; squeezeY = 0.07; jitter = scale * 0.010;
      colorFn = ellipticalFn(tint); break;
    case 'irregular': default:
      angSegs = 6 + Math.floor(Math.random() * 3);
      radRings = 3; squeezeY = 0.78 + Math.random() * 0.44; jitter = scale * 0.110;
      colorFn = irregularFn(tint); break;
  }

  // Pre-compute each vertex once — shared by adjacent triangles, so no gaps
  const vx = new Float32Array(1 + radRings * angSegs);
  const vy = new Float32Array(1 + radRings * angSegs);
  for (let ring = 0; ring < radRings; ring++) {
    const r = ((ring + 1) / radRings) * scale;
    for (let seg = 0; seg < angSegs; seg++) {
      const a   = (seg / angSegs) * Math.PI * 2;
      const idx = 1 + ring * angSegs + seg;
      vx[idx] = Math.cos(a) * r + (Math.random() - 0.5) * 2 * jitter;
      vy[idx] = (Math.sin(a) * r + (Math.random() - 0.5) * 2 * jitter) * squeezeY;
    }
  }

  const vi = (ring: number, seg: number): number =>
    ring === 0 ? 0 : 1 + (ring - 1) * angSegs + ((seg % angSegs + angSegs) % angSegs);

  const triCount = angSegs + (radRings - 1) * angSegs * 2;
  const positions = new Float32Array(triCount * 9);
  const colors    = new Float32Array(triCount * 9);
  let ti = 0;

  const writeTri = (i0: number, i1: number, i2: number, col: THREE.Color) => {
    const b = ti * 9;
    positions[b]   = vx[i0]; positions[b+1] = vy[i0]; positions[b+2] = 0;
    positions[b+3] = vx[i1]; positions[b+4] = vy[i1]; positions[b+5] = 0;
    positions[b+6] = vx[i2]; positions[b+7] = vy[i2]; positions[b+8] = 0;
    const r = col.r * opacity, g = col.g * opacity, bv = col.b * opacity;
    for (let v = 0; v < 3; v++) { colors[b+v*3] = r; colors[b+v*3+1] = g; colors[b+v*3+2] = bv; }
    ti++;
  };

  for (let seg = 0; seg < angSegs; seg++) {
    const aMid = ((seg + 0.5) / angSegs) * Math.PI * 2;
    writeTri(vi(0, 0), vi(1, seg), vi(1, seg + 1), colorFn(0.5 / radRings, aMid));
    for (let ring = 1; ring < radRings; ring++) {
      const col = colorFn((ring + 0.5) / radRings, aMid);
      writeTri(vi(ring, seg),   vi(ring+1, seg),   vi(ring, seg+1),   col);
      writeTri(vi(ring, seg+1), vi(ring+1, seg),   vi(ring+1, seg+1), col);
    }
  }

  return { positions, colors };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function weightedPick<T>(items: T[], weights: number[]): T {
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < items.length; i++) { r -= weights[i]; if (r <= 0) return items[i]; }
  return items[items.length - 1];
}

const TINTS   = ['#a8c4ff','#ffd080','#ff9ec8','#80ffdc','#dde8ff','#ffb870','#c8a0ff','#ffe0b0'];
const STYLES  : GalaxyStyle[] = ['spiral','barred','elliptical','edge-on','irregular'];
const WEIGHTS : number[]      = [  0.30,    0.18,     0.28,      0.14,      0.10];

// ── Soft radial-glow texture ──────────────────────────────────────────────────

function makeGlowTex(size = 64): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0.00, 'rgba(255,255,255,0.85)');
  g.addColorStop(0.20, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.50, 'rgba(255,255,255,0.18)');
  g.addColorStop(0.80, 'rgba(255,255,255,0.04)');
  g.addColorStop(1.00, 'rgba(255,255,255,0.00)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function BackgroundGalaxies({ count = 120 }: { count?: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef  = useRef<THREE.InstancedMesh>(null);

  const glowGeo = useMemo(() => new THREE.PlaneGeometry(1, 1), []);
  const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
    map: makeGlowTex(),
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), []);

  const mat = useMemo(() => new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), []);

  useEffect(() => {
    const group    = groupRef.current;
    const glowMesh = glowRef.current;
    if (!group || !glowMesh) return;

    const allPos: number[] = [];
    const allCol: number[] = [];
    const dummy = new THREE.Object3D();
    const tmp   = new THREE.Vector3();

    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const r     = 340 + Math.random() * 65;
      const pos   = new THREE.Vector3(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi),
      );

      const tint    = new THREE.Color(TINTS[Math.floor(Math.random() * TINTS.length)]);
      const style   = weightedPick(STYLES, WEIGHTS);
      const u       = Math.random();
      const scale   = u < 0.65 ? 1.5 + Math.random() * 3   // small  1.5–4.5
                    : u < 0.90 ? 4.5 + Math.random() * 4   // medium 4.5–8.5
                    :            8.5 + Math.random() * 5;   // large  8.5–13.5
      const opacity = 0.30 + Math.random() * 0.55;

      const spin = Math.random() * Math.PI * 2;
      dummy.position.copy(pos);
      dummy.lookAt(0, 0, 0);
      dummy.rotateZ(spin);
      dummy.scale.set(1, 1, 1);
      dummy.updateMatrix();

      const { positions, colors } = buildLocalArrays(style, tint, scale, opacity);
      for (let vi = 0; vi < positions.length; vi += 3) {
        tmp.set(positions[vi], positions[vi+1], positions[vi+2]);
        tmp.applyMatrix4(dummy.matrix);
        allPos.push(tmp.x, tmp.y, tmp.z);
      }
      for (let ci = 0; ci < colors.length; ci++) allCol.push(colors[ci]);

      // Glow halo — same orientation, scaled to bleed past the polygon edge
      dummy.scale.set(scale * 3.0, scale * 3.0, 1);
      dummy.updateMatrix();
      glowMesh.setMatrixAt(i, dummy.matrix);
      glowMesh.setColorAt(i, tint);
    }

    glowMesh.instanceMatrix.needsUpdate = true;
    if (glowMesh.instanceColor) glowMesh.instanceColor.needsUpdate = true;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(allPos, 3));
    geo.setAttribute('color',    new THREE.Float32BufferAttribute(allCol, 3));
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);

    return () => { geo.dispose(); group.remove(mesh); };
  }, [count, mat]);

  const starPos = useMemo(() => {
    const n = 350, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi   = Math.acos(2 * Math.random() - 1);
      const rr    = 390 + Math.random() * 20;
      pos[i*3]   = rr * Math.sin(phi) * Math.cos(theta);
      pos[i*3+1] = rr * Math.sin(phi) * Math.sin(theta);
      pos[i*3+2] = rr * Math.cos(phi);
    }
    return pos;
  }, []);

  useFrame(({ camera }) => { groupRef.current?.position.copy(camera.position); });

  return (
    <group ref={groupRef}>
      <points renderOrder={-100}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[starPos, 3]} />
        </bufferGeometry>
        <pointsMaterial size={2.2} sizeAttenuation color="#b8ccff" transparent opacity={0.55} depthWrite={false} />
      </points>
      <instancedMesh ref={glowRef} args={[glowGeo, glowMat, count]} />
    </group>
  );
}
