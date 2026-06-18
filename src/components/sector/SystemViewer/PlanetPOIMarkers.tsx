import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { PlanetPOI, POIType } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';
import { useSystemViewerContext } from './SystemViewerContext';

export const POI_COLORS: Record<POIType, string> = {
  base: '#4a9eff',
  ruin: '#ff9944',
  city: '#44ee88',
  outpost: '#ffee44',
  hazard: '#ff4444',
  other: '#aaaaaa',
};

export const POI_LABELS: Record<POIType, string> = {
  base: 'Base',
  ruin: 'Ruin',
  city: 'City',
  outpost: 'Outpost',
  hazard: 'Hazard',
  other: 'Other',
};

function latLonToPos(lat: number, lon: number, r: number): [number, number, number] {
  const φ = THREE.MathUtils.degToRad(lat);
  const λ = THREE.MathUtils.degToRad(lon);
  return [r * Math.cos(φ) * Math.sin(λ), r * Math.sin(φ), r * Math.cos(φ) * Math.cos(λ)];
}

export function posToLatLon(v: THREE.Vector3): { lat: number; lon: number } {
  const n = v.clone().normalize();
  return {
    lat: THREE.MathUtils.radToDeg(Math.asin(Math.max(-1, Math.min(1, n.y)))),
    lon: THREE.MathUtils.radToDeg(Math.atan2(n.x, n.z)),
  };
}

interface Props {
  pois: PlanetPOI[];
  planetSize: number;
  meshRef: React.RefObject<THREE.Mesh | null>;
  systemId: string;
  objectId: string;
}

export default function PlanetPOIMarkers({ pois, planetSize, meshRef, systemId, objectId }: Props) {
  const { gl, camera, size } = useThree();
  const { updatePOI } = useSectorStore();
  const { orbitControlsRef } = useSystemViewerContext();

  const draggingIdRef = useRef<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const hitPt = useMemo(() => new THREE.Vector3(), []);
  const planetCenter = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    const canvas = gl.domElement;
    const onMove = (e: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onUp = () => {
      if (!draggingIdRef.current) return;
      draggingIdRef.current = null;
      setDraggingId(null);
      if (orbitControlsRef.current) orbitControlsRef.current.enabled = true;
      canvas.style.cursor = '';
    };
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);
    return () => {
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, [gl.domElement, orbitControlsRef]);

  useFrame(() => {
    if (!draggingIdRef.current || !meshRef.current) return;
    const nx = (mouseRef.current.x / size.width) * 2 - 1;
    const ny = -(mouseRef.current.y / size.height) * 2 + 1;
    raycaster.setFromCamera(new THREE.Vector2(nx, ny), camera);
    meshRef.current.getWorldPosition(planetCenter);
    const sphere = new THREE.Sphere(planetCenter, planetSize * 1.01);
    if (raycaster.ray.intersectSphere(sphere, hitPt)) {
      meshRef.current.worldToLocal(hitPt);
      const { lat, lon } = posToLatLon(hitPt);
      updatePOI(systemId, objectId, draggingIdRef.current, { lat, lon });
    }
  });

  // Pin dimensions relative to planet radius
  const HEAD_R   = planetSize * 0.033;
  const STEM_H   = planetSize * 0.09;
  const STEM_TOP = planetSize * 0.006;
  const STEM_BOT = planetSize * 0.002;
  // Embed 20% of the stem into the planet surface for the "pinned" look
  const EMBED    = STEM_H * 0.2;
  const SURF_R   = planetSize; // group sits exactly on the sphere surface

  return (
    <>
      {pois.map(poi => {
        const [px, py, pz] = latLonToPos(poi.lat, poi.lon, SURF_R);
        const color = POI_COLORS[poi.type] ?? '#aaaaaa';
        const isHov = hoveredId === poi.id;
        const isDrag = draggingId === poi.id;
        const glow = isHov || isDrag;

        // Orient the pin so its Y axis points outward from the planet surface
        const norm = new THREE.Vector3(px, py, pz).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), norm);

        // Stem center: shifts so bottom is EMBED below surface, top is (STEM_H - EMBED) above
        const stemCenterY = STEM_H / 2 - EMBED;
        const headY = STEM_H - EMBED + HEAD_R;

        return (
          <group key={poi.id} position={[px, py, pz]} quaternion={q}>
            {/* Needle stem — thin tapered cylinder */}
            <mesh position={[0, stemCenterY, 0]}>
              <cylinderGeometry args={[STEM_TOP, STEM_BOT, STEM_H, 5]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={glow ? 0.7 : 0.2}
                roughness={0.7}
                metalness={0.4}
              />
            </mesh>
            {/* Sphere head — the grab/hover target */}
            <mesh
              position={[0, headY, 0]}
              onPointerEnter={(e) => { e.stopPropagation(); setHoveredId(poi.id); gl.domElement.style.cursor = 'grab'; }}
              onPointerLeave={() => { setHoveredId(h => h === poi.id ? null : h); if (!draggingIdRef.current) gl.domElement.style.cursor = ''; }}
              onPointerDown={(e) => {
                e.stopPropagation();
                draggingIdRef.current = poi.id;
                setDraggingId(poi.id);
                if (orbitControlsRef.current) orbitControlsRef.current.enabled = false;
                gl.domElement.style.cursor = 'grabbing';
              }}
            >
              <sphereGeometry args={[HEAD_R, 10, 10]} />
              <meshStandardMaterial
                color={color}
                emissive={color}
                emissiveIntensity={glow ? 1.4 : 0.7}
                roughness={0.3}
              />
            </mesh>
            {isHov && !draggingId && (
              <Html
                center
                distanceFactor={12}
                position={[0, headY + HEAD_R * 2.5, 0]}
                style={{ pointerEvents: 'none' }}
                zIndexRange={[100, 0]}
              >
                <div style={{
                  background: 'rgba(5,8,15,0.9)',
                  color: '#e0e0e0',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'monospace',
                  whiteSpace: 'nowrap',
                  border: `1px solid ${color}60`,
                  userSelect: 'none',
                }}>
                  {poi.name}
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </>
  );
}
