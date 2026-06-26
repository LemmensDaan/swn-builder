import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { loadModel } from './modelLoader';

export interface LodEntry {
  /** GLB path, or null to skip this slot. */
  path: string | null;
  /** Show this LOD when camera distance ≤ maxDistance. Last entry should use Infinity. */
  maxDistance: number;
  /** Play animations on this LOD. Defaults to true for all but the last entry. */
  animated?: boolean;
}

/**
 * Loads a set of LOD models, switches visibility by camera distance,
 * and only ticks the active LOD's animation mixer each frame.
 *
 * Return bodyRef to a <group> in your JSX — the hook adds models imperatively.
 * modelLoaded is false until at least one LOD is ready; use it to show a fallback.
 */
export function useLodModels(
  entries: LodEntry[],
  groupRef: React.RefObject<THREE.Group | null>,
  scale: number,
) {
  const bodyRef = useRef<THREE.Group>(null);
  const lodsRef = useRef<(THREE.Group | null)[]>([]);
  const mixersRef = useRef<(THREE.AnimationMixer | null)[]>([]);
  const activeLodRef = useRef(-1);
  const [modelLoaded, setModelLoaded] = useState(false);
  const { camera } = useThree();
  const _pos = useRef(new THREE.Vector3());

  // Capture entries and scale at mount — paths, distances, and scale are static per object type.
  const initRef = useRef({ entries, scale });

  useEffect(() => {
    if (initRef.current.entries.length === 0) return;

    const { entries: lods, scale: s } = initRef.current;
    const lastIdx = lods.length - 1;

    Promise.all(lods.map(e => (e.path ? loadModel(e.path) : Promise.resolve(null))))
      .then(models => {
        const lodGroups: (THREE.Group | null)[] = [];
        const mixers: (THREE.AnimationMixer | null)[] = [];

        models.forEach((model, i) => {
          if (!model) {
            lodGroups.push(null);
            mixers.push(null);
            return;
          }

          model.scale.setScalar(s);
          model.visible = false;

          const animated = lods[i].animated ?? i !== lastIdx;
          let mixer: THREE.AnimationMixer | null = null;
          if (animated) {
            const clips = (model as any).animations as THREE.AnimationClip[] | undefined;
            if (clips?.length) {
              mixer = new THREE.AnimationMixer(model);
              mixer.clipAction(clips[0]).play();
            }
          }

          lodGroups.push(model);
          mixers.push(mixer);
          bodyRef.current?.add(model);
        });

        lodsRef.current = lodGroups;
        mixersRef.current = mixers;

        // Start at the farthest available LOD (the static fallback)
        let startLod = -1;
        for (let i = lodGroups.length - 1; i >= 0; i--) {
          if (lodGroups[i]) { startLod = i; break; }
        }
        if (startLod >= 0) {
          lodGroups[startLod]!.visible = true;
          activeLodRef.current = startLod;
          setModelLoaded(true);
        }
      })
      .catch(err => console.error('[useLodModels] Load failed:', err));

    return () => {
      mixersRef.current.forEach(m => m?.stopAllAction());
      mixersRef.current = [];

      if (bodyRef.current) {
        const seen = new Set<THREE.BufferGeometry | THREE.Material>();
        bodyRef.current.traverse(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry && !seen.has(mesh.geometry)) {
            seen.add(mesh.geometry);
            mesh.geometry.dispose();
          }
          const mats = mesh.material
            ? (Array.isArray(mesh.material) ? mesh.material : [mesh.material])
            : [];
          mats.forEach(m => {
            if (!seen.has(m as THREE.Material)) {
              seen.add(m as THREE.Material);
              (m as THREE.Material).dispose();
            }
          });
        });
        bodyRef.current.clear();
      }

      lodsRef.current = [];
      activeLodRef.current = -1;
      setModelLoaded(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    // Only tick the active LOD's mixer — never iterate all of them.
    mixersRef.current[activeLodRef.current]?.update(Math.min(delta, 0.05));

    if (!modelLoaded || !groupRef.current) return;

    groupRef.current.getWorldPosition(_pos.current);
    const dist = camera.position.distanceTo(_pos.current);

    const { entries: lods } = initRef.current;
    let newLod = activeLodRef.current;
    for (let i = 0; i < lods.length; i++) {
      if (lodsRef.current[i] && dist <= lods[i].maxDistance) {
        newLod = i;
        break;
      }
    }
    // Fallback: if nothing matched, use the last available LOD.
    if (newLod < 0 || !lodsRef.current[newLod]) {
      for (let i = lods.length - 1; i >= 0; i--) {
        if (lodsRef.current[i]) { newLod = i; break; }
      }
    }

    if (newLod !== activeLodRef.current && newLod >= 0) {
      const prev = lodsRef.current[activeLodRef.current];
      const next = lodsRef.current[newLod];
      if (prev) prev.visible = false;
      if (next) next.visible = true;
      activeLodRef.current = newLod;
    }
  });

  return { bodyRef, modelLoaded };
}
