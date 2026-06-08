import type { StarSystem } from '../../../types/sector';
import Starfield from '../shared/Starfield';
import StarObject from './StarObject';
import PlanetObject from './PlanetObject';
import AsteroidBelt from './AsteroidBelt';
import SpaceStation from './SpaceStation';

interface Props { system: StarSystem }

export default function SystemScene({ system }: Props) {
  const sorted = [...system.objects].sort((a, b) => a.sortOrder - b.sortOrder);
  const stars   = sorted.filter(o => ['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const topLevel = sorted.filter(o => !o.parentId && !['Star', 'BlackHole', 'NeutronStar'].includes(o.type));
  const hasStar = stars.length > 0;

  function renderObject(obj: typeof sorted[0]): React.ReactNode {
    const children = sorted.filter(c => c.parentId === obj.id);
    if (obj.type === 'AsteroidBelt') return <AsteroidBelt key={obj.id} obj={obj} />;
    if (obj.type === 'SpaceStation' || obj.type === 'JumpGate') return <SpaceStation key={obj.id} obj={obj} />;
    return (
      <PlanetObject key={obj.id} obj={obj}>
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
      {stars.map(s => (
        <StarObject key={s.id} obj={s}>
          {sorted.filter(c => c.parentId === s.id).map(c => renderObject(c))}
        </StarObject>
      ))}
      {topLevel.map(o => renderObject(o))}
    </>
  );
}
