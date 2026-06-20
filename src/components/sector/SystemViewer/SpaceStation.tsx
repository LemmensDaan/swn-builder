import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import { getOrbitPosition } from './orbitUtils';
import { loadModel } from './modelLoader';

interface Props {
  obj: SystemObject;
  isInBelt?: boolean;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  showOrbits?: boolean;
}

export default function SpaceStation({ obj, isInBelt = false, onPositionUpdate, onClick, showOrbits = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (obj.orbitRadius > 0 ? 0.2 / Math.sqrt(obj.orbitRadius) : 0);
  const color = obj.colors[0] ?? '#B0C4DE';
  const s = obj.size;
  const _worldPos = useRef(new THREE.Vector3());

  const subtype = obj.type !== 'SpaceStation' ? 'orbiting'
    : isInBelt         ? 'asteroid'
    : obj.isDeepSpace  ? 'deep'
    : 'orbiting';

  useEffect(() => {
    if (subtype !== 'orbiting') {
      setModelLoaded(false);
      return;
    }
    loadModel('/models/Sputnik satellite.glb')
      .then((model) => {
        if (bodyRef.current) {
          bodyRef.current.add(model);
          model.scale.set(s * 1.5, s * 1.5, s * 1.5);
          setModelLoaded(true);
        }
      })
      .catch(() => setModelLoaded(false));

    return () => {
      if (bodyRef.current) bodyRef.current.clear();
      setModelLoaded(false);
    };
  }, [s, subtype]);

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.updateWorldMatrix(true, false);
      groupRef.current.getWorldPosition(_worldPos.current);
      onPositionUpdate?.([_worldPos.current.x, _worldPos.current.y, _worldPos.current.z]);
    }
    if (bodyRef.current) bodyRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.04);
  });

  const mat = <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} flatShading />;

  function renderFallback() {
    if (subtype === 'asteroid') {
      return (
        <>
          <mesh castShadow scale={[1, 0.7, 0.85]}>
            <dodecahedronGeometry args={[s * 0.9, 0]} />
            {mat}
          </mesh>
          <mesh castShadow position={[0, s * 0.9, 0]}>
            <cylinderGeometry args={[s * 0.04, s * 0.04, s * 0.8, 5]} />
            {mat}
          </mesh>
          <mesh castShadow position={[0, s * 1.35, 0]} rotation={[Math.PI * 0.15, 0, 0]}>
            <coneGeometry args={[s * 0.3, s * 0.2, 8, 1, true]} />
            {mat}
          </mesh>
        </>
      );
    }

    if (subtype === 'deep') {
      return (
        <>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 1.6, s * 0.12, 8, 40]} />
            {mat}
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[s * 0.3, s * 0.3, s * 0.5, 10]} />
            {mat}
          </mesh>
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} castShadow rotation={[0, (Math.PI / 2) * i, 0]}>
              <boxGeometry args={[s * 3.2, s * 0.08, s * 0.08]} />
              {mat}
            </mesh>
          ))}
        </>
      );
    }

    // orbiting fallback
    return (
      <>
        <mesh castShadow>
          <boxGeometry args={[s, s * 0.5, s]} />
          {mat}
        </mesh>
        <mesh castShadow position={[s * 1.1, 0, 0]}>
          <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
          {mat}
        </mesh>
        <mesh castShadow position={[-s * 1.1, 0, 0]}>
          <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
          {mat}
        </mesh>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[s * 1.3, s * 0.08, 4, 12]} />
          {mat}
        </mesh>
      </>
    );
  }

  return (
    <>
      {showOrbits && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef} name={obj.id}>
        <group
          ref={bodyRef}
          onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
        >
          {!modelLoaded && renderFallback()}
        </group>
        {hovered && (
          <Html center distanceFactor={45} position={[0, s + 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#88ccff', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
