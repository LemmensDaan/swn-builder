import * as THREE from 'three';
import { useEffect, useRef } from 'react';

interface Props {
  radius: number;
  inclination: number; // degrees
  eccentricity?: number; // 0–0.999
}

// Render elliptical or circular orbits. For elliptical orbits, radius is the semi-major axis.
export default function OrbitRing({ radius, inclination, eccentricity = 0 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const incRad = THREE.MathUtils.degToRad(inclination);
  const e = Math.max(0, Math.min(eccentricity, 0.999));

  useEffect(() => {
    if (!groupRef.current) return;
    groupRef.current.children.forEach(child => groupRef.current?.remove(child));

    if (e < 0.01) {
      // Circular orbit: use ring geometry (more efficient)
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
    } else {
      // Elliptical orbit: draw with line geometry
      const points: THREE.Vector3[] = [];
      const segments = 256;

      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const r = (radius * (1 - e * e)) / (1 + e * Math.cos(angle));
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        points.push(new THREE.Vector3(x, 0, z));
      }

      const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: '#ffffff',
        transparent: true,
        opacity: 0.12,
        linewidth: 0.5,
        depthWrite: false,
      });
      const line = new THREE.Line(lineGeo, lineMat);
      groupRef.current.add(line);
    }
  }, [radius, e]);

  return (
    <group ref={groupRef} rotation={[Math.PI / 2 - incRad, 0, 0]} />
  );
}
