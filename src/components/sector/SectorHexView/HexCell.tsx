import { useRef, useState, useMemo } from 'react';
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
  hexSize: number;
  selected: boolean;
  onSelect: () => void;
  zoomProgressRef?: React.MutableRefObject<number>;
  routeMode?: boolean;
  isRouteStart?: boolean;
}

const EMISSIVE_ROUTE_START = new THREE.Color('#86efac');

export default function HexCell({ cell, system, faction, hexSize, selected, onSelect, zoomProgressRef, routeMode, isRouteStart }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);
  const dotGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => buildHexShape(hexSize * 0.92), [hexSize]);

  const color = useMemo(() => {
    if (faction) return new THREE.Color(faction.color);
    if (system) return HEX_OCCUPIED_COLOR;
    return HEX_BASE_COLOR;
  }, [faction, system]);


  useFrame((state, delta) => {
    if (!meshRef.current || !matRef.current) return;

    // Subtle Y-lift for hover/selected
    const targetY = selected ? 0.18 : hovered ? 0.08 : 0;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * Math.min(delta * 12, 1);

    // Empty tile hover: lighten the fill color
    matRef.current.color.copy(hovered && !system && !faction ? HEX_BASE_HOVER_COLOR : color);

    // Pulsing emissive for selected/routeStart, steady dim glow for hover
    if (isRouteStart) {
      matRef.current.emissive = EMISSIVE_ROUTE_START;
      matRef.current.emissiveIntensity = 0.5 + 0.3 * Math.sin(state.clock.elapsedTime * 3);
    } else if (selected) {
      matRef.current.emissive = EMISSIVE_GLOW;
      matRef.current.emissiveIntensity = 0.45 + 0.25 * Math.sin(state.clock.elapsedTime * 2.5);
    } else if (hovered) {
      matRef.current.emissive = routeMode ? EMISSIVE_ROUTE_START : EMISSIVE_GLOW;
      matRef.current.emissiveIntensity = 0.3;
    } else {
      matRef.current.emissive = EMISSIVE_NONE;
      matRef.current.emissiveIntensity = 0;
    }

    if (zoomProgressRef && groupRef.current) {
      const u = zoomProgressRef.current;
      const opacity = Math.max(0, Math.min(1, 1 - (u - 0.1) / 0.35));
      groupRef.current.traverse(child => {
        const c = child as any;
        if (c.userData?.isStarDot) return;  // handled separately below
        if (c.isMesh && c.material) {
          c.material.transparent = true;
          c.material.opacity = opacity;
        }
      });
      // Star dot fades faster — gone by u=0.15, well before the hex tile
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
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = routeMode ? 'crosshair' : 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial ref={matRef} color={color} flatShading />
      </mesh>

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
