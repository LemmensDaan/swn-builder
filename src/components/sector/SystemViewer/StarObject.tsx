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
    const y = posAttr.getY(i); // RingGeometry lies in XY plane
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

  // Two layers: main disk + slightly smaller second for extra inner glow depth
  const disk1 = new THREE.Mesh(ringGeo, diskMat);
  disk1.rotation.x = -Math.PI / 2; // lay flat in XZ plane
  group.add(disk1);

  const disk2 = new THREE.Mesh(ringGeo, diskMat.clone());
  disk2.rotation.x = -Math.PI / 2;
  disk2.scale.setScalar(0.96);
  group.add(disk2);

  return group;
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
  const groupRef      = useRef<THREE.Group>(null);
  const meshRef       = useRef<THREE.Mesh>(null);
  const diskGroupRef  = useRef<THREE.Group>(null);
  const photonGroupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const color = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex = useMemo(() => makeStarGlowTexture(), []);
  const bhDisk  = useMemo(() => makeBlackHoleAccretionDisk(color, obj.size), [color, obj.size]);
  const camera  = useThree(state => state.camera);

  // Disk inclination: random tilt based on seed for variety
  const discInclination = useMemo(() => {
    const rng = mulberry32(obj.seed ?? obj.id.charCodeAt(0) * 137);
    return (rng() - 0.5) * Math.PI * 0.35; // ±31° tilt around X
  }, [obj.seed, obj.id]);

  // Orbit setup (for binary stars)
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  if (obj.sortOrder === 1) initialAngle += Math.PI;

  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef = useRef(initialAngle);

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

    // Billboard: photon ring always faces the camera (simulates Einstein ring)
    if (photonGroupRef.current) {
      photonGroupRef.current.lookAt(camera.position);
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
            {/* Rotating accretion disk */}
            <primitive ref={diskGroupRef} object={bhDisk} />

            {/* Photon ring — billboards to camera to simulate gravitational lensing */}
            <group ref={photonGroupRef}>
              {/* Core: thin, very bright warm-white ring */}
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
              {/* Inner glow halo */}
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
              {/* Outer bloom */}
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

            {/* Event horizon — solid black, occludes disk behind it */}
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
