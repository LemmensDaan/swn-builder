import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StarSystem } from '../../../types/sector';
import { sortSystemObjects } from '../../../types/sector';
import type { SystemPrefs } from './systemPrefs';
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
  starfieldOpacity?: number;
  prefs?: SystemPrefs;
}

export default function SystemScene({ system, selectedObjectId: _selectedObjectId, onObjectClick, objectPositionsRef, previewMode, introOpacityRef, starfieldOpacity = 0.85, prefs }: Props) {
  const sorted = sortSystemObjects(system.objects);
  const stars   = sorted.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const topLevel = sorted.filter(o => !o.parentId && !['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const hasStar = stars.length > 0;

  // Fade group: traverse every frame while intro is running, skip objects tagged isStar
  const fadeGroupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    if (!fadeGroupRef.current || !introOpacityRef) return;
    const opacity = introOpacityRef.current;
    fadeGroupRef.current.traverse(child => {
      if (child.userData?.isStar) return;
      const c = child as any;
      if (c.material) {
        const mats: THREE.Material[] = Array.isArray(c.material) ? c.material : [c.material];
        mats.forEach(m => {
          // Save each material's authored opacity on first touch so we scale back to it, not 1.0
          if (m.userData.originalOpacity === undefined) m.userData.originalOpacity = m.opacity;
          m.transparent = true;
          m.opacity = m.userData.originalOpacity * opacity;
        });
      }
    });
  });

  function renderObject(obj: typeof sorted[0], parentBelt?: typeof sorted[0]): React.ReactNode {
    const children = sorted.filter(c => c.parentId === obj.id);
    const isInBelt = parentBelt?.type === 'AsteroidBelt';
    // Belt children always orbit in the belt's plane at the belt's radius
    const effectiveObj = isInBelt
      ? { ...obj, orbitRadius: parentBelt!.orbitRadius, inclination: parentBelt!.inclination }
      : obj;
    const positionUpdate = (pos: [number, number, number]) => {
      if (objectPositionsRef) {
        objectPositionsRef.current[obj.id] = pos;
      }
    };
    const childShowOrbits = isInBelt ? false : prefs?.showOrbits;

    if (obj.type === 'AsteroidBelt') return (
      <group key={obj.id}>
        {!previewMode && <AsteroidBelt obj={obj} onPositionUpdate={positionUpdate} onClick={onObjectClick} />}
        {children.map(c => renderObject(c, obj))}
      </group>
    );
    if (obj.type === 'Comet') return <CometObject key={obj.id} obj={effectiveObj} isInBelt={isInBelt} onPositionUpdate={positionUpdate} onClick={onObjectClick} showOrbits={childShowOrbits} />;
    if (obj.type === 'SpaceStation' || obj.type === 'JumpGate') return <SpaceStation key={obj.id} obj={effectiveObj} onPositionUpdate={positionUpdate} onClick={onObjectClick} showOrbits={childShowOrbits} />;
    return (
      <PlanetObject
        key={obj.id}
        obj={effectiveObj}
        onPositionUpdate={positionUpdate}
        onClick={onObjectClick}
        showOrbits={childShowOrbits}
      >
        {children.map(c => renderObject(c))}
      </PlanetObject>
    );
  }

  return (
    <>
      {/* Lights and starfield stay outside the fade group — always fully visible */}
      {!previewMode && <ambientLight intensity={0.2} />}
      {!previewMode && <Starfield count={900} opacity={starfieldOpacity} />}

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
            onClick={onObjectClick}
            showOrbits={prefs?.showOrbits}
          >
            {sorted.filter(c => c.parentId === s.id).map(c => renderObject(c))}
          </StarObject>
        ))}
        {topLevel.map(o => renderObject(o))}
      </group>
    </>
  );
}
