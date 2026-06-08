import * as THREE from 'three';
import { useEffect, useRef } from 'react';

interface Props {
  radius: number;
  inclination: number; // degrees
  eccentricity?: number; // optional, for elliptical orbits
}

export default function OrbitRing({ radius, inclination, eccentricity = 0 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const incRad = THREE.MathUtils.degToRad(inclination);

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach(child => groupRef.current?.remove(child));

    // Create elliptical orbit line using polar equation: r = a(1-e²)/(1+e*cos(θ))
    // This matches the actual orbit calculation used by the comet
    const a = radius; // semi-major axis
    const e2 = 1 - eccentricity * eccentricity;

    const points: THREE.Vector3[] = [];
    const segments = 128;
    for (let i = 0; i <= segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      // Polar ellipse equation
      const r = (a * e2) / (1 + eccentricity * Math.cos(angle));
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      points.push(new THREE.Vector3(x, 0, z));
    }

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.12,
      fog: false,
      linewidth: 1,
    });
    const line = new THREE.LineLoop(geometry, material);
    groupRef.current.add(line);
  }, [radius, eccentricity]);

  return (
    <group ref={groupRef} rotation={[-incRad, 0, 0]} />
  );
}
