import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import * as THREE from 'three';
import type { HexCell as HexCellType, StarSystem, Faction } from '../../../types/sector';

function flatHexPoints(r: number): number[] {
  const pts: number[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i;
    pts.push(Math.cos(a) * r, Math.sin(a) * r);
  }
  return pts;
}

function buildHexShape(r: number): THREE.Shape {
  const pts = flatHexPoints(r);
  const shape = new THREE.Shape();
  shape.moveTo(pts[0], pts[1]);
  for (let i = 2; i < pts.length; i += 2) shape.lineTo(pts[i], pts[i + 1]);
  shape.closePath();
  return shape;
}

// Per-faction stripe pattern
type StripePattern = 'right-diag' | 'left-diag' | 'horizontal' | 'woven-horiz';

// ShaderMaterial using position.xy directly — bypasses ShapeGeometry's non-normalised UVs
// so stripes are always perfectly straight regardless of triangulation.
function createStripeMaterial(color: string, pattern: StripePattern): THREE.ShaderMaterial {
  const HALF = 0.13; // half stripe period in hex-local units (~1.0 radius)
  const FULL = (HALF * 2).toFixed(4);
  const HALF_S = HALF.toFixed(4);

  const vertexShader = `
    varying vec2 vPos;
    void main() {
      vPos = position.xy;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `;

  let fragmentShader: string;

  if (pattern === 'right-diag' || pattern === 'left-diag' || pattern === 'horizontal') {
    const tExpr =
      pattern === 'right-diag' ? '(vPos.x - vPos.y) * 0.7071' :
      pattern === 'left-diag'  ? '(vPos.x + vPos.y) * 0.7071' :
                                  'vPos.y';
    fragmentShader = `
      uniform vec3 uColor;
      varying vec2 vPos;
      void main() {
        float t = ${tExpr};
        float s = mod(t, ${FULL});
        if (s < 0.0) s += ${FULL};
        if (s > ${HALF_S}) discard;
        gl_FragColor = vec4(uColor, 0.6);
      }
    `;
  } else {
    // woven-horiz: horizontal stripe that basket-weaves through the right-diagonal.
    // At each diagonal stripe crossing, the horizontal alternately goes over/under
    // based on which diagonal "cell" it occupies — creating a true woven appearance.
    fragmentShader = `
      uniform vec3 uColor;
      varying vec2 vPos;
      void main() {
        float half_p = ${HALF_S};
        float full_p = ${FULL};

        // Horizontal stripe zone
        float h = mod(vPos.y, full_p);
        if (h < 0.0) h += full_p;
        if (h > half_p) discard;

        // Right-diagonal axis (same period as other stripes)
        float diag      = (vPos.x - vPos.y) * 0.7071;
        float diagCell  = floor(diag / full_p);
        float diagS     = mod(diag, full_p);
        if (diagS < 0.0) diagS += full_p;
        bool  inDiag    = diagS <= half_p;

        // Even cells: horizontal goes under the diagonal (hidden where diagonal is)
        // Odd cells:  horizontal goes over (always visible inside h stripe)
        bool goesUnder = mod(diagCell, 2.0) < 1.0;
        if (goesUnder && inDiag) discard;

        gl_FragColor = vec4(uColor, 0.6);
      }
    `;
  }

  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) } },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}

function HexBorder({ hexSize, zoomProgressRef }: {
  hexSize: number;
  zoomProgressRef?: React.MutableRefObject<number>;
}) {
  const lineRef = useRef<any>(null);

  const points = useMemo(() => {
    const r = hexSize * 0.92;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }, [hexSize]);

  useFrame(() => {
    if (!lineRef.current?.material || !zoomProgressRef) return;
    const u = zoomProgressRef.current;
    lineRef.current.material.opacity = Math.max(0, Math.min(0.4, 0.4 * (1 - (u - 0.1) / 0.35)));
    lineRef.current.material.transparent = true;
  });

  return (
    <Line
      ref={lineRef}
      points={points}
      color="#2a3a5a"
      lineWidth={0.8}
      transparent
      opacity={0.4}
      position={[0, 0.01, 0]}
    />
  );
}

// Even-q offset layout: odd columns shift down by half a hex height.
export function hexToWorld(q: number, r: number, size: number): [number, number] {
  const x = size * (3 / 2) * q;
  const y = size * Math.sqrt(3) * (r + (q % 2 !== 0 ? 0.5 : 0));
  return [x, -y];
}

const HEX_BASE_COLOR        = new THREE.Color('#0d1018');
const HEX_BASE_HOVER_COLOR  = new THREE.Color('#1a2035');
const HEX_OCCUPIED_COLOR    = new THREE.Color('#1e3040');
const EMISSIVE_GLOW         = new THREE.Color('#e9a322');
const EMISSIVE_NONE         = new THREE.Color(0, 0, 0);

interface Props {
  cell: HexCellType;
  system: StarSystem | undefined;
  faction: Faction | undefined;
  contestedFactions?: Faction[];
  hexSize: number;
  selected: boolean;
  onSelect: () => void;
  zoomProgressRef?: React.MutableRefObject<number>;
  routeMode?: boolean;
  isRouteStart?: boolean;
  focusMode?: 'hexes' | 'routes';
}

const EMISSIVE_ROUTE_START = new THREE.Color('#86efac');

export default function HexCell({ cell, system, faction, contestedFactions, hexSize, selected, onSelect, zoomProgressRef, routeMode, isRouteStart, focusMode = 'hexes' }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const hexGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => buildHexShape(hexSize * 0.92), [hexSize]);

  const nContested = contestedFactions?.length ?? 0;

  // Base hex color:
  //   controlled                       → controller faction color
  //   uncontrolled + 2-3 contesting    → first contested faction color
  //   everything else                  → neutral occupied / empty
  const controllerColor   = faction?.color ?? null;
  const contested0Color   = !faction && nContested >= 2 ? (contestedFactions![0].color) : null;
  const color = useMemo(() => {
    if (controllerColor)  return new THREE.Color(controllerColor);
    if (contested0Color)  return new THREE.Color(contested0Color);
    return system ? HEX_OCCUPIED_COLOR : HEX_BASE_COLOR;
  }, [controllerColor, contested0Color, system]);

  // Which factions get stripe overlays and which patterns:
  //   controlled:               all contestedFactions → right-diag / left-diag / horizontal
  //   uncontrolled, 2-3 cont:   contestedFactions[1..] → right-diag / horizontal (first is base)
  //   uncontrolled, 0-1 cont:   no stripes
  const CTRL_PATTERNS: StripePattern[]   = ['right-diag', 'woven-horiz'];
  const UNCTR_PATTERNS: StripePattern[]  = ['right-diag', 'woven-horiz'];

  const stripeEntries = useMemo(() => {
    if (faction) {
      return (contestedFactions ?? []).slice(0, CTRL_PATTERNS.length).map((f, i) => ({ color: f.color, pattern: CTRL_PATTERNS[i] }));
    }
    if (nContested === 1) {
      return [{ color: contestedFactions![0].color, pattern: 'right-diag' as StripePattern }];
    }
    if (nContested >= 2) {
      return (contestedFactions ?? []).slice(1).map((f, i) => ({ color: f.color, pattern: UNCTR_PATTERNS[i] }));
    }
    return [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [faction?.id, nContested, contestedFactions?.map(f => f.id + f.color).join('|')]);

  const stripeKey = stripeEntries.map(e => e.color + e.pattern).join('|');
  const stripeMaterials = useMemo(() => {
    if (!stripeKey) return [];
    return stripeEntries.map(e => createStripeMaterial(e.color, e.pattern));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stripeKey]);

  // Dispose all shader materials when they change or on unmount
  useEffect(() => () => { stripeMaterials.forEach(m => m.dispose()); }, [stripeMaterials]);

  useFrame((state, delta) => {
    if (!meshRef.current || !matRef.current) return;

    const targetY = selected ? 0.18 : hovered ? 0.08 : 0;
    if (hexGroupRef.current) {
      hexGroupRef.current.position.y += (targetY - hexGroupRef.current.position.y) * Math.min(delta * 12, 1);
    }

    matRef.current.color.copy(hovered && !system && !faction ? HEX_BASE_HOVER_COLOR : color);

    if (isRouteStart) {
      matRef.current.emissive.copy(EMISSIVE_ROUTE_START);
      matRef.current.emissiveIntensity = 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 3);
    } else if (selected) {
      matRef.current.emissive.copy(EMISSIVE_GLOW);
      matRef.current.emissiveIntensity = 0.45 + 0.25 * Math.sin(state.clock.elapsedTime * 2.5);
    } else if (hovered) {
      matRef.current.emissive.copy(routeMode ? EMISSIVE_ROUTE_START : EMISSIVE_GLOW);
      matRef.current.emissiveIntensity = 0.3;
    } else {
      matRef.current.emissive.copy(EMISSIVE_NONE);
      matRef.current.emissiveIntensity = 0;
    }

    if (zoomProgressRef && groupRef.current) {
      const u = zoomProgressRef.current;
      const opacity = Math.max(0, Math.min(1, 1 - (u - 0.1) / 0.35));
      groupRef.current.traverse(child => {
        const c = child as any;
        if (c.userData?.isStarDot) return;
        if (c.isMesh && c.material) {
          c.material.transparent = true;
          c.material.opacity = opacity;
        }
      });
      if (dotGroupRef.current) {
        const dotOpacity = Math.max(0, Math.min(1, 1 - u / 0.15));
        dotGroupRef.current.traverse(child => {
          const c = child as any;
          if (c.isMesh && c.material) {
            c.material.transparent = true;
            c.material.opacity = dotOpacity;
          }
        });
      }
    }
  });

  const [wx, wz] = hexToWorld(cell.q, cell.r, hexSize);

  return (
    <group ref={groupRef} position={[wx, 0, wz]}>
      <group ref={hexGroupRef}>
        {/* Base solid mesh — controller color, or neutral if uncontrolled */}
        <mesh
          ref={meshRef}
          rotation={[-Math.PI / 2, 0, 0]}
          onClick={e => { e.stopPropagation(); if (focusMode === 'hexes') onSelect(); }}
          onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = routeMode ? 'crosshair' : 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
        >
          <shapeGeometry args={[shape]} />
          <meshStandardMaterial ref={matRef} color={color} flatShading />
        </mesh>

        {/* One stripe overlay per contested faction: /, \, — shader computes straight lines from position.xy */}
        {stripeMaterials.map((mat, i) => (
          <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001 + i * 0.001, 0]} material={mat}>
            <shapeGeometry args={[shape]} />
          </mesh>
        ))}
      </group>

      <HexBorder hexSize={hexSize} zoomProgressRef={zoomProgressRef} />

      {/* Star dot — black holes get an orange ring instead of a filled circle */}
      {system && (
        <group ref={dotGroupRef}>
          {system.objects[0]?.type === 'BlackHole' ? (
            <group position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <mesh userData={{ isStarDot: true }}>
                <circleGeometry args={[hexSize * 0.07, 16]} />
                <meshBasicMaterial color="#000000" />
              </mesh>
              <mesh userData={{ isStarDot: true }}>
                <ringGeometry args={[hexSize * 0.07, hexSize * 0.13, 16]} />
                <meshStandardMaterial color="#ff6620" emissive="#ff6620" emissiveIntensity={0.9} toneMapped={false} />
              </mesh>
            </group>
          ) : (
            <mesh userData={{ isStarDot: true }} position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[hexSize * 0.12, 16]} />
              <meshStandardMaterial
                color={system.objects[0]?.primaryColor ?? system.objects[0]?.colors[0] ?? '#FFF4C2'}
                emissive={system.objects[0]?.primaryColor ?? system.objects[0]?.colors[0] ?? '#FFF4C2'}
                emissiveIntensity={0.8}
              />
            </mesh>
          )}
        </group>
      )}

      {/* Hover-only system name */}
      {system && hovered && (
        <Html center distanceFactor={22} position={[0, 0.3, 0]} style={{ pointerEvents: 'none' }}>
          <div className="text-[9px] text-gray-200 font-medium whitespace-nowrap tracking-wider opacity-90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {system.name}
          </div>
        </Html>
      )}

      {/* Coord label */}
      <Html center distanceFactor={30} position={[0, 0.02, hexSize * 0.55]} style={{ pointerEvents: 'none' }}>
        <div className="text-[7px] text-gray-600 font-mono opacity-50">
          {String(cell.q + 1).padStart(2, '0')}{String(cell.r + 1).padStart(2, '0')}
        </div>
      </Html>
    </group>
  );
}
