import * as THREE from 'three';
import { useEffect, useRef } from 'react';

interface Props {
  radius: number;
  inclination: number; // degrees
}

export default function OrbitRing({ radius, inclination }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const incRad = THREE.MathUtils.degToRad(inclination);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach(child => groupRef.current?.remove(child));

    const ringGeo = new THREE.RingGeometry(radius - 0.02, radius + 0.02, 96);
    const mat = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(ringGeo, mat);
    groupRef.current.add(mesh);
  }, [radius]);

  return (
    <group ref={groupRef} rotation={[Math.PI / 2 - incRad, 0, 0]} />
  );
}
