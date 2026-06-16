import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import PlanetRings from './PlanetRings';
import { generatePlanetGeometry, PLANET_PRESETS, mulberry32 } from './planetRenderer';
import { getOrbitPosition } from './orbitUtils';

function makeGasGiantGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.5, 'rgba(255,200,100,0.15)');
  g.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function buildGeo(obj: SystemObject): THREE.BufferGeometry {
  // Use planet type and colors from the object
  const planetType = obj.planetType ?? 'Barren';
  const preset = PLANET_PRESETS[planetType];
  const seed = obj.seed ?? Math.abs((obj.name.charCodeAt(0) ?? 42) * 137 + (obj.sortOrder * 31));

  // Prefer colors[] from color swatches, fall back to preset
  const primaryColor = obj.colors[0] ?? obj.primaryColor ?? preset.primaryColor;
  const secondaryColor = obj.colors[1] ?? obj.colors[0] ?? obj.secondaryColor ?? preset.secondaryColor;
  const tertiaryColor = obj.tertiaryColor ?? preset.tertiaryColor;

  return generatePlanetGeometry(
    seed,
    planetType,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    obj.iceCaps ?? false,
    obj.size,
    obj.inclination ?? 0,
  );
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  showOrbits?: boolean;
  highQuality?: boolean;
}

export default function PlanetObject({ obj, children, onPositionUpdate, onClick, showOrbits = true, highQuality = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const axisGroupRef = useRef<THREE.Group>(null);
  const meshRef  = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const isGasGiant = obj.planetType === 'GasGiant';

  const angleRef = useRef(mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2);

  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0);

  const geo = useMemo(
    () => buildGeo(obj),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.seed, obj.size, obj.planetType, obj.primaryColor, obj.secondaryColor, obj.iceCaps, obj.colors[0], obj.colors[1]],
  );

  const glowTex = useMemo(() => (isGasGiant && highQuality ? makeGasGiantGlowTexture() : null), [isGasGiant, highQuality]);

  const _worldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.getWorldPosition(_worldPos);
      onPositionUpdate?.([_worldPos.x, _worldPos.y, _worldPos.z]);
    }

    if (meshRef.current && axisGroupRef.current) {
      // Set axis inclination on the axis group (tilts the rotation axis)
      if (obj.axisInclination !== undefined) {
        axisGroupRef.current.rotation.z = THREE.MathUtils.degToRad(obj.axisInclination);
      }

      if (obj.planetType === 'TidallyLocked') {
        // Tidally locked: always face the star
        // Calculate direction from planet to star (at origin)
        const towardsStar = new THREE.Vector3(-x, -y, -z).normalize();

        // The Y-axis in the mesh points toward the dayside
        // Create a quaternion that aligns the mesh's Y-axis with the star direction
        const up = new THREE.Vector3(0, 1, 0);

        // If already aligned, don't calculate rotation
        const dotProduct = up.dot(towardsStar);
        if (Math.abs(dotProduct) < 0.999) {
          // Cross product to get rotation axis
          const axis = new THREE.Vector3().crossVectors(up, towardsStar).normalize();
          // Angle between vectors
          const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
          // Apply rotation
          const quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle(axis, angle);
          meshRef.current.quaternion.copy(quaternion);
        } else {
          // Already facing star, keep orientation
          meshRef.current.quaternion.identity();
        }
      } else {
        // Normal rotation around the axis (which is tilted by axisInclination)
        meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.15);
      }
    }
  });

  return (
    <>
      {/* Orbit ring for planets and moons */}
      {showOrbits && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef}>
        {/* Gas giant glow hazes — baseline plus size-scaled layers */}
        {glowTex && (
          <>
            {/* Baseline inner haze — always visible, bright and gassy */}
            <sprite scale={[obj.size * 3.2, obj.size * 3.2, 1]} renderOrder={-1}>
              <spriteMaterial
                map={glowTex}
                color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                transparent
                depthWrite={false}
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </sprite>
            {/* Additional hazes for larger gas giants */}
            {obj.size > 1.5 && (
              <sprite scale={[obj.size * 5.5, obj.size * 5.5, 1]} renderOrder={-2}>
                <spriteMaterial
                  map={glowTex}
                  color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                  transparent
                  depthWrite={false}
                  opacity={0.35}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </sprite>
            )}
            {obj.size > 2.5 && (
              <sprite scale={[obj.size * 8.5, obj.size * 8.5, 1]} renderOrder={-3}>
                <spriteMaterial
                  map={glowTex}
                  color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                  transparent
                  depthWrite={false}
                  opacity={0.18}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </sprite>
            )}
          </>
        )}
        <group ref={axisGroupRef}>
          <mesh
            ref={meshRef}
            geometry={geo}
            castShadow
            receiveShadow
            onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
          >
            <meshLambertMaterial vertexColors flatShading shadowSide={THREE.BackSide} />
          </mesh>
          {obj.rings && <PlanetRings obj={obj} />}
        </group>
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
