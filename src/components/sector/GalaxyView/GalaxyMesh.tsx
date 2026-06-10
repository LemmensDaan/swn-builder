import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Sector } from '../../../types/sector';
import {
  GALAXY_RADIUS, GALAXY_DEL, GALAXY_POINTS, GALAXY_Y_VALS, GALAXY_TRIANGLES,
  type GalaxyTriangle,
} from './galaxyData';
import type { GalaxyPrefs, ColorScheme } from './galaxyPrefs';

// ─── Color schemes ────────────────────────────────────────────────────────────
// Each entry: [normRadiusEnd, hexColor]. First stop = flat core, rest = lerp bands.
// Design rule: each scheme crosses 3+ distinct hue families so rings read as depth.
const SCHEME_STOPS: Record<ColorScheme, [number, string][]> = {
  // Warm pink core → rose midband → cool blue outer — the original
  classic: [
    [0.06, '#fffef5'], [0.18, '#ffbbdd'], [0.35, '#cc8899'],
    [0.55, '#4455aa'], [0.78, '#111144'], [1.00, '#050510'],
  ],
  // Mint-white core → vivid cyan → teal → shifts to ocean blue outer
  nebula: [
    [0.05, '#f0fffd'], [0.14, '#88ffee'], [0.26, '#22ddbb'],
    [0.40, '#0daa88'], [0.54, '#1166aa'], [0.70, '#07304a'],
    [0.86, '#020d14'], [1.00, '#010809'],
  ],
  // Cream core → vivid gold → amber → shifts to deep crimson outer
  quasar: [
    [0.05, '#fffdf0'], [0.14, '#ffeebb'], [0.26, '#ffcc44'],
    [0.40, '#ff8822'], [0.54, '#cc3300'], [0.70, '#551100'],
    [0.86, '#180500'], [1.00, '#070200'],
  ],
  // Silver-white core → soft lavender → purple → shifts to deep indigo outer
  void: [
    [0.05, '#f2f2ff'], [0.14, '#d0d0ff'], [0.26, '#aa99ff'],
    [0.40, '#7755dd'], [0.54, '#3322aa'], [0.70, '#110f55'],
    [0.86, '#050418'], [1.00, '#020110'],
  ],
  // Pale-green core → vivid lime → forest green → shifts to violet outer
  aurora: [
    [0.05, '#f0fff2'], [0.14, '#bbffcc'], [0.26, '#33ee77'],
    [0.40, '#22bb66'], [0.54, '#1144aa'], [0.70, '#440f99'],
    [0.86, '#19063a'], [1.00, '#080214'],
  ],
  // Ivory core → warm peach → vivid red-orange → deep blood-red outer
  ember: [
    [0.05, '#fff8f5'], [0.14, '#ffc8a8'], [0.26, '#ff6633'],
    [0.40, '#ee1100'], [0.54, '#880800'], [0.70, '#350300'],
    [0.86, '#100100'], [1.00, '#060000'],
  ],
  // Barely-blue white core → sky → azure → shifts to deep cobalt outer
  cerulean: [
    [0.05, '#f0f8ff'], [0.14, '#bbddff'], [0.26, '#55aaff'],
    [0.40, '#2277ee'], [0.54, '#0044bb'], [0.70, '#001a66'],
    [0.86, '#00071a'], [1.00, '#000308'],
  ],
  // Yellow-lime core → vivid chartreuse → rich green → deep emerald outer
  jade: [
    [0.05, '#f5fff0'], [0.14, '#ccff99'], [0.26, '#55ee33'],
    [0.40, '#1a9922'], [0.54, '#0d6633'], [0.70, '#052e18'],
    [0.86, '#020e08'], [1.00, '#010604'],
  ],
  // Barely-pink core → vivid coral → fuchsia → shifts to deep violet outer
  twilight: [
    [0.05, '#fff5f8'], [0.14, '#ffc0d0'], [0.26, '#ff6688'],
    [0.40, '#ee2277'], [0.54, '#7722aa'], [0.70, '#221166'],
    [0.86, '#080520'], [1.00, '#030210'],
  ],
  // Warm-white core → soft gold → vivid copper → bronze-sienna outer (never bleeds red)
  copper: [
    [0.05, '#fefaf0'], [0.14, '#ffeea8'], [0.26, '#ee9933'],
    [0.40, '#aa5522'], [0.54, '#6b3311'], [0.70, '#2e1508'],
    [0.86, '#0d0503'], [1.00, '#060201'],
  ],
};

function galaxyColor(d: number, scheme: ColorScheme): THREE.Color {
  const stops = SCHEME_STOPS[scheme];
  if (d < stops[0][0]) return new THREE.Color(stops[0][1]);
  for (let i = 0; i < stops.length - 1; i++) {
    const [d0, c0] = stops[i];
    const [d1, c1] = stops[i + 1];
    if (d < d1) {
      return new THREE.Color().lerpColors(new THREE.Color(c0), new THREE.Color(c1), (d - d0) / (d1 - d0));
    }
  }
  return new THREE.Color(stops[stops.length - 1][1]);
}

function colorRadius(d: number): number {
  return d;
}

// ─── Galaxy shape brightness ──────────────────────────────────────────────────

// Parameters for the spiral-family styles.
interface ShapeParams {
  numArms:    number;
  kWind:      number;
  armSigma:   number;
  armMin:     number;
  barRadius?: number;
  barSigma?:  number;
}
const SHAPE_PARAMS: Partial<Record<GalaxyPrefs['style'], ShapeParams>> = {
  spiral: { numArms: 2, kWind: 4.5, armSigma: 0.60, armMin: 0.45 },
  triple: { numArms: 3, kWind: 4.5, armSigma: 0.55, armMin: 0.45 },
  quad:   { numArms: 4, kWind: 4.5, armSigma: 0.50, armMin: 0.45 },
  barred: { numArms: 2, kWind: 4.5, armSigma: 0.55, armMin: 0.40, barRadius: 0.28, barSigma: 0.35 },
};

function galaxyBrightness(x: number, z: number, style: GalaxyPrefs['style']): number {
  if (style === 'classic') return 1.0;
  const r = Math.sqrt(x * x + z * z);

  // ── Lenticular: dominant bright bulge + very dim outer disc, no arms ─────────
  if (style === 'lenticular') {
    const d  = r / GALAXY_RADIUS;
    if (d < 0.22) return 1.0;
    const t  = Math.min(Math.max((d - 0.22) / 0.30, 0), 1);
    const st = t * t * (3 - 2 * t);
    return 1.0 * (1 - st) + 0.18 * st;
  }

  // ── Spiral family: protect bulge from arm modulation ─────────────────────────
  if (r < 1.5) return 1.0;
  const p = SHAPE_PARAMS[style];
  if (!p) return 1.0;

  const { numArms, kWind, armSigma, armMin } = p;
  const actualAngle = Math.atan2(z, x);
  const woundAngle  = kWind * Math.log(GALAXY_RADIUS / r);

  let minDiff = Math.PI;
  for (let arm = 0; arm < numArms; arm++) {
    let diff = actualAngle - (arm * (2 * Math.PI / numArms) + woundAngle);
    diff -= Math.round(diff / (2 * Math.PI)) * 2 * Math.PI;
    minDiff = Math.min(minDiff, Math.abs(diff));
  }
  const spiralBri = armMin + (1 - armMin) * Math.exp(-(minDiff * minDiff) / (2 * armSigma * armSigma));

  if (!p.barRadius) return spiralBri;

  // Bar: Gaussian falloff from the 0°/180° axis, smoothstep-blended with arms
  const barDiff = Math.abs(Math.sin(actualAngle));
  const bSig    = p.barSigma ?? 0.35;
  const barBri  = 0.38 + 0.62 * Math.exp(-(barDiff * barDiff) / (2 * bSig * bSig));
  const R_BAR   = p.barRadius * GALAXY_RADIUS;
  const t       = Math.min(Math.max(r / R_BAR, 0), 1);
  const st      = t * t * (3 - 2 * t);
  return barBri * (1 - st) + spiralBri * st;
}

// ─── Geometry builders ────────────────────────────────────────────────────────

function buildGalaxyGeometry(style: GalaxyPrefs['style'], colorScheme: ColorScheme): THREE.BufferGeometry {
  const positions: number[] = [];
  const colors: number[]    = [];

  for (let i = 0; i < GALAXY_DEL.triangles.length; i += 3) {
    const i0 = GALAXY_DEL.triangles[i], i1 = GALAXY_DEL.triangles[i + 1], i2 = GALAXY_DEL.triangles[i + 2];
    const [x0, z0] = GALAXY_POINTS[i0];
    const [x1, z1] = GALAXY_POINTS[i1];
    const [x2, z2] = GALAXY_POINTS[i2];

    const cx = (x0 + x1 + x2) / 3, cz = (z0 + z1 + z2) / 3;
    const dist = Math.sqrt(cx * cx + cz * cz);

    if (dist > GALAXY_RADIUS * 0.98) continue;
    const e01 = Math.hypot(x1 - x0, z1 - z0);
    const e12 = Math.hypot(x2 - x1, z2 - z1);
    const e20 = Math.hypot(x0 - x2, z0 - z2);
    if (Math.max(e01, e12, e20) > 4.5) continue;

    const d    = Math.min(dist / GALAXY_RADIUS, 1);
    const base = galaxyColor(colorRadius(d), colorScheme);
    const bri  = galaxyBrightness(cx, cz, style);
    const cr = base.r * bri, cg = base.g * bri, cb = base.b * bri;

    positions.push(x0, GALAXY_Y_VALS[i0], z0, x1, GALAXY_Y_VALS[i1], z1, x2, GALAXY_Y_VALS[i2], z2);
    for (let v = 0; v < 3; v++) colors.push(cr, cg, cb);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));
  return geo;
}

interface SparkleEntry { x: number; y: number; z: number; r: number; g: number; b: number; }

function buildSparkleData(style: GalaxyPrefs['style'], colorScheme: ColorScheme): SparkleEntry[] {
  const out: SparkleEntry[] = [];
  for (let i = 0; i < 5000; i++) {
    const radius = i < 2000
      ? Math.pow(Math.random(), 2.0) * GALAXY_RADIUS
      : Math.sqrt(Math.random()) * GALAXY_RADIUS;
    const angle = Math.random() * Math.PI * 2;
    const d = radius / GALAXY_RADIUS;
    const x = Math.cos(angle) * radius, z = Math.sin(angle) * radius;
    const maxHalf = 1.6 * Math.sqrt(Math.max(0, 1 - d * d));
    const y = (Math.random() - 0.5) * 2 * maxHalf;
    const c = galaxyColor(colorRadius(d), colorScheme);
    const bri = galaxyBrightness(x, z, style);
    out.push({ x, y, z, r: c.r * bri, g: c.g * bri, b: c.b * bri });
  }
  return out;
}

// ─── Sector triangle overlay ──────────────────────────────────────────────────

const FILL_Y = 0.15;
const DOT_COUNT = 6;

function randomInTriangle(tri: GalaxyTriangle): [number, number] {
  const r1 = Math.random(), r2 = Math.random();
  const s = Math.sqrt(r1);
  const u = 1 - s, v = s * (1 - r2), w = s * r2;
  return [u * tri.x0 + v * tri.x1 + w * tri.x2, u * tri.z0 + v * tri.z1 + w * tri.z2];
}

function SectorTriangle({
  tri, name, pulsed, colorScheme, onClick,
}: {
  tri: GalaxyTriangle;
  name: string;
  pulsed: boolean;
  colorScheme: ColorScheme;
  onClick: (worldPos: THREE.Vector3) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const active = hovered || pulsed;

  const baseColor = useMemo(() => {
    const dist = Math.sqrt(tri.cx * tri.cx + tri.cz * tri.cz);
    return galaxyColor(Math.min(dist / GALAXY_RADIUS, 1), colorScheme);
  }, [tri, colorScheme]);

  const hoverColor = useMemo(
    () => new THREE.Color().lerpColors(baseColor, new THREE.Color('#99ddff'), 0.6),
    [baseColor],
  );

  const fillGeo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([
      tri.x0, FILL_Y, tri.z0,
      tri.x1, FILL_Y, tri.z1,
      tri.x2, FILL_Y, tri.z2,
    ], 3));
    return g;
  }, [tri]);

  // Twinkling dots — random positions inside the triangle, independent phases
  const dots = useMemo(() => Array.from({ length: DOT_COUNT }, () => {
    const [x, z] = randomInTriangle(tri);
    return { x, z, phase: Math.random() * Math.PI * 2, speed: 0.4 + Math.random() * 0.9 };
  }), [tri]);

  const matRef       = useRef<THREE.MeshBasicMaterial>(null);
  const lerpedColor  = useRef(baseColor.clone());
  const instancedRef = useRef<THREE.InstancedMesh>(null);
  const dodecaGeo    = useMemo(() => new THREE.DodecahedronGeometry(0.04, 0), []);
  const dodecaMat    = useMemo(() => new THREE.MeshBasicMaterial(), []);
  const _color       = useMemo(() => new THREE.Color(), []);

  useEffect(() => {
    const mesh = instancedRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    dots.forEach((dot, i) => {
      matrix.makeTranslation(dot.x, FILL_Y + 0.1, dot.z);
      mesh.setMatrixAt(i, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
  }, [dots]);

  useFrame(({ clock }, delta) => {
    const mat = matRef.current;
    if (mat) {
      const speed = delta * 5;
      lerpedColor.current.lerp(active ? hoverColor : baseColor, Math.min(speed, 1));
      mat.color.copy(lerpedColor.current);
      const pulse = active ? 0.08 * Math.sin(clock.elapsedTime * 2.8) : 0;
      const targetOpacity = active ? 0.88 + pulse : 0.55;
      mat.opacity += (targetOpacity - mat.opacity) * Math.min(speed, 1);
    }

    const mesh = instancedRef.current;
    if (!mesh) return;
    const t = clock.elapsedTime;
    dots.forEach((dot, i) => {
      const v = Math.max(0, Math.pow(Math.sin(t * dot.speed + dot.phase), 8));
      const rest = 0.05;
      _color.setRGB(
        Math.min(1, baseColor.r + rest + v),
        Math.min(1, baseColor.g + rest + v),
        Math.min(1, baseColor.b + rest + v),
      );
      mesh.setColorAt(i, _color);
    });
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  return (
    <group>
      <mesh
        geometry={fillGeo}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
        onClick={e => { e.stopPropagation(); onClick(e.point); }}
      >
        <meshBasicMaterial
          ref={matRef}
          transparent
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      <instancedMesh ref={instancedRef} args={[dodecaGeo, dodecaMat, DOT_COUNT]} />
      {active && (
        <Html
          center
          position={[tri.cx, 0.6, tri.cz]}
          distanceFactor={48}
          style={{ pointerEvents: 'none' }}
        >
          <div style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            color: 'rgba(255,240,180,0.95)',
            whiteSpace: 'nowrap',
            textShadow: '0 1px 4px #000',
          }}>
            {name}
          </div>
        </Html>
      )}
    </group>
  );
}

// ─── Main component (forwardRef exposes getWorldPos for sidebar navigation) ──

interface Props {
  sectors: Sector[];
  highlightedId: string | null;
  onSectorClick: (id: string, worldPos: THREE.Vector3) => void;
  prefs: GalaxyPrefs;
  pauseRotation?: boolean;
}

export interface GalaxyMeshHandle {
  getWorldPos(triangleIndex: number): THREE.Vector3 | null;
}

const GalaxyMesh = forwardRef<GalaxyMeshHandle, Props>(function GalaxyMesh(
  { sectors, highlightedId, onSectorClick, prefs, pauseRotation },
  ref,
) {
  const groupRef      = useRef<THREE.Group>(null);

  useImperativeHandle(ref, () => ({
    getWorldPos(triangleIndex: number) {
      const tri = GALAXY_TRIANGLES[triangleIndex];
      if (!tri || !groupRef.current) return null;
      groupRef.current.updateWorldMatrix(true, false);
      return new THREE.Vector3(tri.cx, 0, tri.cz).applyMatrix4(groupRef.current.matrixWorld);
    },
  }), []);
  const sparkleRef    = useRef<THREE.InstancedMesh>(null);
  // const transitionRef = useRef(0);
  // const prevStyleRef = useRef(prefs.style);
  // const directionRef = useRef(1);

  const meshGeo       = useMemo(() => buildGalaxyGeometry(prefs.style, prefs.colorScheme), [prefs.style, prefs.colorScheme]);
  const sparkleData   = useMemo(() => buildSparkleData(prefs.style, prefs.colorScheme), [prefs.style, prefs.colorScheme]);
  const sparkleDodGeo = useMemo(() => new THREE.DodecahedronGeometry(0.04, 0), []);
  const sparkleDodMat = useMemo(() => new THREE.MeshBasicMaterial(), []);

  // useEffect(() => {
  //   if (prefs.style !== prevStyleRef.current) {
  //     const styles = ['classic', 'lenticular', 'spiral', 'triple', 'quad', 'barred'] as const;
  //     const prevIdx = styles.indexOf(prevStyleRef.current);
  //     const newIdx = styles.indexOf(prefs.style);
  //     directionRef.current = newIdx > prevIdx ? 1 : -1;
  //     prevStyleRef.current = prefs.style;
  //     transitionRef.current = 1;
  //   }
  // }, [prefs.style]);

  useEffect(() => {
    const mesh = sparkleRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const color  = new THREE.Color();
    sparkleData.forEach(({ x, y, z, r, g, b }, i) => {
      mesh.setMatrixAt(i, matrix.makeTranslation(x, y, z));
      mesh.setColorAt(i, color.setRGB(r, g, b));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [sparkleData]);

  // Commented out slide animation - uncomment to re-enable:
  // useEffect(() => {
  //   if (prefs.style !== prevStyleRef.current) {
  //     const styles = ['classic', 'lenticular', 'spiral', 'triple', 'quad', 'barred'] as const;
  //     const prevIdx = styles.indexOf(prevStyleRef.current);
  //     const newIdx = styles.indexOf(prefs.style);
  //     directionRef.current = newIdx > prevIdx ? 1 : -1;
  //     prevStyleRef.current = prefs.style;
  //     transitionRef.current = 1;
  //   }
  // }, [prefs.style]);
  //
  // useFrame((_, delta) => {
  //   if (groupRef.current) {
  //     groupRef.current.rotation.y += delta * 0.05;
  //
  //     const duration = 0.8;
  //     const dir = directionRef.current;
  //
  //     if (transitionRef.current > 0) {
  //       transitionRef.current = Math.max(0, transitionRef.current - delta / duration);
  //       const t = transitionRef.current;
  //
  //       if (t > 0.5) {
  //         // First half: slide out old galaxy
  //         const outProgress = (1 - t) / 0.5;  // 0 to 1
  //         const eased = outProgress * outProgress * (3 - 2 * outProgress);
  //         groupRef.current.position.x = eased * 80 * dir;
  //       } else {
  //         // Second half: slide in new galaxy
  //         const inProgress = t / 0.5;  // 1 to 0
  //         const eased = inProgress * inProgress * (3 - 2 * inProgress);
  //         groupRef.current.position.x = -(eased * 80 * dir);
  //       }
  //     }
  //   }
  // });

  useFrame((_, delta) => {
    if (!pauseRotation && groupRef.current) groupRef.current.rotation.y -= delta * 0.05;
  });

  return (
    <group ref={groupRef} rotation={[-1.0, 0, 0]}>
      <mesh geometry={meshGeo}>
        <meshBasicMaterial vertexColors side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={sparkleRef} args={[sparkleDodGeo, sparkleDodMat, sparkleData.length]} />
      {sectors.map(s => {
        const tri = GALAXY_TRIANGLES[s.triangleIndex];
        if (!tri) return null;
        return (
          <SectorTriangle
            key={s.id}
            tri={tri}
            name={s.name}
            pulsed={highlightedId === s.id}
            colorScheme={prefs.colorScheme}
            onClick={(pos) => onSectorClick(s.id, pos)}
          />
        );
      })}
    </group>
  );
});

export default GalaxyMesh;
