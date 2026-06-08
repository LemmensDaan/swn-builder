import { useRef } from 'react';
import type { StarSystem } from '../../../types/sector';
import Starfield from '../shared/Starfield';
import NebulaBackground from './NebulaBackground';
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
}

export default function SystemScene({ system, objectPositionsRef }: Props) {
  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);
  const stars   = sorted.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const topLevel = sorted.filter(o => !o.parentId && !['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const hasStar = stars.length > 0;

  function renderObject(obj: typeof sorted[0]): React.ReactNode {
    const children = sorted.filter(c => c.parentId === obj.id);
    const positionUpdate = (pos: [number, number, number]) => {
      if (objectPositionsRef) {
        objectPositionsRef.current[obj.id] = pos;
      }
    };

    if (obj.type === 'AsteroidBelt') return <AsteroidBelt key={obj.id} obj={obj} />;
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
      {/* Ambient + star light for readable render */}
      <ambientLight intensity={0.2} />
      {/* Fallback when no star defined yet */}
      {!hasStar && <pointLight position={[0, 0, 0]} intensity={100} distance={250} decay={1} />}
      <Starfield count={900} />
      <NebulaBackground />
      {stars.map(s => (
        <StarObject
          key={s.id}
          obj={s}
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
    </>
  );
}
