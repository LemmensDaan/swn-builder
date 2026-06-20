import { useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import OrbitRing from './OrbitRing';
import PlanetRings, { resolveRingBands } from './PlanetRings';
import { generatePlanetGeometry, PLANET_PRESETS, mulberry32 } from './planetRenderer';
import { getOrbitPosition } from './orbitUtils';
import PlanetPOIMarkers, { posToLatLon } from './PlanetPOIMarkers';
import { useSafeSystemViewerContext } from './SystemViewerContext';

// Maximum number of ring bands the analytic shadow shader handles.
const MAX_RING_BANDS = 8;

// GLSL prepended to the Lambert fragment shader.  For each ring band we cast a
// ray from the surface fragment toward the star and test whether it passes
// through the ring's annular disc.  The result is a smooth scalar multiplied
// onto the direct-diffuse term — no shadow map, no triangle-edge aliasing.
const RING_SHADOW_FRAG_PARS = /* glsl */`
varying vec3 vRingWorldPos;
uniform vec3  uRingStarPos;
uniform vec3  uRingPlanetCenter;
uniform float uRingBandCount;
uniform float uRingBandData[${MAX_RING_BANDS * 5}];

float computeRingShadow() {
  if (uRingBandCount <= 0.0) return 1.0;
  vec3 L = normalize(uRingStarPos - vRingWorldPos);
  float shadow = 1.0;
  for (int i = 0; i < ${MAX_RING_BANDS}; i++) {
    if (float(i) >= uRingBandCount) break;
    float inner = uRingBandData[i * 5];
    float outer = uRingBandData[i * 5 + 1];
    vec3  N     = vec3(uRingBandData[i * 5 + 2],
                       uRingBandData[i * 5 + 3],
                       uRingBandData[i * 5 + 4]);
    float dDotN = dot(L, N);
    if (abs(dDotN) < 1e-4) continue;
    float t = dot(uRingPlanetCenter - vRingWorldPos, N) / dDotN;
    if (t <= 0.0) continue;
    vec3  Q    = vRingWorldPos + t * L;
    float dist = length(Q - uRingPlanetCenter);
    float soft = max(outer * 0.02, 0.005);
    float inRing = smoothstep(inner - soft, inner + soft, dist) *
                   (1.0 - smoothstep(outer - soft, outer + soft, dist));
    shadow *= 1.0 - inRing * 0.85;
  }
  return shadow;
}
`;

interface RingUniforms {
  uRingStarPos:    { value: THREE.Vector3 };
  uRingPlanetCenter: { value: THREE.Vector3 };
  uRingBandCount:  { value: number };
  uRingBandData:   { value: Float32Array };
}

function buildPlanetMaterial(): { mat: THREE.MeshLambertMaterial; uniforms: RingUniforms } {
  const uniforms: RingUniforms = {
    uRingStarPos:    { value: new THREE.Vector3() },
    uRingPlanetCenter: { value: new THREE.Vector3() },
    uRingBandCount:  { value: 0 },
    uRingBandData:   { value: new Float32Array(MAX_RING_BANDS * 5) },
  };

  const mat = new THREE.MeshLambertMaterial({
    vertexColors: true,
    flatShading: true,
    shadowSide: THREE.BackSide,
  });

  mat.customProgramCacheKey = () => 'planet-ring-shadow-v1';

  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    // Vertex: pass world position to fragment shader
    shader.vertexShader =
      'varying vec3 vRingWorldPos;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      '#include <worldpos_vertex>',
      '#include <worldpos_vertex>\nvRingWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;',
    );

    // Fragment: prepend declarations + function, then apply shadow
    shader.fragmentShader = RING_SHADOW_FRAG_PARS + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '\tvec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
      '\tfloat ringShadow = computeRingShadow();\n\tvec3 outgoingLight = reflectedLight.directDiffuse * ringShadow + reflectedLight.indirectDiffuse + totalEmissiveRadiance;',
    );
  };

  return { mat, uniforms };
}

function makeGasGiantGlowTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,0.4)');
  g.addColorStop(0.5, 'rgba(255,200,100,0.15)');
  g.addColorStop(1, 'rgba(255,100,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  return new THREE.CanvasTexture(canvas);
}

function buildGeo(obj: SystemObject): THREE.BufferGeometry {
  // Use planet type and colors from the object
  const planetType = obj.planetType ?? 'Barren';
  const preset = PLANET_PRESETS[planetType];
  const seed = obj.seed ?? Math.abs((obj.name.charCodeAt(0) ?? 42) * 137 + (obj.sortOrder * 31));

  // Prefer colors[] from color swatches, fall back to preset
  const primaryColor = obj.colors[0] ?? obj.primaryColor ?? preset.primaryColor;
  const secondaryColor = obj.colors[1] ?? obj.colors[0] ?? obj.secondaryColor ?? preset.secondaryColor;
  const tertiaryColor = obj.tertiaryColor ?? preset.tertiaryColor;

  return generatePlanetGeometry(
    seed,
    planetType,
    primaryColor,
    secondaryColor,
    tertiaryColor,
    obj.iceCaps ?? false,
    obj.size,
    obj.inclination ?? 0,
  );
}

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  showOrbits?: boolean;
  highQuality?: boolean;
}

export default function PlanetObject({ obj, children, onPositionUpdate, onClick, showOrbits = true, highQuality = true }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const axisGroupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);
  const [hovered, setHovered] = useState(false);
  const systemViewerCtx = useSafeSystemViewerContext();
  const isGasGiant = obj.planetType === 'GasGiant';

  const { mat: planetMat, uniforms: ringUniforms } = useMemo(() => buildPlanetMaterial(), []);
  // Reusable vector for ring normal computation — avoids per-frame allocation.
  const ringNormTmp = useRef(new THREE.Vector3());

  const angleRef = useRef(mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2);

  const orbitSpeed = obj.orbitSpeed > 0 ? obj.orbitSpeed : (obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0);

  const geo = useMemo(
    () => buildGeo(obj),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [obj.seed, obj.size, obj.planetType, obj.primaryColor, obj.secondaryColor, obj.iceCaps, obj.colors[0], obj.colors[1]],
  );

  const glowTex = useMemo(() => (isGasGiant && highQuality ? makeGasGiantGlowTexture() : null), [isGasGiant, highQuality]);

  const _worldPos = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, delta) => {
    // Clamp delta to prevent animation lurches after tab backgrounding
    delta = Math.min(delta, 0.05);

    angleRef.current += delta * orbitSpeed;
    const incRad = THREE.MathUtils.degToRad(obj.inclination);
    const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
    if (groupRef.current) {
      groupRef.current.position.set(x, y, z);
      groupRef.current.getWorldPosition(_worldPos);
      onPositionUpdate?.([_worldPos.x, _worldPos.y, _worldPos.z]);
    }

    if (meshRef.current && axisGroupRef.current) {
      // Set axis inclination on the axis group (tilts the rotation axis)
      if (obj.axisInclination !== undefined) {
        axisGroupRef.current.rotation.z = THREE.MathUtils.degToRad(obj.axisInclination);
      }

      if (obj.planetType === 'TidallyLocked') {
        // Tidally locked: always face the star
        // Calculate direction from planet to star (at origin)
        const towardsStar = new THREE.Vector3(-x, -y, -z).normalize();

        // The Y-axis in the mesh points toward the dayside
        // Create a quaternion that aligns the mesh's Y-axis with the star direction
        const up = new THREE.Vector3(0, 1, 0);

        // If already aligned, don't calculate rotation
        const dotProduct = up.dot(towardsStar);
        if (Math.abs(dotProduct) < 0.999) {
          // Cross product to get rotation axis
          const axis = new THREE.Vector3().crossVectors(up, towardsStar).normalize();
          // Angle between vectors
          const angle = Math.acos(Math.max(-1, Math.min(1, dotProduct)));
          // Apply rotation
          const quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle(axis, angle);
          meshRef.current.quaternion.copy(quaternion);
        } else {
          // Already facing star, keep orientation
          meshRef.current.quaternion.identity();
        }
      } else {
        // Normal rotation around the axis (which is tilted by axisInclination)
        meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.15);
      }
    }

    // Update analytic ring shadow uniforms every frame.
    // Star position approximated at world origin — accurate for single-star systems.
    if (obj.rings && groupRef.current && axisGroupRef.current) {
      ringUniforms.uRingStarPos.value.set(0, 0, 0);
      groupRef.current.getWorldPosition(ringUniforms.uRingPlanetCenter.value);
      const bands = resolveRingBands(obj);
      const count = Math.min(bands.length, MAX_RING_BANDS);
      ringUniforms.uRingBandCount.value = count;
      const data = ringUniforms.uRingBandData.value;
      const axisQ = axisGroupRef.current.quaternion;
      for (let i = 0; i < count; i++) {
        const band = bands[i];
        const bIncRad = THREE.MathUtils.degToRad(band.inclination);
        ringNormTmp.current
          .set(0, Math.cos(bIncRad), Math.sin(bIncRad))
          .applyQuaternion(axisQ);
        const centerR = band.size * obj.size;
        const w = (band.width ?? 0.4) * obj.size;
        data[i * 5]     = Math.max(0.02, centerR - w / 2);
        data[i * 5 + 1] = centerR + w / 2;
        data[i * 5 + 2] = ringNormTmp.current.x;
        data[i * 5 + 3] = ringNormTmp.current.y;
        data[i * 5 + 4] = ringNormTmp.current.z;
      }
    } else {
      ringUniforms.uRingBandCount.value = 0;
    }
  });

  return (
    <>
      {/* Orbit ring for planets and moons */}
      {showOrbits && obj.orbitRadius > 0 && <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />}
      <group ref={groupRef} name={obj.id}>
        {/* Gas giant glow hazes — baseline plus size-scaled layers */}
        {glowTex && (
          <>
            {/* Baseline inner haze — always visible, bright and gassy */}
            <sprite scale={[obj.size * 3.2, obj.size * 3.2, 1]} renderOrder={-1}>
              <spriteMaterial
                map={glowTex}
                color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                transparent
                depthWrite={false}
                opacity={0.85}
                blending={THREE.AdditiveBlending}
                toneMapped={false}
              />
            </sprite>
            {/* Additional hazes for larger gas giants */}
            {obj.size > 1.5 && (
              <sprite scale={[obj.size * 5.5, obj.size * 5.5, 1]} renderOrder={-2}>
                <spriteMaterial
                  map={glowTex}
                  color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                  transparent
                  depthWrite={false}
                  opacity={0.35}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </sprite>
            )}
            {obj.size > 2.5 && (
              <sprite scale={[obj.size * 8.5, obj.size * 8.5, 1]} renderOrder={-3}>
                <spriteMaterial
                  map={glowTex}
                  color={obj.colors[0] ?? obj.primaryColor ?? '#d4924a'}
                  transparent
                  depthWrite={false}
                  opacity={0.18}
                  blending={THREE.AdditiveBlending}
                  toneMapped={false}
                />
              </sprite>
            )}
          </>
        )}
        <group ref={axisGroupRef}>
          <mesh
            ref={meshRef}
            geometry={geo}
            material={planetMat}
            castShadow
            receiveShadow
            onPointerEnter={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerLeave={() => { setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onClick?.(obj.id); }}
            onContextMenu={(e) => {
              e.stopPropagation();
              e.nativeEvent.preventDefault();
              if (systemViewerCtx?.onPlanetContextMenu && meshRef.current) {
                const localPt = e.point.clone();
                meshRef.current.worldToLocal(localPt);
                const { lat, lon } = posToLatLon(localPt);
                systemViewerCtx.onPlanetContextMenu(obj.id, e.nativeEvent.offsetX, e.nativeEvent.offsetY, lat, lon);
              }
            }}
          >
            {systemViewerCtx && (obj.pois ?? []).length > 0 && (
              <PlanetPOIMarkers
                pois={obj.pois!}
                planetSize={obj.size}
                meshRef={meshRef}
                systemId={systemViewerCtx.systemId}
                objectId={obj.id}
              />
            )}
          </mesh>
          {obj.rings && <PlanetRings obj={obj} />}
        </group>
        {/* Hover label — monospace text, no line, no box */}
        {hovered && (
          <Html
            center
            distanceFactor={45}
            position={[0, obj.size + 0.5, 0]}
            style={{ pointerEvents: 'none' }}
          >
            <div style={{ fontFamily: 'monospace', fontSize: '10px', color: '#ddd', whiteSpace: 'nowrap', textShadow: '0 1px 4px #000' }}>
              {obj.name}
            </div>
          </Html>
        )}
        {/* Children (moons, stations) orbit in this planet's local space */}
        {children}
      </group>
    </>
  );
}
