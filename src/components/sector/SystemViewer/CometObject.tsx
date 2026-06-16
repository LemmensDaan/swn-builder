import { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

function makeComaGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.6)');
  g.addColorStop(0.4, 'rgba(200,220,255,0.3)');
  g.addColorStop(1, 'rgba(150,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

interface Props {
  obj: SystemObject;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  showOrbits?: boolean;
  isInBelt?: boolean;
  highQuality?: boolean;
}

function getEllipticalOrbitPosition(
  angle: number,
  semiMajor: number,
  eccentricity: number,
  inclination: number
): [number, number, number] {
  const incRad = THREE.MathUtils.degToRad(inclination);
  const radius = (semiMajor * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y = z * Math.sin(incRad);
  const z_final = z * Math.cos(incRad);
  return [x, y, z_final];
}

const TRAIL_LENGTH = 40;
const RIBBON_HALF_WIDTH = 0.12;
const TRAIL_COUNT = 50;
const PARTICLE_LIFETIME = 1.2;

interface TrailParticle {
  pos: [number, number, number];
  vel: [number, number, number];
  age: number;
  maxAge: number;
}

const vertexShader = `
  attribute vec3 trailColor;
  attribute float trailAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = trailColor;
    vAlpha = trailAlpha;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

const TAIL_COLOR = new THREE.Color('#110022');

export default function CometObject({ obj, onPositionUpdate, onClick, showOrbits = true, isInBelt = false, highQuality = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const particleTrailRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);

  const comaGlowTex = useMemo(() => (highQuality ? makeComaGlowTexture() : null), [highQuality]);

  // Belt comets: fit within the belt ring (0.88r–1.12r), max eccentricity is 0.12
  const eccentricity = useMemo(() => {
    if (!isInBelt) return 0.96;
    return mulberry32((obj.seed ?? obj.sortOrder * 137) + 1)() * 0.12;
  }, [isInBelt, obj.seed, obj.sortOrder]);
  const semiMajor = isInBelt ? obj.orbitRadius : obj.orbitRadius * 2.5;

  const initialAngle = useMemo(
    () => mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2,
    [obj.seed, obj.sortOrder]
  );
  const angleRef = useRef(initialAngle);
  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (isInBelt ? (obj.orbitRadius > 0 ? 0.5 / Math.sqrt(obj.orbitRadius) : 0.15) : 0.15);

  const posHistoryRef = useRef<THREE.Vector3[]>([]);
  const historyIndexRef = useRef(0);
  const prevPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const particlesRef = useRef<TrailParticle[]>([]);
  const spawnCounterRef = useRef(0);
  const cometColor = useMemo(() => new THREE.Color(obj.colors[0] ?? '#E8F4F8'), [obj.colors[0]]);

  useEffect(() => {
    const [x, y, z] = getEllipticalOrbitPosition(initialAngle, semiMajor, eccentricity, obj.inclination);
    posHistoryRef.current = Array.from({ length: TRAIL_LENGTH }, () => new THREE.Vector3(x, y, z));
    historyIndexRef.current = 0;
  }, []);

  useEffect(() => {
    if (!particleTrailRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < TRAIL_COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.set(0, 0, 0);
      dummy.updateMatrix();
      particleTrailRef.current.setMatrixAt(i, dummy.matrix);
    }
    particleTrailRef.current.instanceMatrix.needsUpdate = true;
  }, []);


  const ribbonGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertCount = TRAIL_LENGTH * 2;
    const positions = new Float32Array(vertCount * 3);
    const colors = new Float32Array(vertCount * 3);
    const alphas = new Float32Array(vertCount);
    const indices: number[] = [];

    for (let i = 0; i < TRAIL_LENGTH - 1; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = (i + 1) * 2;
      const d = (i + 1) * 2 + 1;
      indices.push(a, b, c);
      indices.push(b, d, c);
    }

    geo.setIndex(indices);
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('trailColor', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('trailAlpha', new THREE.BufferAttribute(alphas, 1));

    return geo;
  }, []);

  const ribbonMat = useMemo(() => new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  }), []);

  const trailGeo = useMemo(() => new THREE.IcosahedronGeometry(0.04, 0), []);
  const trailMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: cometColor, transparent: true, flatShading: true }),
    [cometColor]
  );

  const tmpSegDir = useMemo(() => new THREE.Vector3(), []);
  const tmpRight = useMemo(() => new THREE.Vector3(), []);
  const tmpToCamera = useMemo(() => new THREE.Vector3(), []);
  const tmpColor = useMemo(() => new THREE.Color(), []);
  const velDirRef = useRef(new THREE.Vector3(0, 0, 1));
  const forwardAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);

  useFrame((state, delta) => {
    if (!groupRef.current) return;

    const [x, y, z] = getEllipticalOrbitPosition(angleRef.current, semiMajor, eccentricity, obj.inclination);

    const distFromStar = Math.sqrt(x * x + y * y + z * z);
    const minDist = semiMajor * (1 - eccentricity);
    const maxDist = semiMajor * (1 + eccentricity);
    const midDist = (minDist + maxDist) / 2;
    const distanceFactor = isInBelt ? 1 : midDist / Math.max(distFromStar, minDist * 0.5);
    angleRef.current += delta * orbitSpeed * distanceFactor;

    groupRef.current.position.set(x, y, z);
    onPositionUpdate?.([x, y, z]);

    // Velocity for particle spawn direction and oval orientation
    const velocity = new THREE.Vector3(
      x - prevPosRef.current[0],
      y - prevPosRef.current[1],
      z - prevPosRef.current[2]
    );
    prevPosRef.current = [x, y, z];

    if (velocity.lengthSq() > 0.000001) {
      velDirRef.current.copy(velocity).normalize();
    }
    groupRef.current.quaternion.setFromUnitVectors(forwardAxis, velDirRef.current);

    // Update circular buffer history — reuse vectors for stability
    const history = posHistoryRef.current;
    historyIndexRef.current = (historyIndexRef.current + 1) % TRAIL_LENGTH;
    history[historyIndexRef.current].set(x, y, z);

    // Update ribbon trail
    if (history.length >= 2) {
      const posAttr = ribbonGeo.attributes.position as THREE.BufferAttribute;
      const colorAttr = ribbonGeo.attributes.trailColor as THREE.BufferAttribute;
      const alphaAttr = ribbonGeo.attributes.trailAlpha as THREE.BufferAttribute;

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const histIdx = (historyIndexRef.current - i + TRAIL_LENGTH) % TRAIL_LENGTH;
        const t = i / (TRAIL_LENGTH - 1);

        if (i < TRAIL_LENGTH - 1) {
          const nextIdx = (historyIndexRef.current - i - 1 + TRAIL_LENGTH) % TRAIL_LENGTH;
          tmpSegDir.subVectors(history[histIdx], history[nextIdx]).normalize();
        } else {
          const prevIdx = (historyIndexRef.current - i + 1 + TRAIL_LENGTH) % TRAIL_LENGTH;
          tmpSegDir.subVectors(history[prevIdx], history[histIdx]).normalize();
        }

        // Billboard the ribbon toward the camera so it's visible from any angle
        tmpToCamera.subVectors(state.camera.position, history[histIdx]).normalize();
        tmpRight.crossVectors(tmpSegDir, tmpToCamera).normalize();

        const halfW = RIBBON_HALF_WIDTH * (1 - t * 0.6);
        const px = history[histIdx].x;
        const py = history[histIdx].y;
        const pz = history[histIdx].z;

        posAttr.setXYZ(i * 2,     px + tmpRight.x * halfW, py + tmpRight.y * halfW, pz + tmpRight.z * halfW);
        posAttr.setXYZ(i * 2 + 1, px - tmpRight.x * halfW, py - tmpRight.y * halfW, pz - tmpRight.z * halfW);

        tmpColor.copy(cometColor).lerp(TAIL_COLOR, t);
        colorAttr.setXYZ(i * 2,     tmpColor.r, tmpColor.g, tmpColor.b);
        colorAttr.setXYZ(i * 2 + 1, tmpColor.r, tmpColor.g, tmpColor.b);

        // With additive blending alpha scales the colour contribution; dark tail already "fades" visually
        const alpha = 1 - t * 0.75;
        alphaAttr.setX(i * 2,     alpha);
        alphaAttr.setX(i * 2 + 1, alpha);
      }

      posAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
    }

    // Particle trail
    spawnCounterRef.current += delta * 60;
    const spawnRate = 20;

    if (velocity.length() > 0.0001) {
      const direction = velocity.normalize();
      while (spawnCounterRef.current >= spawnRate) {
        spawnCounterRef.current -= spawnRate;

        if (particlesRef.current.length < TRAIL_COUNT) {
          const behindDir = direction.clone().multiplyScalar(-0.5);
          const spawnPos: [number, number, number] = [
            x + behindDir.x,
            y + behindDir.y,
            z + behindDir.z,
          ];

          const rng = mulberry32((Math.random() * 1000) | 0);
          const spreadVel: [number, number, number] = [
            (rng() - 0.5) * 3,
            (rng() - 0.5) * 3,
            (rng() - 0.5) * 3,
          ];

          particlesRef.current.push({
            pos: spawnPos,
            vel: spreadVel,
            age: 0,
            maxAge: PARTICLE_LIFETIME,
          });
        }
      }
    }

    particlesRef.current = particlesRef.current.filter(p => p.age < p.maxAge);
    particlesRef.current.forEach(p => {
      p.age += delta;
      p.pos[0] += p.vel[0] * delta;
      p.pos[1] += p.vel[1] * delta;
      p.pos[2] += p.vel[2] * delta;
    });                                                                                                                                                                                                                                                           });

  return (
    <>
      {showOrbits && <OrbitRing radius={semiMajor} inclination={obj.inclination} eccentricity={eccentricity} />}

      <group ref={groupRef}>
        {/* Coma glow (high quality only) */}
        {comaGlowTex && (
          <sprite scale={[obj.size * 2, obj.size * 2, 1]} renderOrder={-1}>
            <spriteMaterial
              map={comaGlowTex}
              color={cometColor}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              toneMapped={false}
            />
          </sprite>
        )}

        <mesh
          scale={[0.9, 0.85, 1.1]}
          onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
          onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
          onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[obj.size * 0.7, highQuality ? 2 : 1]} />
          <meshLambertMaterial color={cometColor} flatShading emissive={cometColor} emissiveIntensity={0.6} />
        </mesh>

        {hovered && (
          <Html center distanceFactor={50} position={[0, obj.size * 0.55 + 0.8, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ddd', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
      </group>

      {/* Ribbon trail */}
      <mesh geometry={ribbonGeo} material={ribbonMat} frustumCulled={false} />

      {/* Particle trail */}
      <instancedMesh ref={particleTrailRef} args={[trailGeo, trailMat, TRAIL_COUNT]} frustumCulled={false} castShadow receiveShadow />
    </>
  );
}
