import { useMemo } from 'react';
import * as THREE from 'three';
import type { StarSystem } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';

interface Props {
  system: StarSystem;
  visible: boolean;
}

const STELLAR = new Set(['Star', 'BlackHole', 'NeutronStar']);
const PADDING = 10;

export default function FactionZoneBands({ system, visible }: Props) {
  const factions = useSectorStore(s =>
    s.sectors.find(sec => sec.id === system.sectorId)?.factions ?? []
  );

  const bands = useMemo(() => {
    const factionById = Object.fromEntries(factions.map(f => [f.id, f]));
    const stellarIds = new Set(
      system.objects.filter(o => STELLAR.has(o.type)).map(o => o.id)
    );

    const grouped = new Map<string, number[]>();
    for (const obj of system.objects) {
      // Include non-stellar objects that orbit a star (parentId in stellarIds)
      // or are top-level (parentId null) — covers planets in multi-star systems
      const inScope = !STELLAR.has(obj.type) &&
        (!obj.parentId || stellarIds.has(obj.parentId)) &&
        obj.orbitRadius > 0;
      if (!obj.factionId || !inScope) continue;
      if (!grouped.has(obj.factionId)) grouped.set(obj.factionId, []);
      grouped.get(obj.factionId)!.push(obj.orbitRadius);
    }

    const result: Array<{ id: string; color: string; inner: number; outer: number }> = [];
    for (const [fid, radii] of grouped) {
      const faction = factionById[fid];
      if (!faction) continue;
      const min = Math.min(...radii);
      const max = Math.max(...radii);
      result.push({
        id: faction.id,
        color: faction.color,
        inner: Math.max(0, min - PADDING),
        outer: max + PADDING,
      });
    }
    return result;
  }, [system.objects, factions]);

  if (!visible || bands.length === 0) return null;

  return (
    <group rotation={[-Math.PI / 2, 0, 0]}>
      {bands.map(band => (
        <mesh key={band.id}>
          <ringGeometry args={[band.inner, band.outer, 128]} />
          <meshBasicMaterial
            color={band.color}
            transparent
            opacity={0.25}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}
