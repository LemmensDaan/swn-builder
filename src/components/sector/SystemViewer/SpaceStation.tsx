import { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import { getOrbitPosition } from './orbitUtils';
import { loadModel } from './modelLoader';

interface Props { obj: SystemObject }

export default function SpaceStation({ obj }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const orbitSpeed = obj.orbitRadius > 0 ? 0.2 / Math.sqrt(obj.orbitRadius) : 0;
  const color = obj.colors[0] ?? '#B0C4DE';
  const s = obj.size;

  useEffect(() => {
    loadModel('/models/Sputnik satellite.glb')
      .then((model) => {
        console.log('✓ Model loaded successfully');
        if (bodyRef.current) {
          bodyRef.current.add(model);
          model.scale.set(s * 1.5, s * 1.5, s * 1.5);
          setModelLoaded(true);
        }
      })
      .catch((err) => {
        console.warn('✗ Failed to load station model:', err);
        setModelLoaded(false);
      });

    return () => {
      if (bodyRef.current) bodyRef.current.clear();
    };
  }, [s]);

  useFrame((_, delta) => {
    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad, obj.eccentricity);
    if (groupRef.current) groupRef.current.position.set(x, y, z);
    if (bodyRef.current)  bodyRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.04);
  });

  const mat = <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} flatShading />;

  return (
    <>
      <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} eccentricity={obj.eccentricity} />
      <group ref={groupRef}>
        <group
          ref={bodyRef}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
        >
          {/* Custom model or procedural fallback */}
          {!modelLoaded && (
            <>
              {/* Core hub */}
              <mesh castShadow>
                <boxGeometry args={[s, s * 0.5, s]} />
                {mat}
              </mesh>
              {/* Cross arms */}
              <mesh castShadow position={[s * 1.1, 0, 0]}>
                <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
                {mat}
              </mesh>
              <mesh castShadow position={[-s * 1.1, 0, 0]}>
                <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
                {mat}
              </mesh>
              {/* Docking ring */}
              <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[s * 1.3, s * 0.08, 4, 12]} />
                {mat}
              </mesh>
            </>
          )}
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
