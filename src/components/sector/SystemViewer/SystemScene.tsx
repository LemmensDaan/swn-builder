import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StarSystem } from '../../../types/sector';
import Starfield from '../shared/Starfield';
import StarObject from './StarObject';
import PlanetObject from './PlanetObject';
import AsteroidBelt from './AsteroidBelt';
import SpaceStation from './SpaceStation';
import CometObject from './CometObject';

interface Props {
  system: StarSystem;
  selectedObjectId?: string | null;
  onObjectClick?: (id: string) => void;
  objectPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
  previewMode?: boolean;
  introOpacityRef?: React.MutableRefObject<number>;
}

export default function SystemScene({ system, objectPositionsRef, previewMode, introOpacityRef }: Props) {
  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);
  const stars   = sorted.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const topLevel = sorted.filter(o => !o.parentId && !['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const hasStar = stars.length > 0;

  // Fade group: traverse every frame while intro is running, skip objects tagged isStar
  const fadeGroupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!fadeGroupRef.current || !introOpacityRef) return;
    const opacity = introOpacityRef.current;
    if (opacity >= 1) return;
    fadeGroupRef.current.traverse(child => {
      if (child.userData?.isStar) return;
      const c = child as any;
      if (c.material) {
        const mats: THREE.Material[] = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => { m.transparent = true; m.opacity = opacity; });
      }
    });
  });

  function renderObject(obj: typeof sorted[0]): React.ReactNode {
    const children = sorted.filter(c => c.parentId === obj.id);
    const positionUpdate = (pos: [number, number, number]) => {
      if (objectPositionsRef) {
        objectPositionsRef.current[obj.id] = pos;
      }
    };

    if (obj.type === 'AsteroidBelt') return previewMode ? null : <AsteroidBelt key={obj.id} obj={obj} />;
    if (obj.type === 'Comet') return <CometObject key={obj.id} obj={obj} onPositionUpdate={positionUpdate} />;
    if (obj.type === 'SpaceStation' || obj.type === 'JumpGate') return <SpaceStation key={obj.id} obj={obj} />;
    return (
      <PlanetObject
        key={obj.id}
        obj={obj}
        onPositionUpdate={positionUpdate}
      >
        {children.map(c => renderObject(c))}
      </PlanetObject>
    );
  }

  return (
    <>
      {/* Lights and starfield stay outside the fade group — always fully visible */}
      {!previewMode && <ambientLight intensity={0.2} />}
      {!hasStar && !previewMode && <pointLight position={[0, 0, 0]} intensity={100} distance={250} decay={1} />}
      {!previewMode && <Starfield count={900} />}

      {/* Everything that participates in the intro fade */}
      <group ref={fadeGroupRef}>
        {stars.map(s => (
          <StarObject
            key={s.id}
            obj={s}
            previewMode={previewMode}
            onPositionUpdate={(pos) => {
              if (objectPositionsRef) {
                objectPositionsRef.current[s.id] = pos;
              }
            }}
          >
            {sorted.filter(c => c.parentId === s.id).map(c => renderObject(c))}
          </StarObject>
        ))}
        {topLevel.map(o => renderObject(o))}
      </group>
    </>
  );
}
