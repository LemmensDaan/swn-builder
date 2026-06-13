import { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SystemObject } from '../../../types/sector';
import { getOrbitPosition } from './orbitUtils';
import { mulberry32 } from './planetRenderer';
import OrbitRing from './OrbitRing';

// ─── Shared glow texture ───────────────────────────────────────────────────────

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

// ─── Black hole accretion disk ────────────────────────────────────────────────

function makeBlackHoleAccretionDisk(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  const base = new THREE.Color(baseHex);
  const hsl = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);
  const hue = Math.round(hsl.h * 360);

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
    map: diskTex, side: THREE.DoubleSide, transparent: true,
    depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
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

// ─── Black hole orbiting debris chunks ────────────────────────────────────────

interface ChunkOrbit { radius: number; speed: number; }

function makeBlackHoleChunks(
  baseHex: string, size: number, rng: () => number,
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
    const t      = Math.pow(rng(), 1.6);
    const radius = innerR + t * (outerR - innerR);
    const normR  = (radius - innerR) / (outerR - innerR);
    const speed  = 1.6 / Math.sqrt(radius / size);
    const angle  = rng() * Math.PI * 2;

    const sizeClass = rng();
    const baseSize  = sizeClass < 0.55
      ? size * (0.025 + rng() * 0.04)
      : sizeClass < 0.85
      ? size * (0.07  + rng() * 0.07)
      : size * (0.10  + rng() * 0.12);
    const chunkSize = baseSize * (0.8 + normR * 0.5);

    const lightness  = 0.85 - normR * 0.52;
    const saturation = 0.15 + normR * 0.85;
    const chunkColor = new THREE.Color().setHSL(hsl.h, Math.min(1, saturation), lightness);

    const geo = rng() > 0.45
      ? new THREE.TetrahedronGeometry(chunkSize)
      : new THREE.IcosahedronGeometry(chunkSize, 0);

    const mat = new THREE.MeshLambertMaterial({
      color: chunkColor, emissive: chunkColor,
      emissiveIntensity: 0.25 + (1 - normR) * 0.4,
      flatShading: true, toneMapped: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.userData.isStar = true;
    mesh.rotation.set(rng() * Math.PI * 2, rng() * Math.PI * 2, rng() * Math.PI * 2);
    mesh.userData.selfRot = (rng() - 0.5) * 1.8;
    mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    group.add(mesh);
    orbits.push({ radius, speed });
  }

  return { group, orbits };
}

// ─── Normal star solar prominence particles ────────────────────────────────────

function makeProminenceGroup(baseHex: string, size: number, rng: () => number): THREE.Group {
  const group = new THREE.Group();
  group.userData.isStar = true;

  const base = new THREE.Color(baseHex);
  const hsl  = { h: 0, s: 0, l: 0 };
  base.getHSL(hsl);

  const prominenceCount    = 5;   // separate arc paths
  const particlesPerArc    = 8;   // particles flowing along each arc

  for (let p = 0; p < prominenceCount; p++) {
    const isLarge = p < 2;

    // --- Arc geometry: quadratic bezier p0 → p1 → p2 ---
    // Axis = outward direction this prominence shoots from
    const axis = new THREE.Vector3(rng()-0.5, rng()-0.5, rng()-0.5).normalize();

    // Perpendicular vector (determines how wide the arc base is)
    const perp = new THREE.Vector3(rng()-0.5, rng()-0.5, rng()-0.5);
    perp.crossVectors(axis, perp).normalize();

    const spread = 0.28 + rng() * 0.38; // angular half-width of arc base

    const p0 = axis.clone()
      .multiplyScalar(Math.cos(spread))
      .addScaledVector(perp,  Math.sin(spread))
      .normalize().multiplyScalar(size * 0.98);

    const p2 = axis.clone()
      .multiplyScalar(Math.cos(spread))
      .addScaledVector(perp, -Math.sin(spread))
      .normalize().multiplyScalar(size * 0.98);

    const arcHeight = isLarge
      ? size * (1.1 + rng() * 1.2)
      : size * (0.35 + rng() * 0.55);
    // Arc apex — directly above midpoint, along axis
    const p1base = axis.clone().multiplyScalar(size + arcHeight);

    const arcPhase  = rng() * Math.PI * 2;
    const arcWobble = arcHeight * 0.12; // apex breathes slightly
    const flowSpeed = isLarge ? 0.07 + rng() * 0.05 : 0.14 + rng() * 0.14;

    // --- Particles spread evenly along the arc ---
    for (let i = 0; i < particlesPerArc; i++) {
      const pSize = size * (isLarge ? 0.055 + rng() * 0.055 : 0.025 + rng() * 0.03);

      const pColor = new THREE.Color().setHSL(
        hsl.h,
        Math.min(1, hsl.s * (0.75 + rng() * 0.5)),
        Math.min(1, hsl.l + 0.08 + (rng() - 0.5) * 0.12),
      );

      const geo = rng() > 0.45
        ? new THREE.TetrahedronGeometry(pSize)
        : new THREE.IcosahedronGeometry(pSize, 0);

      const mat = new THREE.MeshLambertMaterial({
        color: pColor, emissive: pColor,
        emissiveIntensity: 0.5,
        flatShading: true, toneMapped: false,
        transparent: true, opacity: 0,
      });

      const mesh = new THREE.Mesh(geo, mat);
      mesh.userData.isStar           = true;
      mesh.userData.isSolarParticle  = true;
      mesh.userData.progress         = i / particlesPerArc; // stagger along arc
      mesh.userData.speed            = flowSpeed * (0.88 + rng() * 0.24);
      mesh.userData.p0               = p0;
      mesh.userData.p1base           = p1base.clone();
      mesh.userData.p1               = p1base.clone(); // mutable working copy
      mesh.userData.p2               = p2;
      mesh.userData.axis             = axis.clone();
      mesh.userData.arcPhase         = arcPhase;
      mesh.userData.arcWobble        = arcWobble;
      mesh.userData.rotSpeedX        = (rng() - 0.5) * 1.2;
      mesh.userData.rotSpeedZ        = (rng() - 0.5) * 1.2;
      mesh.rotation.set(rng()*Math.PI*2, rng()*Math.PI*2, rng()*Math.PI*2);

      group.add(mesh);
    }
  }

  return group;
}

// ─── Neutron star bipolar jets ─────────────────────────────────────────────────

function makeNeutronJets(baseHex: string, size: number): THREE.Group {
  const group = new THREE.Group();
  group.userData.isStar = true;

  const base  = new THREE.Color(baseHex);
  const white = new THREE.Color(1, 1, 1);
  const H     = size * 18; // very long exhaust beams

  // Unit cone: base at y=0, tip at y=1 (after translate) — narrow, beam-like
  const unitGeo = new THREE.ConeGeometry(1, 1, 4);
  unitGeo.translate(0, 0.5, 0);

  // Three additive layers per jet: razor-thin bright core → soft halo → wide outer glow
  const layers = [
    { wMult: 0.018, col: white.clone(),                 op: 0.92 },
    { wMult: 0.07,  col: white.clone().lerp(base, 0.35), op: 0.38 },
    { wMult: 0.18,  col: base.clone(),                  op: 0.14 },
  ];

  for (const dir of [1, -1]) {
    for (const layer of layers) {
      const mat = new THREE.MeshBasicMaterial({
        color: layer.col, transparent: true, opacity: layer.op,
        toneMapped: false, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      });

      const mesh = new THREE.Mesh(unitGeo, mat);
      mesh.userData.isStar = true;
      mesh.userData.isJet  = true;
      mesh.userData.baseOp = layer.op;

      const w = size * layer.wMult;
      mesh.scale.set(w, H, w);

      if (dir === 1) {
        mesh.position.set(0, size * 0.9, 0);
      } else {
        mesh.position.set(0, -size * 0.9, 0);
        mesh.rotation.x = Math.PI;
      }

      group.add(mesh);
    }
  }

  return group;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  obj: SystemObject;
  children?: React.ReactNode;
  onPositionUpdate?: (pos: [number, number, number]) => void;
  onClick?: (id: string) => void;
  previewMode?: boolean;
  showOrbits?: boolean;
}

export default function StarObject({ obj, children, onPositionUpdate, onClick, previewMode, showOrbits = true }: Props) {
  const groupRef        = useRef<THREE.Group>(null);
  const meshRef         = useRef<THREE.Mesh>(null);
  const diskGroupRef    = useRef<THREE.Group>(null);
  const photonGroupRef  = useRef<THREE.Group>(null);
  const chunkGroupRef   = useRef<THREE.Group>(null);
  const coronaRef       = useRef<THREE.Group>(null);
  const nsJetsRef       = useRef<THREE.Group>(null);
  const localTimeRef    = useRef(0);

  const [hovered, setHovered] = useState(false);
  const color      = obj.colors[0] ?? '#FFF4C2';
  const isBlackHole = obj.type === 'BlackHole';
  const isNeutron   = obj.type === 'NeutronStar';
  const glowTex    = useMemo(() => makeStarGlowTexture(), []);

  // Black hole geometry
  const bhDisk   = useMemo(() => makeBlackHoleAccretionDisk(color, obj.size), [color, obj.size]);
  const bhChunks = useMemo(() => {
    const rng = mulberry32((obj.seed ?? obj.id.charCodeAt(0) * 73) >>> 0);
    return makeBlackHoleChunks(color, obj.size, rng);
  }, [color, obj.size, obj.seed, obj.id]);

  // Normal star corona
  const coronaGroup = useMemo(() => {
    if (isBlackHole || isNeutron) return null;
    const rng = mulberry32((obj.seed ?? obj.id.charCodeAt(0) * 191) >>> 0);
    return makeProminenceGroup(color, obj.size, rng);
  }, [color, obj.size, obj.seed, obj.id, isBlackHole, isNeutron]);

  // Neutron star effects
  const nsJets = useMemo(() => isNeutron ? makeNeutronJets(color, obj.size) : null, [color, obj.size, isNeutron]);

  const camera = useThree(state => state.camera);

  // Track BH chunk angles
  const chunkAnglesRef = useRef<number[]>([]);
  if (chunkAnglesRef.current.length !== bhChunks.orbits.length) {
    const ch = bhChunks.group.children;
    chunkAnglesRef.current = bhChunks.orbits.map((_, i) => {
      const p = ch[i]?.position;
      return p ? Math.atan2(p.z, p.x) : 0;
    });
  }

  // Disk inclination
  const discInclination = useMemo(() => {
    const rng = mulberry32(obj.seed ?? obj.id.charCodeAt(0) * 137);
    return (rng() - 0.5) * Math.PI * 0.35;
  }, [obj.seed, obj.id]);

  // Binary orbit
  let initialAngle = mulberry32(obj.seed ?? obj.sortOrder * 137)() * Math.PI * 2;
  if (obj.sortOrder === 1) initialAngle += Math.PI;
  const orbitSpeed = obj.orbitRadius > 0 ? 0.3 / Math.sqrt(obj.orbitRadius) : 0;
  const angleRef   = useRef(initialAngle);

  useFrame((_, delta) => {
    localTimeRef.current += delta;
    const time = localTimeRef.current;

    // Binary orbit
    if (obj.orbitRadius > 0 && groupRef.current) {
      angleRef.current += delta * orbitSpeed;
      const incRad = THREE.MathUtils.degToRad(obj.inclination);
      const [x, y, z] = getOrbitPosition(angleRef.current, obj.orbitRadius, incRad);
      groupRef.current.position.set(x, y, z);
      onPositionUpdate?.([x, y, z]);
    } else if (groupRef.current && obj.orbitRadius === 0) {
      onPositionUpdate?.([0, 0, 0]);
    }

    // Normal star self-rotation
    if (meshRef.current && !isBlackHole && !isNeutron) {
      meshRef.current.rotation.y += delta * (obj.selfRotationSpeed || 0.08);
    }

    // Black hole disk + chunks
    if (diskGroupRef.current)  diskGroupRef.current.rotation.y += delta * 0.5;
    if (photonGroupRef.current) photonGroupRef.current.lookAt(camera.position);
    if (chunkGroupRef.current) {
      const children = chunkGroupRef.current.children;
      const angles   = chunkAnglesRef.current;
      const orbits   = bhChunks.orbits;
      for (let i = 0; i < children.length; i++) {
        angles[i] += delta * orbits[i].speed;
        const r = orbits[i].radius;
        children[i].position.set(Math.cos(angles[i]) * r, 0, Math.sin(angles[i]) * r);
        children[i].rotation.y += delta * (children[i].userData.selfRot as number);
      }
    }

    // Solar prominence particle arcs
    if (coronaRef.current) {
      for (const child of coronaRef.current.children) {
        if (!child.userData.isSolarParticle) continue;

        // Advance along arc, loop back to start
        child.userData.progress += delta * child.userData.speed;
        if (child.userData.progress >= 1) child.userData.progress -= 1;
        const t = child.userData.progress as number;

        // Slowly breathe the arc apex
        const wobble = Math.sin(time * 0.38 + (child.userData.arcPhase as number))
          * (child.userData.arcWobble as number);
        const p1 = child.userData.p1 as THREE.Vector3;
        p1.copy(child.userData.p1base as THREE.Vector3)
          .addScaledVector(child.userData.axis as THREE.Vector3, wobble);

        // Quadratic bezier position
        const p0 = child.userData.p0 as THREE.Vector3;
        const p2 = child.userData.p2 as THREE.Vector3;
        const mt = 1 - t;
        child.position.set(
          mt*mt*p0.x + 2*mt*t*p1.x + t*t*p2.x,
          mt*mt*p0.y + 2*mt*t*p1.y + t*t*p2.y,
          mt*mt*p0.z + 2*mt*t*p1.z + t*t*p2.z,
        );

        // Fade: quick ramp in near launch, then fade out and dissipate before arc end
        const fadeIn  = Math.min(1, t * 9);
        const fadeOut = Math.max(0, 1 - t * 1.45);
        const mat = (child as THREE.Mesh).material as THREE.MeshLambertMaterial;
        mat.opacity = fadeIn * fadeOut;

        // Slow tumble as particles fly
        child.rotation.x += delta * (child.userData.rotSpeedX as number);
        child.rotation.z += delta * (child.userData.rotSpeedZ as number);
      }
    }

    // Neutron star jets: subtle shimmer, never dims much
    if (nsJetsRef.current) {
      const pulse = 0.88 + 0.12 * Math.sin(time * 2.6);
      for (const child of nsJetsRef.current.children) {
        const m = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        if (m && child.userData.isJet) m.opacity = pulse * child.userData.baseOp;
      }
    }
  });

  const photonR = obj.size * 1.06;

  return (
    <>
      {showOrbits && obj.parentId !== null && obj.orbitRadius > 0 && (
        <OrbitRing radius={obj.orbitRadius} inclination={obj.inclination} />
      )}
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

        {/* ── Normal star ─────────────────────────────────────────────────── */}
        {!isBlackHole && !isNeutron && (
          <>
            {/* Multi-layer additive bloom */}
            <sprite userData={{ isStar: true }} scale={[obj.size * 11, obj.size * 11, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.22}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 5.5, obj.size * 5.5, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.65}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 2.8, obj.size * 2.8, 1]}>
              <spriteMaterial map={glowTex} color="white" transparent depthWrite={false} opacity={0.85}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            {/* Animated corona spikes */}
            {coronaGroup && <primitive ref={coronaRef} object={coronaGroup} />}
          </>
        )}

        {/* ── Neutron star ─────────────────────────────────────────────────── */}
        {isNeutron && (
          <>
            {/* Intense blue-tinted multi-layer glow */}
            <sprite userData={{ isStar: true }} scale={[obj.size * 18, obj.size * 18, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.18}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 8, obj.size * 8, 1]}>
              <spriteMaterial map={glowTex} color={color} transparent depthWrite={false} opacity={0.6}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            <sprite userData={{ isStar: true }} scale={[obj.size * 3.5, obj.size * 3.5, 1]}>
              <spriteMaterial map={glowTex} color="white" transparent depthWrite={false} opacity={0.9}
                blending={THREE.AdditiveBlending} toneMapped={false} />
            </sprite>
            {/* Bipolar jets */}
            {nsJets && <primitive ref={nsJetsRef} object={nsJets} />}
          </>
        )}

        {/* ── Black hole ───────────────────────────────────────────────────── */}
        {isBlackHole && (
          <group userData={{ isStar: true }} rotation={[discInclination, 0, 0]}>
            <primitive ref={diskGroupRef} object={bhDisk} />
            <primitive ref={chunkGroupRef} object={bhChunks.group} />

            {/* Photon ring — billboards to camera */}
            <group ref={photonGroupRef}>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.048, 16, 128]} />
                <meshBasicMaterial color={new THREE.Color(1, 0.97, 0.92)} toneMapped={false}
                  transparent opacity={0.95} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.13, 16, 128]} />
                <meshBasicMaterial color={new THREE.Color(1, 0.82, 0.55)} toneMapped={false}
                  transparent opacity={0.52} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
              <mesh>
                <torusGeometry args={[photonR, photonR * 0.30, 16, 128]} />
                <meshBasicMaterial color={new THREE.Color(0.9, 0.55, 0.25)} toneMapped={false}
                  transparent opacity={0.22} blending={THREE.AdditiveBlending}
                  depthWrite={false} depthTest={false} />
              </mesh>
            </group>

            <mesh renderOrder={1}>
              <icosahedronGeometry args={[obj.size * 0.85, 4]} />
              <meshBasicMaterial color="#000000" toneMapped={false} />
            </mesh>
          </group>
        )}

        {/* ── Main body (all types) ────────────────────────────────────────── */}
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
