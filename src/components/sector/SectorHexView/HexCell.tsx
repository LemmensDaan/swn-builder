import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
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

function HexBorder({ hexSize }: { hexSize: number }) {
  const points = useMemo(() => {
    const r = hexSize * 0.92;
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 6; i++) {
      const a = (Math.PI / 3) * i;
      pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
    }
    return pts;
  }, [hexSize]);

  return (
    // @ts-expect-error r3f line vs svg line namespace conflict
    <line position={[0, 0.01, 0]}>
      <bufferGeometry setFromPoints={points} />
      <lineBasicMaterial color="#2a3a5a" transparent opacity={0.6} />
    </line>
  );
}

// Even-q offset layout: odd columns shift down by half a hex height.
// This gives a rectangular grid outline instead of a parallelogram.
export function hexToWorld(q: number, r: number, size: number): [number, number] {
  const x = size * (3 / 2) * q;
  const y = size * Math.sqrt(3) * (r + (q % 2 !== 0 ? 0.5 : 0));
  return [x, -y];
}

const HEX_BASE_COLOR     = new THREE.Color('#1a2035');
const HEX_HOVER_COLOR    = new THREE.Color('#2a3555');
const HEX_OCCUPIED_COLOR = new THREE.Color('#1e3040');

interface Props {
  cell: HexCellType;
  system: StarSystem | undefined;
  faction: Faction | undefined;
  hexSize: number;
  selected: boolean;
  onSelect: () => void;
}

export default function HexCell({ cell, system, faction, hexSize, selected, onSelect }: Props) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const shape = useMemo(() => buildHexShape(hexSize * 0.92), [hexSize]);

  const color = useMemo(() => {
    if (faction) return new THREE.Color(faction.color);
    if (system) return HEX_OCCUPIED_COLOR;
    return HEX_BASE_COLOR;
  }, [faction, system]);

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const targetY = hovered || selected ? 0.18 : 0;
    meshRef.current.position.y += (targetY - meshRef.current.position.y) * Math.min(delta * 12, 1);
  });

  const [wx, wz] = hexToWorld(cell.q, cell.r, hexSize);

  return (
    <group position={[wx, 0, wz]}>
      <mesh
        ref={meshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        onClick={e => { e.stopPropagation(); onSelect(); }}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
      >
        <shapeGeometry args={[shape]} />
        <meshStandardMaterial
          color={hovered || selected ? HEX_HOVER_COLOR : color}
          emissive={selected ? new THREE.Color('#4466aa') : hovered ? new THREE.Color('#2244aa') : new THREE.Color(0, 0, 0)}
          emissiveIntensity={selected ? 0.4 : hovered ? 0.2 : 0}
          flatShading
        />
      </mesh>

      <HexBorder hexSize={hexSize} />

      {/* Star dot */}
      {system && (
        <mesh position={[0, 0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[hexSize * 0.12, 12]} />
          <meshStandardMaterial
            color={system.objects[0]?.primaryColor ?? system.objects[0]?.colors[0] ?? '#FFF4C2'}
            emissive={system.objects[0]?.primaryColor ?? system.objects[0]?.colors[0] ?? '#FFF4C2'}
            emissiveIntensity={0.8}
          />
        </mesh>
      )}

      {/* Hover-only system name — no leader line */}
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
