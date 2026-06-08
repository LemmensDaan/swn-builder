import { useState, useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

interface Props {
  obj: SystemObject;
  onPositionUpdate?: (pos: [number, number, number]) => void;
}

// Elliptical orbit with high eccentricity
function getEllipticalOrbitPosition(
  angle: number,
  semiMajor: number,
  eccentricity: number,
  inclination: number
): [number, number, number] {
  const incRad = THREE.MathUtils.degToRad(inclination);

  // Elliptical orbit equation: r = a(1-e²)/(1+e*cos(θ))
  const radius = (semiMajor * (1 - eccentricity * eccentricity)) / (1 + eccentricity * Math.cos(angle));

  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;

  // Apply inclination to the z-axis
  const y = z * Math.sin(incRad);
  const z_final = z * Math.cos(incRad);

  return [x, y, z_final];
}

const TRAIL_COUNT = 50;
const PARTICLE_LIFETIME = 1.2; // seconds before fading out

interface TrailParticle {
  pos: [number, number, number];
  vel: [number, number, number];
  age: number;
  maxAge: number;
}

export default function CometObject({ obj, onPositionUpdate }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const trailGroupRef = useRef<THREE.Group>(null);
  const particleTrailRef = useRef<THREE.InstancedMesh>(null);
  const [hovered, setHovered] = useState(false);

  // Extremely elongated elliptical orbit
  const eccentricity = 0.96;  // Very stretched (0.96 = extremely elliptical)
  const semiMajor = obj.orbitRadius * 2.5;  // Much larger orbit

  const initialAngle = useMemo(
    () => mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2,
    [obj.seed, obj.sortOrder]
  );
  const angleRef = useRef(initialAngle);
  const elapsedRef = useRef(0);
  const prevPosRef = useRef<[number, number, number]>([0, 0, 0]);
  const particlesRef = useRef<TrailParticle[]>([]);
  const spawnCounterRef = useRef(0);

  // Slower orbital speed for better visibility
  const orbitSpeed = 0.08;

  const cometColor = useMemo(() => new THREE.Color(obj.colors[0] ?? '#E8F4F8'), [obj.colors[0]]);
  const trailGeo = useMemo(() => new THREE.IcosahedronGeometry(0.04, 0), []);
  const trailMat = useMemo(
    () => new THREE.MeshLambertMaterial({ color: cometColor, transparent: true, flatShading: true }),
    [cometColor]
  );

  // Initialize particle trail
  useEffect(() => {
    if (!particleTrailRef.current) return;
    const dummy = new THREE.Object3D();
    for (let i = 0; i < TRAIL_COUNT; i++) {
      dummy.position.set(0, 0, 0);
      dummy.scale.set(0, 0, 0); // Start invisible
      dummy.updateMatrix();
      particleTrailRef.current.setMatrixAt(i, dummy.matrix);
    }
    particleTrailRef.current.instanceMatrix.needsUpdate = true;
  }, []);

  useFrame((_, delta) => {
    if (!groupRef.current || !meshRef.current || !particleTrailRef.current) return;

    elapsedRef.current += delta;

    // Get comet position on elliptical orbit
    const [x, y, z] = getEllipticalOrbitPosition(angleRef.current, semiMajor, eccentricity, obj.inclination);

    // Calculate distance from star to adjust speed (farther = faster angle increment to maintain consistent speed)
    const distFromStar = Math.sqrt(x * x + y * y + z * z);
    const minDist = semiMajor * (1 - eccentricity);
    const maxDist = semiMajor * (1 + eccentricity);
    const midDist = (minDist + maxDist) / 2;

    // Normalize distance to adjust angular velocity (inverse relationship for consistent speed)
    const distanceFactor = midDist / Math.max(distFromStar, minDist * 0.5);
    angleRef.current += delta * orbitSpeed * distanceFactor;

    groupRef.current.position.set(x, y, z);
    onPositionUpdate?.([x, y, z]);

    // Calculate velocity direction from position change
    const velocity = new THREE.Vector3(
      x - prevPosRef.current[0],
      y - prevPosRef.current[1],
      z - prevPosRef.current[2]
    );
    prevPosRef.current = [x, y, z];

    if (velocity.length() > 0.0001) {
      const direction = velocity.normalize();

      // Rotate comet nucleus to point along velocity direction
      meshRef.current.lookAt(
        meshRef.current.position.x + direction.x,
        meshRef.current.position.y + direction.y,
        meshRef.current.position.z + direction.z
      );

      // Rotate exhaust trail group to point opposite velocity direction
      if (trailGroupRef.current) {
        const trailDir = direction.clone().negate();
        trailGroupRef.current.lookAt(
          trailGroupRef.current.position.x + trailDir.x,
          trailGroupRef.current.position.y + trailDir.y,
          trailGroupRef.current.position.z + trailDir.z
        );

        // Apply subtle flicker to trail X scale
        trailGroupRef.current.scale.x = 1 + Math.sin(elapsedRef.current * 8) * 0.08;
      }
    }

    // Spawn new particles from comet (every few frames)
    spawnCounterRef.current += delta * 60; // Spawn rate per second
    const spawnRate = 20; // particles per second
    if (velocity.length() > 0.0001) {
      const direction = velocity.normalize();
      while (spawnCounterRef.current >= spawnRate) {
        spawnCounterRef.current -= spawnRate;

        if (particlesRef.current.length < TRAIL_COUNT) {
          // Spawn particle behind the comet (opposite to velocity direction)
          const behindDir = direction.clone().multiplyScalar(-0.5);
          const spawnPos: [number, number, number] = [
            x + behindDir.x,
            y + behindDir.y,
            z + behindDir.z,
          ];

          // Give particle random scatter velocity (outward spread)
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

    // Update particle positions and ages
    particlesRef.current = particlesRef.current.filter(p => p.age < p.maxAge);
    particlesRef.current.forEach(p => {
      p.age += delta;
      p.pos[0] += p.vel[0] * delta;
      p.pos[1] += p.vel[1] * delta;
      p.pos[2] += p.vel[2] * delta;
    });

    // Update instanced mesh
    const dummy = new THREE.Object3D();
    for (let i = 0; i < TRAIL_COUNT; i++) {
      if (i < particlesRef.current.length) {
        const p = particlesRef.current[i];
        const life = 1 - p.age / p.maxAge;

        dummy.position.set(p.pos[0], p.pos[1], p.pos[2]);
        dummy.scale.set(1, 1, 1);
        dummy.updateMatrix();
        particleTrailRef.current.setMatrixAt(i, dummy.matrix);

        if (trailMat.color) {
          const color = new THREE.Color(cometColor).multiplyScalar(life * 0.8);
          particleTrailRef.current.setColorAt(i, color);
        }
      } else {
        // Hide unused instances
        dummy.scale.set(0, 0, 0);
        dummy.updateMatrix();
        particleTrailRef.current.setMatrixAt(i, dummy.matrix);
      }
    }

    particleTrailRef.current.instanceMatrix.needsUpdate = true;
    if (particleTrailRef.current.instanceColor) {
      particleTrailRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <>
      {/* Orbit line for comet's elliptical path */}
      <OrbitRing radius={semiMajor} inclination={obj.inclination} eccentricity={eccentricity} />

      <group ref={groupRef}>
        {/* Comet nucleus */}
        <mesh
          ref={meshRef}
          onPointerEnter={() => setHovered(true)}
          onPointerLeave={() => setHovered(false)}
          castShadow
          receiveShadow
        >
          <icosahedronGeometry args={[obj.size, 1]} />
          <meshLambertMaterial color={cometColor} flatShading emissive={cometColor} emissiveIntensity={0.5} />
        </mesh>




        {/* Hover label */}
        {hovered && (
          <Html center distanceFactor={50} position={[0, obj.size + 0.8, 0]} style={{ pointerEvents: 'none' }}>
            <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#ddd', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
      </group>

      {/* Particle trail - ice particles that fade away */}
      <instancedMesh ref={particleTrailRef} args={[trailGeo, trailMat, TRAIL_COUNT]} castShadow receiveShadow />
    </>
  );
}
