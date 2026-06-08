import { useRef, useEffect } from 'react';
import * as THREE from 'three';

interface Props {
  position: [number, number, number];
  maxLength?: number;
  color?: string;
  lineWidth?: number;
  delay?: number;
}

const TRAIL_POOL = new Map<string, {
  points: [number, number, number][];
  line: THREE.Line | null;
  skipCount: number;
}>();

export default function Trail({ position, maxLength = 250, color = '#ffffff', lineWidth = 1, delay = 10 }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const idRef = useRef<string>(Math.random().toString(36).slice(2, 10));
  const lastPosRef = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    const id = idRef.current;
    if (!TRAIL_POOL.has(id)) {
      TRAIL_POOL.set(id, { points: [], line: null, skipCount: 0 });
    }
  }, []);

  useEffect(() => {
    const id = idRef.current;
    const trail = TRAIL_POOL.get(id);
    if (!trail) return;

    // Skip initial frames to avoid center-to-orbit line
    if (trail.skipCount < delay) {
      trail.skipCount++;
      lastPosRef.current = [...position];
      return;
    }

    const lastPos = lastPosRef.current;
    const distance = lastPos
      ? Math.hypot(
          position[0] - lastPos[0],
          position[1] - lastPos[1],
          position[2] - lastPos[2]
        )
      : 1;

    // Only add if moved significantly to reduce points
    if (distance > 0.1) {
      trail.points.push([...position]);

      // Keep only the last maxLength points
      if (trail.points.length > maxLength!) {
        trail.points.shift();
      }

      lastPosRef.current = [...position];
    }

    // Update geometry
    if (groupRef.current && trail.points.length > 1) {
      if (trail.line) {
        groupRef.current.remove(trail.line);
      }

      const points = trail.points.map(p => new THREE.Vector3(...p));
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color,
        transparent: true,
        opacity: 0.5,
        linewidth: lineWidth,
        depthWrite: false,
      });
      const line = new THREE.Line(geometry, material);
      groupRef.current.add(line);
      trail.line = line;
    }
  }, [position, maxLength, delay, color, lineWidth]);

  return <group ref={groupRef} />;
}
