import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';

const COUNT = 2500;
const dummy = new THREE.Object3D();

// Generate random earth-tone color (gray-brown spectrum)
function getEarthToneColor(): THREE.Color {
  const tones = [
    '#8C7B6B', '#9a8878', '#7a6a5a', '#6B6B5A', '#8B8B7A',
    '#A09080', '#9A8A7A', '#7A7A6A', '#A5956B', '#8B8B63',
    '#7B7B5A', '#9B8B6B', '#6B6B4A', '#8B8B8B', '#7A7A7A',
  ];
  return new THREE.Color(tones[Math.floor(Math.random() * tones.length)]);
}

interface Props {
  obj: SystemObject;
}

export default function PlanetRings({ obj }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  const ringColor = useMemo(() => {
    return getEarthToneColor();
  }, [obj.id]);

  const geo = useMemo(() => new THREE.OctahedronGeometry(0.02, 0), []);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: ringColor, flatShading: true }),
    [ringColor],
  );

  useEffect(() => {
    if (!meshRef.current) return;

    for (let i = 0; i < COUNT; i++) {
      // Uniform distribution around the equator
      const angle = (i / COUNT) * Math.PI * 2;
      // Ring radii: from 1.3x to 2.2x planet size
      const r = (1.3 + Math.random() * 0.9) * obj.size;
      // Keep on the equator (y ≈ 0) with slight vertical variation
      const x = Math.cos(angle) * r;
      const y = (Math.random() - 0.5) * 0.08 * obj.size;
      const z = Math.sin(angle) * r;

      dummy.position.set(x, y, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(0.4 + Math.random() * 0.8);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [obj.size]);

  useFrame((_, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.08;
    }
  });

  // Tilt rings according to their own inclination (independent of planet's orbital plane)
  const ringIncRad = THREE.MathUtils.degToRad(obj.ringInclination ?? 0);

  return (
    <group ref={groupRef} rotation={[ringIncRad, 0, 0]}>
      <instancedMesh ref={meshRef} args={[geo, mat, COUNT]} castShadow />
    </group>
  );
}
