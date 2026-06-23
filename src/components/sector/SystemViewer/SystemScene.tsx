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
import NebulaObject, { SupernovaBackdrop } from './NebulaObject';
import FactionConnectionWeb from './FactionConnectionWeb';

interface Props {
  system: StarSystem;
  selectedObjectId?: string | null;
  onObjectClick?: (id: string) => void;
  objectPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
  previewMode?: boolean;
  introOpacityRef?: React.MutableRefObject<number>;
  starfieldOpacity?: number;
  prefs?: SystemPrefs;
  systemRadius?: number;
}

export default function SystemScene({ system, selectedObjectId: _selectedObjectId, onObjectClick, objectPositionsRef, previewMode, introOpacityRef, starfieldOpacity = 0.85, prefs, systemRadius }: Props) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const sorted = sortSystemObjects(system.objects);
  const STELLAR = ['Star', 'BlackHole', 'NeutronStar'];
  const stellarIds = new Set(sorted.filter(o => STELLAR.includes(o.type)).map(o => o.id));
  // Root stellar objects: those not orbiting another stellar object
  const rootStars = sorted.filter(o => STELLAR.includes(o.type) && (!o.parentId || !stellarIds.has(o.parentId)));
  const topLevel  = sorted.filter(o => !o.parentId && !STELLAR.includes(o.type));

  // A neutron star is a supernova remnant — fill the system background with a
  // remnant nebula tinted to its colour. Automatic; uses the first neutron star.
  const neutronStar = sorted.find(o => o.type === 'NeutronStar');

  // Fade group: traverse every frame while intro is running, skip objects tagged isStar
  const fadeGroupRef  = useRef<THREE.Group>(null);
  const introDoneRef  = useRef(false);
  useFrame(() => {
    if (!fadeGroupRef.current || !introOpacityRef || introDoneRef.current) return;
    const opacity = introOpacityRef.current;
    fadeGroupRef.current.traverse(child => {
      if (child.userData?.isStar) return;
      const c = child as any;
      if (c.material) {
        if (Array.isArray(c.material)) {
          for (const m of c.material as THREE.Material[]) {
            if (m.userData.originalOpacity === undefined) m.userData.originalOpacity = m.opacity;
            m.transparent = true;
            m.opacity = m.userData.originalOpacity * opacity;
          }
        } else {
          const m = c.material as THREE.Material;
          if (m.userData.originalOpacity === undefined) m.userData.originalOpacity = m.opacity;
          m.transparent = true;
          m.opacity = m.userData.originalOpacity * opacity;
        }
      }
    });
    if (opacity >= 1) introDoneRef.current = true;
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

    if (STELLAR.includes(obj.type)) return (
      <StarObject
        key={obj.id}
        obj={obj}
        previewMode={previewMode}
        onPositionUpdate={positionUpdate}
        onClick={onObjectClick}
        showOrbits={prefs?.showOrbits}
        highQuality={prefs?.highQuality ?? !isMobile}
        systemRadius={systemRadius}
        asteroidShadows={prefs?.asteroidShadows ?? false}
      >
        {children.map(c => renderObject(c))}
      </StarObject>
    );
    if (obj.type === 'AsteroidBelt') return (
      <group key={obj.id}>
        {!previewMode && <AsteroidBelt obj={obj} onPositionUpdate={positionUpdate} onClick={onObjectClick} castShadows={prefs?.asteroidShadows ?? false} />}
        {children.map(c => renderObject(c, obj))}
      </group>
    );
    if (obj.type === 'Comet') return <CometObject key={obj.id} obj={effectiveObj} isInBelt={isInBelt} onPositionUpdate={positionUpdate} onClick={onObjectClick} showOrbits={childShowOrbits} highQuality={prefs?.highQuality ?? !isMobile} castShadows={prefs?.asteroidShadows ?? false} />;
    if (obj.type === 'Nebula') return <NebulaObject key={obj.id} obj={obj} onPositionUpdate={positionUpdate} onClick={onObjectClick} />;
    if (obj.type === 'SpaceStation' || obj.type === 'JumpGate') return <SpaceStation key={obj.id} obj={effectiveObj} isInBelt={isInBelt} onPositionUpdate={positionUpdate} onClick={onObjectClick} showOrbits={childShowOrbits} />;
    return (
      <PlanetObject
        key={obj.id}
        obj={effectiveObj}
        onPositionUpdate={positionUpdate}
        onClick={onObjectClick}
        showOrbits={childShowOrbits}
        highQuality={prefs?.highQuality ?? !isMobile}
      >
        {children.map(c => renderObject(c))}
      </PlanetObject>
    );
  }

  return (
    <>
      {/* Lights and starfield stay outside the fade group — always fully visible */}
      {!previewMode && <ambientLight intensity={0.2} />}
      {!previewMode && <Starfield count={isMobile ? 350 : 900} opacity={starfieldOpacity} />}
      {!previewMode && neutronStar && (
        <SupernovaBackdrop
          color={neutronStar.colors[0] ?? '#A0CFFF'}
          seed={neutronStar.seed ?? neutronStar.id.charCodeAt(0) * 191}
        />
      )}

      <FactionConnectionWeb
        system={system}
        visible={prefs?.showFactionZones ?? false}
        objectPositionsRef={objectPositionsRef}
      />

      {/* Everything that participates in the intro fade */}
      <group ref={fadeGroupRef}>
        {rootStars.map(s => renderObject(s))}
        {topLevel.map(o => renderObject(o))}
      </group>
    </>
  );
}
