import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { getOrbitPosition } from './orbitUtils';

const COUNT = 1200;
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
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
}

export default function AsteroidBelt({ obj, onPositionUpdate, onClick }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const focusMarker = useRef(new THREE.Object3D());
  const _wp = useRef(new THREE.Vector3());

  // Match direction (+X → +Z) and speed to getOrbitPosition so belt-children stay in sync
  const orbitSpeed = obj.orbitRadius > 0 ? 0.2 / Math.sqrt(obj.orbitRadius) : 0.012;

  const geo = useMemo(() => new THREE.IcosahedronGeometry(0.08, 0), []);
  const beltColor = useMemo(() => getEarthToneColor(), [obj.id]);
  const mat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: beltColor, flatShading: true }),
    [beltColor],
  );

  // Place the focus marker at angle=0 on the belt ring so it orbits with the group
  useEffect(() => {
    if (!groupRef.current) return;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [fx, fy, fz] = getOrbitPosition(0, obj.orbitRadius, incRad);
    focusMarker.current.position.set(fx, fy, fz);
    groupRef.current.add(focusMarker.current);
    return () => { groupRef.current?.remove(focusMarker.current); };
  }, [obj.orbitRadius, obj.inclination]);

  useEffect(() => {
    if (!meshRef.current) return;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);

    for (let i = 0; i < COUNT; i++) {
      const angle = (i / COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
      const r = obj.orbitRadius * (0.88 + Math.random() * 0.24);
      const [x, y, z] = getOrbitPosition(angle, r, incRad);

      dummy.position.set(x, y + (Math.random() - 0.5) * 0.4, z);
      dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
      dummy.scale.setScalar(0.5 + Math.random() * 1.0);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    meshRef.current.computeBoundingSphere();
  }, [obj.orbitRadius, obj.inclination]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.y -= delta * orbitSpeed;
    focusMarker.current.updateWorldMatrix(true, false);
    focusMarker.current.getWorldPosition(_wp.current);
    onPositionUpdate?.([_wp.current.x, _wp.current.y, _wp.current.z]);
  });

  return (
    <group ref={groupRef}>
      <instancedMesh
        ref={meshRef}
        args={[geo, mat, COUNT]}
        castShadow
        receiveShadow
        onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
        onPointerEnter={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer'; }}
        onPointerLeave={() => { document.body.style.cursor = 'auto'; }}
      />
    </group>
  );
}
