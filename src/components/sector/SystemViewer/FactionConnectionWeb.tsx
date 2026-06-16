import { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { StarSystem, Faction } from '../../../types/sector';
import { useSectorStore } from '../../../store/useSectorStore';

interface Props {
  system: StarSystem;
  visible: boolean;
  objectPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}

const STELLAR = new Set(['Star', 'BlackHole', 'NeutronStar']);

interface FactionGroup {
  faction: Faction;
  fixedPairs: [string, string][];  // child→parent, always drawn as-is
  rootIds: string[];               // sibling-level objects; MST recomputed each frame
}

function sq(pos: Record<string, [number, number, number]>, a: string, b: string): number {
  const pa = pos[a], pb = pos[b];
  if (!pa || !pb) return Infinity;
  const dx = pa[0] - pb[0], dy = pa[1] - pb[1], dz = pa[2] - pb[2];
  return dx * dx + dy * dy + dz * dz;
}

// Prim's MST — always n-1 edges, connects nearest actual neighbors.
// For planets on roughly circular orbits this produces angular-adjacent
// connections, avoiding crossings.
function primMST(ids: string[], pos: Record<string, [number, number, number]>): [string, string][] {
  const valid = ids.filter(id => pos[id]);
  if (valid.length < 2) return [];
  const inTree = new Set<string>([valid[0]]);
  const pairs: [string, string][] = [];
  while (inTree.size < valid.length) {
    let best: [string, string] | null = null;
    let bestD = Infinity;
    for (const a of inTree) {
      for (const b of valid) {
        if (inTree.has(b)) continue;
        const d = sq(pos, a, b);
        if (d < bestD) { bestD = d; best = [a, b]; }
      }
    }
    if (!best) break;
    pairs.push(best);
    inTree.add(best[1]);
  }
  return pairs;
}

function FactionLines({ group, objectPositionsRef }: {
  group: FactionGroup;
  objectPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}) {
  const numFixed    = group.fixedPairs.length;
  const numSiblings = Math.max(0, group.rootIds.length - 1);
  const totalPairs  = numFixed + numSiblings;

  // Recreate geometry only when pair count changes; R3F owns the lifecycle via the JSX prop.
  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(totalPairs * 6), 3));
    return geo;
  }, [totalPairs]);

  // Dispose when geometry is replaced or component unmounts.
  useEffect(() => () => geometry.dispose(), [geometry]);

  const lineRef = useRef<THREE.LineSegments>(null);

  useFrame(() => {
    const line = lineRef.current;
    if (!line || !objectPositionsRef) return;
    const pos = objectPositionsRef.current;
    const attr = line.geometry.attributes.position as THREE.BufferAttribute;

    // Fixed child→parent pairs (moon→planet etc.)
    for (let i = 0; i < numFixed; i++) {
      const [a, b] = group.fixedPairs[i];
      const pa = pos[a], pb = pos[b];
      if (!pa || !pb) {
        attr.setXYZ(i * 2, 0, 0, 0);
        attr.setXYZ(i * 2 + 1, 0, 0, 0);
        continue;
      }
      attr.setXYZ(i * 2,     pa[0], pa[1], pa[2]);
      attr.setXYZ(i * 2 + 1, pb[0], pb[1], pb[2]);
    }

    // Sibling pairs — MST from real positions each frame so nearest neighbors
    // are always connected, preventing line crossings as planets orbit.
    if (numSiblings > 0) {
      const mst = primMST(group.rootIds, pos);
      for (let i = 0; i < mst.length; i++) {
        const [a, b] = mst[i];
        const pa = pos[a], pb = pos[b];
        if (!pa || !pb) continue;
        const idx = numFixed + i;
        attr.setXYZ(idx * 2,     pa[0], pa[1], pa[2]);
        attr.setXYZ(idx * 2 + 1, pb[0], pb[1], pb[2]);
      }
      // Zero out any slots MST didn't fill (positions not ready yet on early frames)
      for (let i = mst.length; i < numSiblings; i++) {
        const idx = numFixed + i;
        attr.setXYZ(idx * 2, 0, 0, 0);
        attr.setXYZ(idx * 2 + 1, 0, 0, 0);
      }
    }

    attr.needsUpdate = true;
  });

  if (totalPairs === 0) return null;

  return (
    <lineSegments ref={lineRef} geometry={geometry}>
      <lineBasicMaterial color={group.faction.color} transparent opacity={0.75} />
    </lineSegments>
  );
}

// Flat ring disc + optional contested outer rings, all tracking a moving object.
function FactionDisc({ objectId, color, size, contestedColors, objectPositionsRef }: {
  objectId: string;
  color: string | null;
  size: number;
  contestedColors: string[];
  objectPositionsRef?: React.MutableRefObject<Record<string, [number, number, number]>>;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!groupRef.current || !objectPositionsRef) return;
    const pos = objectPositionsRef.current[objectId];
    if (!pos) return;
    groupRef.current.position.set(pos[0], pos[1], pos[2]);
  });

  const inner = size * 2.2;
  const outer = size * 5.0;

  return (
    // rotation on the group so all children lie in the XZ plane together
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      {/* Main faction disc — only when there is a controlling faction */}
      {color && (
        <mesh>
          <ringGeometry args={[inner, outer, 48]} />
          <meshBasicMaterial color={color} transparent opacity={0.18} side={THREE.DoubleSide} depthWrite={false} />
        </mesh>
      )}
      {/* Contested rings — thin bands just outside the main disc, one per contesting faction */}
      {contestedColors.map((c, i) => {
        const cInner = outer + size * (0.6 + i * 1.6);
        const cOuter = cInner + size * 0.9;
        return (
          <mesh key={i}>
            <ringGeometry args={[cInner, cOuter, 48]} />
            <meshBasicMaterial color={c} transparent opacity={0.35} side={THREE.DoubleSide} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}

export default function FactionConnectionWeb({ system, visible, objectPositionsRef }: Props) {
  const factions = useSectorStore(s =>
    s.sectors.find(sec => sec.id === system.sectorId)?.factions ?? []
  );

  const factionById = useMemo(
    () => Object.fromEntries(factions.map(f => [f.id, f])),
    [factions]
  );

  const factionGroups = useMemo<FactionGroup[]>(() => {
    const objById = Object.fromEntries(system.objects.map(o => [o.id, o]));
    const byFaction = new Map<string, string[]>();
    for (const obj of system.objects) {
      if (STELLAR.has(obj.type)) continue;
      // Primary owner
      if (obj.factionId) {
        if (!byFaction.has(obj.factionId)) byFaction.set(obj.factionId, []);
        byFaction.get(obj.factionId)!.push(obj.id);
      }
      // Contesting factions also get this object as a node so lines are drawn to it
      for (const fid of obj.contestedFactionIds ?? []) {
        if (fid === obj.factionId) continue;
        if (!byFaction.has(fid)) byFaction.set(fid, []);
        byFaction.get(fid)!.push(obj.id);
      }
    }
    const groups: FactionGroup[] = [];
    for (const [fid, ids] of byFaction) {
      const faction = factionById[fid];
      if (!faction || ids.length < 2) continue;
      const factionSet = new Set(ids);

      // Rule 1: child→parent within the faction (fixed connections)
      const fixedPairs: [string, string][] = [];
      for (const id of ids) {
        const obj = objById[id];
        if (obj?.parentId && factionSet.has(obj.parentId)) {
          fixedPairs.push([id, obj.parentId]);
        }
      }

      // Rule 2: root-level objects (parent not in faction) — MST per frame
      const rootIds = ids.filter(id => {
        const obj = objById[id];
        return !obj?.parentId || !factionSet.has(obj.parentId);
      });

      if (fixedPairs.length + Math.max(0, rootIds.length - 1) > 0) {
        groups.push({ faction, fixedPairs, rootIds });
      }
    }
    return groups;
  }, [system.objects, factionById]);

  const discObjects = useMemo(() => system.objects
    .filter(o => !STELLAR.has(o.type) && (
      (o.factionId && factionById[o.factionId]) ||
      (o.contestedFactionIds ?? []).some(fid => factionById[fid])
    ))
    .map(o => ({
      id: o.id,
      color: (o.factionId && factionById[o.factionId]?.color) || null,
      size: o.size,
      contestedColors: (o.contestedFactionIds ?? [])
        .map(fid => factionById[fid]?.color)
        .filter(Boolean) as string[],
    })),
  [system.objects, factionById]);

  if (!visible || (factionGroups.length === 0 && discObjects.length === 0)) return null;

  return (
    <group>
      {factionGroups.map(group => (
        <FactionLines key={group.faction.id} group={group} objectPositionsRef={objectPositionsRef} />
      ))}
      {discObjects.map(obj => (
        <FactionDisc key={obj.id} objectId={obj.id} color={obj.color} size={obj.size} contestedColors={obj.contestedColors} objectPositionsRef={objectPositionsRef} />
      ))}
    </group>
  );
}
