import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { getOrbitPosition } from './orbitUtils';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

function makeStarGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  g.addColorStop(0,   'rgba(255,255,255,1)');
  g.addColorStop(0.4, 'rgba(255,255,255,0.6)');
  g.addColorStop(1,   'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function makeBlackHoleAccretionDisk(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hue = Math.round(hsl.h * 360);

  // Disk gradient: white-hot inner edge → warm color → transparent outer
  const texCanvas = document.createElement('canvas');
  texCanvas.width = 512; texCanvas.height = 1;
  const texCtx = texCanvas.getContext('2d')!;
  const grad = texCtx.createLinearGradient(0, 0, 512, 0);
  grad.addColorStop(0,    'rgba(255,255,255,1)');
  grad.addColorStop(0.05, 'rgba(255,248,220,1)');
  grad.addColorStop(0.15, `hsla(${hue},100%,72%,1)`);
  grad.addColorStop(0.38, `hsla(${hue},95%,52%,0.92)`);
  grad.addColorStop(0.62, `hsla(${hue},85%,32%,0.55)`);
  grad.addColorStop(0.84, `hsla(${hue},70%,18%,0.14)`);
  grad.addColorStop(1,    'rgba(0,0,0,0)');
  texCtx.fillStyle = grad;
  texCtx.fillRect(0, 0, 512, 1);
  const diskTex = new THREE.CanvasTexture(texCanvas);

  // Flat ring with UV remapped to radial (u=0 inner edge, u=1 outer edge)
  const innerR = size * 1.12;
  const outerR = size * 5.8;
  const ringGeo = new THREE.RingGeometry(innerR, outerR, 128, 8);
  const posAttr = ringGeo.attributes.position as THREE.BufferAttribute;
  const uvAttr  = ringGeo.attributes.uv  as THREE.BufferAttribute;
  for (let i = 0; i < posAttr.count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const r = Math.sqrt(x * x + y * y);
    const t = (r - innerR) / (outerR - innerR);
    uvAttr.setXY(i, Math.max(0, Math.min(1, t)), 0.5);
  }
  uvAttr.needsUpdate = true;

  const diskMat = new THREE.MeshBasicMaterial({
    map: diskTex,
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    blending: THREE.AdditiveBlending,
  });

  const disk1 = new THREE.Mesh(ringGeo, diskMat);
  disk1.rotation.x = -Math.PI / 2;
  group.add(disk1);

  const disk2 = new THREE.Mesh(ringGeo, diskMat.clone());
  disk2.rotation.x = -Math.PI / 2;
  disk2.scale.setScalar(0.96);
  group.add(disk2);

  return group;
}

interface ChunkOrbit { radius: number; speed: number; }

function makeBlackHoleChunks(
  baseHex: string,
  size: number,
  rng: () => number,
): { group: THREE.Group; orbits: ChunkOrbit[] } {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const innerR = size * 1.35;
  const outerR = size * 5.2;
  const count  = 80;
  const orbits: ChunkOrbit[] = [];

  for (let i = 0; i < count; i++) {
    // Bias distribution toward inner radii (denser hot material closer in)
    const t      = Math.pow(rng(), 1.6);
    const radius = innerR + t * (outerR - innerR);
    const normR  = (radius - innerR) / (outerR - innerR); // 0 = inner, 1 = outer

    // Keplerian: angular speed ∝ 1 / sqrt(r)
    const speed = 1.6 / Math.sqrt(radius / size);

    const angle = rng() * Math.PI * 2;

    // Wide size variation: tiny dust to large boulders
    const sizeClass = rng(); // 0–1, drives the distribution
    const baseSize  = sizeClass < 0.55
      ? size * (0.025 + rng() * 0.04)          // 55 %: small shards
      : sizeClass < 0.85
      ? size * (0.07  + rng() * 0.07)           // 30 %: medium chunks
      : size * (0.10  + rng() * 0.12);          // 15 %: large boulders
    const chunkSize = baseSize * (0.8 + normR * 0.5); // outer chunks slightly larger

    // Color: hot white/yellow at inner edge → full configured color at outer edge
    const lightness   = 0.85 - normR * 0.52;
    const saturation  = 0.15 + normR * 0.85;
    const chunkColor  = new THREE.Color().setHSL(hsl.h, Math.min(1, saturation), lightness);

    const geo = rng() > 0.45
      ? new THREE.TetrahedronGeometry(chunkSize)
      : new THREE.IcosahedronGeometry(chunkSize, 0);

    const mat = new THREE.MeshLambertMaterial({
      color: chunkColor,
      emissive: chunkColor,
      emissiveIntensity: 0.25 + (1 - normR) * 0.4,
      flatShading: true,
      toneMapped: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    // Random initial tumble orientation
    mesh.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    // Self-spin speed stored for animation
    mesh.userData.selfRot = (rng() - 0.5) * 1.8;
    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.add(mesh);

    orbits.push({ radius, speed });
  }

  return { group, orbits };
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  previewMode?: boolean;
  showOrbits?: boolean;
}

export default function StarObject({ obj, children, onPositionUpdate, onClick, previewMode, showOrbits = true }: Props) {
  const groupRef       = useRef<THREE.Group>(null);
  const meshRef        = useRef<THREE.Mesh>(null);
  const diskGroupRef   = useRef<THREE.Group>(null);
  const photonGroupRef = useRef<THREE.Group>(null);
  const chunkGroupRef  = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const color      = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex    = useMemo(() => makeStarGlowTexture(), []);
  const bhDisk     = useMemo(() => makeBlackHoleAccretionDisk(color, obj.size), [color, obj.size]);
  const bhChunks   = useMemo(() => {
    const rng = mulberry32((obj.seed ?? obj.id.charCodeAt(0) * 73) >>> 0);
    return makeBlackHoleChunks(color, obj.size, rng);
  }, [color, obj.size, obj.seed, obj.id]);
  const camera     = useThree(state => state.camera);

  // Track current chunk angles separately so they animate independently of the rng seed
  const chunkAnglesRef = useRef<number[]>([]);
  if (chunkAnglesRef.current.length !== bhChunks.orbits.length) {
    // Initialise (or re-sync on bhChunks change) from the initial positions baked into the group
    const children = bhChunks.group.children;
    chunkAnglesRef.current = bhChunks.orbits.map((o, i) => {
      const p = children[i]?.position;
      return p ? Math.atan2(p.z, p.x) : 0;
    });
  }

  // Disk inclination: seed-based tilt for variety
  const discInclination = useMemo(() => {
    const rng = mulberry32(obj.seed ?? obj.id.charCodeAt(0) * 137);
    return (rng() - 0.5) * Math.PI * 0.35;
  }, [obj.seed, obj.id]);

  // Orbit setup (for binary stars)
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  if (obj.sortOrder === 1) initialAngle += Math.PI;

  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef   = useRef(initialAngle);

  useFrame((_, delta) => {
    if (obj.orbitRadius > 0 && groupRef.current) {
      angleRef.current += delta * orbitSpeed;
      const incRad = THREE.MathUtils.degToRad(obj.inclination);
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
      groupRef.current.position.set(x, y, z);
      onPositionUpdate?.([x, y, z]);
    } else if (groupRef.current && obj.orbitRadius === 0) {
      onPositionUpdate?.([0, 0, 0]);
    }

    if (meshRef.current && !isBlackHole) {
      meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.08);
    }

    if (diskGroupRef.current) {
      diskGroupRef.current.rotation.y += delta * 0.5;
    }

    if (photonGroupRef.current) {
      photonGroupRef.current.lookAt(camera.position);
    }

    // Keplerian chunk orbits: inner chunks overtake outer ones
    if (chunkGroupRef.current) {
      const children = chunkGroupRef.current.children;
      const angles   = chunkAnglesRef.current;
      const orbits   = bhChunks.orbits;
      for (let i = 0; i < children.length; i++) {
        angles[i] += delta * orbits[i].speed;
        const r = orbits[i].radius;
        children[i].position.set(Math.cos(angles[i]) * r, 0, Math.sin(angles[i]) * r);
        // Tumble as they fly
        children[i].rotation.y += delta * (children[i].userData.selfRot as number);
      }
    }
  });

  const photonR = obj.size * 1.06;

  return (
    <>
      {showOrbits && obj.parentId !== null && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef}>
        {!previewMode && (
          <pointLight
            color={color}
            intensity={isBlackHole ? 80 : 120}
            distance={isBlackHole ? 180 : 220}
            decay={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
        )}
        {!isBlackHole && (
          <sprite userData={{ isStar: true }} scale={[obj.size * 5, obj.size * 5, 1]}>
            <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} />
          </sprite>
        )}

        {isBlackHole && (
          <group userData={{ isStar: true }} rotation={[discInclination, 0, 0]}>
            {/* Glow disk — hot plasma background */}
            <primitive ref={diskGroupRef} object={bhDisk} />

            {/* Low-poly debris chunks orbiting at Keplerian speeds */}
            <primitive ref={chunkGroupRef} object={bhChunks.group} />

            {/* Photon ring — billboards to camera */}
            <group ref={photonGroupRef}>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.048, 16, 128]} />
                <meshBasicMaterial
                  color={new THREE.Color(1, 0.97, 0.92)}
                  toneMapped={false}
                  transparent
                  opacity={0.95}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  depthTest={false}
                />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.13, 16, 128]} />
                <meshBasicMaterial
                  color={new THREE.Color(1, 0.82, 0.55)}
                  toneMapped={false}
                  transparent
                  opacity={0.52}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  depthTest={false}
                />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.30, 16, 128]} />
                <meshBasicMaterial
                  color={new THREE.Color(0.9, 0.55, 0.25)}
                  toneMapped={false}
                  transparent
                  opacity={0.22}
                  blending={THREE.AdditiveBlending}
                  depthWrite={false}
                  depthTest={false}
                />
              </mesh>
            </group>

            {/* Event horizon */}
            <mesh renderOrder={1}>
              <icosahedronGeometry args={[obj.size * 0.85, 4]} />
              <meshBasicMaterial color="#000000" toneMapped={false} />
            </mesh>
          </group>
        )}

        <mesh
          ref={meshRef}
          userData={{ isStar: true }}
          onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
          castShadow={false}
          receiveShadow={false}
        >
          <icosahedronGeometry args={[obj.size, 4]} />
          <meshLambertMaterial
            color={isBlackHole ? '#050008' : color}
            emissive={isBlackHole ? '#000000' : color}
            emissiveIntensity={isBlackHole ? 0 : isNeutron ? 1.5 : 0.9}
            flatShading
            toneMapped={false}
          />
        </mesh>

        {hovered && (
          <Html center distanceFactor={50} position={[0, obj.size + 1.2, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#fff', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
        {children}
      </group>
    </>
  );
}
