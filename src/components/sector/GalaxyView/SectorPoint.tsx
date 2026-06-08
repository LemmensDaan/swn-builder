import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { Sector } from '../../../types/sector';

export function galaxyToWorld(gx: number, gy: number): [number, number, number] {
  return [(gx - 0.5) * 30, 0, (gy - 0.5) * 15];
}

interface Props {
  sector: Sector;
  pulsed: boolean; // highlighted from the sector list panel
  onClick: () => void;
  onDragEnd: (nx: number, ny: number) => void;
}

export default function SectorPoint({ sector, pulsed, onClick, onDragEnd }: Props) {
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const dragMoved = useRef(false);
  const meshRef = useRef<THREE.Mesh>(null);
  const { camera, gl } = useThree();
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  const [wx, , wz] = galaxyToWorld(sector.galaxyX, sector.galaxyY);
  const active = hovered || pulsed;

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    const target = active ? 1.5 : 1.0;
    const cur = meshRef.current.scale.x;
    const next = cur + (target - cur) * Math.min(delta * 10, 1);
    meshRef.current.scale.setScalar(next);
  });

  function worldFromPointer(e: PointerEvent): THREE.Vector3 | null {
    const rect = gl.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(plane, hit) ? hit : null;
  }

  return (
    <group position={[wx, 0, wz]}>
      {/* Hover glow ring */}
      {active && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.38, 0.58, 24]} />
          <meshBasicMaterial color="#88aaff" transparent opacity={0.45} />
        </mesh>
      )}

      <mesh
        ref={meshRef}
        onPointerEnter={e => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { setHovered(false); document.body.style.cursor = ''; }}
        onPointerDown={e => {
          e.stopPropagation();
          setDragging(true);
          dragMoved.current = false;
          gl.domElement.setPointerCapture(e.pointerId);
        }}
        onPointerMove={e => {
          if (!dragging) return;
          const hit = worldFromPointer(e.nativeEvent as PointerEvent);
          if (!hit) return;
          dragMoved.current = true;
          onDragEnd(
            Math.max(0.02, Math.min(0.98, hit.x / 30 + 0.5)),
            Math.max(0.02, Math.min(0.98, hit.z / 15 + 0.5)),
          );
        }}
        onPointerUp={e => {
          setDragging(false);
          gl.domElement.releasePointerCapture(e.pointerId);
          if (!dragMoved.current) onClick();
        }}
      >
        <sphereGeometry args={[0.25, 8, 8]} />
        <meshLambertMaterial color="#88aaff" emissive="#4466dd" emissiveIntensity={active ? 1.4 : 0.7} flatShading />
      </mesh>

      {/* Hover-only label — monospace text, no line, fades in */}
      {active && (
        <Html center distanceFactor={48} position={[0.45, 0.2, 0]} style={{ pointerEvents: 'none' }}>
          <div style={{ fontFamily: 'monospace', fontSize: '11px', color: 'rgba(200,215,255,0.92)', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
            {sector.name}
          </div>
        </Html>
      )}
    </group>
  );
}
