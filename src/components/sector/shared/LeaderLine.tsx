import { useMemo } from 'react';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Props {
  /** Start point in local space (default: origin) */
  from?: [number, number, number];
  /** End point / label anchor in local space */
  to: [number, number, number];
  label: string;
  lineColor?: string;
  labelClass?: string;
  distanceFactor?: number;
}

export default function LeaderLine({
  from = [0, 0, 0],
  to,
  label,
  lineColor = '#3a4e6a',
  labelClass = 'text-[9px] text-gray-200 font-medium whitespace-nowrap tracking-wider drop-shadow-[0_1px_3px_rgba(0,0,0,1)]',
  distanceFactor = 35,
}: Props) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setFromPoints([new THREE.Vector3(...from), new THREE.Vector3(...to)]);
    return g;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from[0], from[1], from[2], to[0], to[1], to[2]]);

  return (
    <>
      {/* @ts-expect-error r3f line vs svg line namespace conflict */}
      <line geometry={geo}>
        <lineBasicMaterial color={lineColor} transparent opacity={0.55} />
      </line>
      <Html
        position={to}
        center
        distanceFactor={distanceFactor}
        style={{ pointerEvents: 'none' }}
      >
        <div className={labelClass}>{label}</div>
      </Html>
    </>
  );
}
