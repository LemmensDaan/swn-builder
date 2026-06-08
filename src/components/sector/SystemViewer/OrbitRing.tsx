import * as THREE from 'three';

interface Props {
  radius: number;
  inclination: number; // degrees
}

// The ring lies in the XZ plane then tilts around X to match getOrbitPosition's inclination.
// Rotation formula: [PI/2 - incRad, 0, 0] — derived from the orbital plane normal.
export default function OrbitRing({ radius, inclination }: Props) {
  const incRad = THREE.MathUtils.degToRad(inclination);
  return (
    <mesh rotation={[Math.PI / 2 - incRad, 0, 0]}>
      <ringGeometry args={[radius - 0.06, radius + 0.06, 96]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent
        opacity={0.12}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  );
}
