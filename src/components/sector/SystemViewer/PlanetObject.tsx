import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import PlanetRings from './PlanetRings';
import { generatePlanetGeometry, PLANET_PRESETS, mulberry32 } from './planetRenderer';
import { getOrbitPosition } from './orbitUtils';

function buildGeo(obj: SystemObject): THREE.BufferGeometry {
  // Use planet type and colors from the object
  const planetType = obj.planetType ?? 'Barren';
  const preset = PLANET_PRESETS[planetType];
  const seed = obj.seed ?? Math.abs((obj.name.charCodeAt(0) ?? 42) * 137 + (obj.sortOrder * 31));

  // Prefer colors[] from color swatches, fall back to preset
  const primaryColor = obj.colors[0] ?? obj.primaryColor ?? preset.primaryColor;
  const secondaryColor = obj.colors[1] ?? obj.colors[0] ?? obj.secondaryColor ?? preset.secondaryColor;

  return generatePlanetGeometry(
    seed,
    planetType,
    primaryColor,
    secondaryColor,
    obj.iceCaps ?? false,
    obj.size,
  );
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
}

export default function PlanetObject({ obj, children }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef  = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  const angle = useRef(mulberry32(obj.seed ?? obj.sortOrder * 137)());
  angle.current = angle.current * Math.PI * 2; // convert to starting angle

  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef   = useRef(angle.current);

  const geo = useMemo(
    () => buildGeo(obj),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.seed, obj.size, obj.planetType, obj.primaryColor, obj.secondaryColor, obj.iceCaps, obj.colors[0], obj.colors[1]],
  );

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
    if (groupRef.current) groupRef.current.position.set(x, y, z);
    if (meshRef.current)  meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.15);
  });

  return (
    <>
      {/* Orbit ring for planets and moons */}
      {obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef}>
        <mesh
          ref={meshRef}
          geometry={geo}
          castShadow
          receiveShadow
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          <meshLambertMaterial vertexColors flatShading shadowSide={THREE.BackSide} />
        </mesh>
        {obj.rings && <PlanetRings obj={obj} />}
        {/* Hover label — monospace text, no line, no box */}
        {hovered && (
          <Html
            center
            distanceFactor={45}
            position={[0, obj.size + 0.5, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#ddd', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
              {obj.tags.length > 0 && (
                <div style={{ color: '#aaa', marginTop: '2px' }}>{obj.tags.join(' · ')}</div>
              )}
            </div>
          </Html>
        )}
        {/* Children (moons, stations) orbit in this planet's local space */}
        {children}
      </group>
    </>
  );
}
