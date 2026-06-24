import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import { getOrbitPosition } from './orbitUtils';
import { loadModel } from './modelLoader';

interface Props {
  obj: SystemObject;
  isInBelt?: boolean;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  showOrbits?: boolean;
}

export default function SpaceStation({ obj, isInBelt = false, onPositionUpdate, onClick, showOrbits = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const bodyRef  = useRef<THREE.Group>(null);
  const { camera } = useThree();
  const [hovered, setHovered] = useState(false);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [currentLod, setCurrentLod] = useState<0 | 1 | 2 | 3>(0);
  const lodsRef = useRef<Record<number, THREE.Group | null>>({ 0: null, 1: null, 2: null, 3: null });
  const mixersRef = useRef<Record<number, THREE.AnimationMixer | null>>({ 0: null, 1: null, 2: null, 3: null });
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (obj.orbitRadius > 0 ? 0.2 / Math.sqrt(obj.orbitRadius) : 0);
  const color = obj.colors[0] ?? '#B0C4DE';
  const s = obj.size;
  const _worldPos = useRef(new THREE.Vector3());
  const _stationPos = useRef(new THREE.Vector3());

  const subtype = obj.type !== 'SpaceStation' ? 'orbiting'
    : isInBelt         ? 'asteroid'
    : obj.isDeepSpace  ? 'deep'
    : 'orbiting';

  useEffect(() => {
    if (subtype === 'deep') {
      const lodPaths = [
        null,  // LOD0 unused
        '/models/space_station_3/spacestation3_LOD1.glb',
        '/models/space_station_3/spacestation3_LOD2.glb',
        '/models/space_station_3/spacestation3_LOD3.glb',
      ];

      console.log(`[SpaceStation] Loading LODs for ${obj.id}...`);
      Promise.all(
        lodPaths.map(path =>
          path ? loadModel(path) : Promise.resolve(null)
        )
      )
        .then((models) => {
          console.log(`[SpaceStation] Loaded models:`, models.map((m, i) => m ? `LOD${i}` : `null`));
          models.forEach((model, i) => {
            if (!model) {
              console.log(`[SpaceStation] Skipping LOD${i} (null)`);
              return;
            }

            console.log(`[SpaceStation] Setting up LOD${i}, scale before: ${model.scale.x}`);
            model.scale.set(0.01, 0.01, 0.01);
            console.log(`[SpaceStation] LOD${i} scale after: ${model.scale.x}`);
            model.visible = false;  // Start with fallback (LOD2)
            lodsRef.current[i as 0 | 1 | 2 | 3] = model;

            // Setup animations
            const animations = (model as any).animations as THREE.AnimationClip[] | undefined;
            console.log(`[SpaceStation] LOD${i} animations:`, animations?.length ?? 0);
            if (animations && animations.length > 0) {
              const mixer = new THREE.AnimationMixer(model);
              mixer.clipAction(animations[0]).play();
              mixersRef.current[i as 0 | 1 | 2 | 3] = mixer;
              console.log(`[SpaceStation] LOD${i}: Playing animation "${animations[0].name}"`);
            }

            if (bodyRef.current) {
              bodyRef.current.add(model);
              console.log(`[SpaceStation] Added LOD${i} to scene`);
            }
          });
          setCurrentLod(2);  // Start with fallback (LOD2)
          setModelLoaded(true);
          console.log(`[SpaceStation] Model loading complete`);
        })
        .catch((err) => {
          console.error(`[SpaceStation] Failed to load LOD models:`, err);
          setModelLoaded(false);
        });
    } else if (subtype === 'orbiting') {
      loadModel('/models/Sputnik satellite.glb')
        .then((model) => {
          if (bodyRef.current) {
            bodyRef.current.add(model);
            model.scale.set(s * 1.5, s * 1.5, s * 1.5);
            lodsRef.current[0] = model;
            setModelLoaded(true);
          }
        })
        .catch(() => setModelLoaded(false));
    } else {
      setModelLoaded(false);
    }

    return () => {
      // Stop and dispose mixers
      for (let i = 0; i < 4; i++) {
        if (mixersRef.current[i as 0 | 1 | 2 | 3]) {
          mixersRef.current[i as 0 | 1 | 2 | 3]!.stopAllAction();
          mixersRef.current[i as 0 | 1 | 2 | 3] = null;
        }
      }

      if (bodyRef.current) {
        const seen = new Set<THREE.BufferGeometry | THREE.Material>();
        bodyRef.current.traverse(child => {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry && !seen.has(mesh.geometry)) {
            seen.add(mesh.geometry);
            mesh.geometry.dispose();
          }
          if (mesh.material) {
            const mats: THREE.Material[] = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            for (const m of mats) {
              if (!seen.has(m)) { seen.add(m); m.dispose(); }
            }
          }
        });
        bodyRef.current.clear();
        lodsRef.current = { 0: null, 1: null, 2: null, 3: null };
      }
      setModelLoaded(false);
    };
  }, [s, subtype]);

  useFrame((_, delta) => {
    delta = Math.min(delta, 0.05);

    // Update animation mixers
    for (let i = 0; i < 4; i++) {
      if (mixersRef.current[i as 0 | 1 | 2 | 3]) {
        mixersRef.current[i as 0 | 1 | 2 | 3]!.update(delta);
      }
    }

    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.updateWorldMatrix(true, false);
      groupRef.current.getWorldPosition(_worldPos.current);
      onPositionUpdate?.([_worldPos.current.x, _worldPos.current.y, _worldPos.current.z]);

      // LOD switching for deep space stations
      if (subtype === 'deep' && modelLoaded) {
        const distance = camera.position.distanceTo(_worldPos.current);
        let newLod: 0 | 1 | 2 | 3 = 1;

        if (distance < 0.5) newLod = 1;      // Very close: LOD1 (detailed)
        else if (distance < 5) newLod = 2;   // Medium: LOD2
        else newLod = 3;                      // Far: LOD3

        if (newLod !== currentLod) {
          console.log(`[SpaceStation LOD Switch] ${obj.id}: distance=${distance.toFixed(1)}, LOD${currentLod} → LOD${newLod}`);
          // Hide old LOD, show new LOD
          if (lodsRef.current[currentLod]) lodsRef.current[currentLod]!.visible = false;
          if (lodsRef.current[newLod]) lodsRef.current[newLod]!.visible = true;
          setCurrentLod(newLod);
        }
      }
    }
    if (bodyRef.current) bodyRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.04);
  });

  const mat = <meshLambertMaterial color={color} emissive={color} emissiveIntensity={0.2} flatShading />;

  function renderFallback() {
    if (subtype === 'asteroid') {
      return (
        <>
          <mesh castShadow scale={[1, 0.7, 0.85]}>
            <dodecahedronGeometry args={[s * 0.9, 0]} />
            {mat}
          </mesh>
          <mesh castShadow position={[0, s * 0.9, 0]}>
            <cylinderGeometry args={[s * 0.04, s * 0.04, s * 0.8, 5]} />
            {mat}
          </mesh>
          <mesh castShadow position={[0, s * 1.35, 0]} rotation={[Math.PI * 0.15, 0, 0]}>
            <coneGeometry args={[s * 0.3, s * 0.2, 8, 1, true]} />
            {mat}
          </mesh>
        </>
      );
    }

    if (subtype === 'deep') {
      return (
        <>
          <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[s * 1.6, s * 0.12, 8, 40]} />
            {mat}
          </mesh>
          <mesh castShadow>
            <cylinderGeometry args={[s * 0.3, s * 0.3, s * 0.5, 10]} />
            {mat}
          </mesh>
          {[0, 1, 2, 3].map(i => (
            <mesh key={i} castShadow rotation={[0, (Math.PI / 2) * i, 0]}>
              <boxGeometry args={[s * 3.2, s * 0.08, s * 0.08]} />
              {mat}
            </mesh>
          ))}
        </>
      );
    }

    // orbiting fallback
    return (
      <>
        <mesh castShadow>
          <boxGeometry args={[s, s * 0.5, s]} />
          {mat}
        </mesh>
        <mesh castShadow position={[s * 1.1, 0, 0]}>
          <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
          {mat}
        </mesh>
        <mesh castShadow position={[-s * 1.1, 0, 0]}>
          <boxGeometry args={[s * 0.8, s * 0.25, s * 0.25]} />
          {mat}
        </mesh>
        <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[s * 1.3, s * 0.08, 4, 12]} />
          {mat}
        </mesh>
      </>
    );
  }

  return (
    <>
      {showOrbits && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef} name={obj.id}>
        <group
          ref={bodyRef}
          onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
        >
          {!modelLoaded && renderFallback()}
        </group>
        {hovered && (
          <Html center distanceFactor={45} position={[0, s + 0.5, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#88ccff', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
      </group>
    </>
  );
}
