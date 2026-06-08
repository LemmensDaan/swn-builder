import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

function makeCloudTex(
  w: number,
  h: number,
  blobs: Array<{
    cx: number; cy: number;
    rx: number; ry: number;
    stops: [number, string][];
    alpha?: number;
  }>,
  edgeFade = 0.20,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  for (const b of blobs) {
    ctx.save();
    if (b.alpha !== undefined) ctx.globalAlpha = b.alpha;
    ctx.translate(b.cx * w, b.cy * h);
    ctx.scale(b.rx * w, b.ry * h);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
    for (const [t, col] of b.stops) g.addColorStop(t, col);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, 1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // Erase all 4 borders so plane geometry edges never appear as hard rectangles.
  ctx.globalCompositeOperation = 'destination-out';
  const hg = ctx.createLinearGradient(0, 0, w, 0);
  hg.addColorStop(0,            'rgba(0,0,0,1)');
  hg.addColorStop(edgeFade,     'rgba(0,0,0,0)');
  hg.addColorStop(1 - edgeFade, 'rgba(0,0,0,0)');
  hg.addColorStop(1,            'rgba(0,0,0,1)');
  ctx.fillStyle = hg;
  ctx.fillRect(0, 0, w, h);
  const vg = ctx.createLinearGradient(0, 0, 0, h);
  vg.addColorStop(0,            'rgba(0,0,0,1)');
  vg.addColorStop(edgeFade,     'rgba(0,0,0,0)');
  vg.addColorStop(1 - edgeFade, 'rgba(0,0,0,0)');
  vg.addColorStop(1,            'rgba(0,0,0,1)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  return new THREE.CanvasTexture(c);
}

type V3 = [number, number, number];

export default function NebulaBackground() {
  const groupRef = useRef<THREE.Group>(null);

  // Follow camera position only — no rotation copy, so planes keep fixed world directions.
  useFrame(({ camera }) => {
    groupRef.current?.position.copy(camera.position);
  });

  const tex = useMemo(() => {
    // ── 1. Very faint deep-blue ambient haze ─────────────────────────────────
    const blueAmbient = makeCloudTex(1024, 512, [
      { cx: 0.50, cy: 0.56, rx: 0.36, ry: 0.34,
        stops: [[0, 'rgba(13,22,92,0.20)'], [0.65, 'rgba(7,14,58,0.07)'], [1, 'rgba(3,7,28,0)']] },
      { cx: 0.28, cy: 0.62, rx: 0.25, ry: 0.27,
        stops: [[0, 'rgba(10,18,80,0.11)'], [1, 'rgba(3,7,28,0)']] },
      { cx: 0.72, cy: 0.60, rx: 0.23, ry: 0.25,
        stops: [[0, 'rgba(10,18,78,0.09)'], [1, 'rgba(3,7,28,0)']] },
    ], 0.22);

    // ── 2. Wide pale blue-white outer band — the diffuse galactic plane glow ─
    const outerGlow = makeCloudTex(1024, 128, [
      { cx: 0.50, cy: 0.50, rx: 0.36, ry: 0.36,
        stops: [[0, 'rgba(105,125,208,0.33)'], [0.6, 'rgba(55,75,155,0.09)'], [1, 'rgba(22,32,88,0)']] },
      { cx: 0.28, cy: 0.50, rx: 0.20, ry: 0.33,
        stops: [[0, 'rgba(88,108,192,0.19)'], [1, 'rgba(22,32,88,0)']] },
      { cx: 0.72, cy: 0.50, rx: 0.20, ry: 0.30,
        stops: [[0, 'rgba(92,112,196,0.16)'], [1, 'rgba(22,32,88,0)']] },
    ], 0.20);

    // ── 3. Warm cream/white core — galactic nucleus light bleeding through ────
    const coreGlow = makeCloudTex(512, 128, [
      { cx: 0.50, cy: 0.48, rx: 0.25, ry: 0.36,
        stops: [[0, 'rgba(238,228,212,0.65)'], [0.45, 'rgba(172,168,202,0.24)'], [1, 'rgba(68,72,138,0)']] },
      { cx: 0.50, cy: 0.44, rx: 0.11, ry: 0.27,
        stops: [[0, 'rgba(255,254,246,0.76)'], [0.5, 'rgba(188,184,214,0.19)'], [1, 'rgba(68,72,138,0)']] },
      { cx: 0.60, cy: 0.50, rx: 0.15, ry: 0.28,
        stops: [[0, 'rgba(208,202,222,0.30)'], [1, 'rgba(68,72,138,0)']] },
    ], 0.22);

    // ── 4. Dark dust lane — absorbs band light (NormalBlending blocks emission) ─
    const dustLane = makeCloudTex(512, 128, [
      { cx: 0.47, cy: 0.42, rx: 0.33, ry: 0.38,
        stops: [[0, 'rgba(2,1,5,0.92)'], [0.5, 'rgba(2,1,5,0.40)'], [1, 'rgba(2,1,5,0)']] },
      { cx: 0.65, cy: 0.33, rx: 0.24, ry: 0.34,
        stops: [[0, 'rgba(2,1,6,0.82)'], [1, 'rgba(2,1,6,0)']] },
      { cx: 0.24, cy: 0.50, rx: 0.18, ry: 0.30,
        stops: [[0, 'rgba(2,1,5,0.65)'], [1, 'rgba(2,1,5,0)']] },
    ], 0.20);

    // ── 5. Bright point glow textures (star clusters / nebulae in the band) ──
    const mkPt = (r: number, g: number, b: number) =>
      makeCloudTex(64, 64, [{
        cx: 0.5, cy: 0.5, rx: 0.40, ry: 0.40,
        stops: [
          [0,    'rgba(255,255,255,1.0)'],
          [0.14, `rgba(${r},${g},${b},0.72)`],
          [0.38, `rgba(${Math.round(r*0.4)},${Math.round(g*0.4)},${Math.round(b*0.4)},0.14)`],
          [1,    'rgba(0,0,0,0)'],
        ],
      }], 0.05);

    return {
      blueAmbient, outerGlow, coreGlow, dustLane,
      white:  mkPt(200, 218, 255),
      cyan:   mkPt( 55, 215, 238),
      pink:   mkPt(228,  85, 175),
      yellow: mkPt(218, 196,  65),
    };
  }, []);

  const ADD = THREE.AdditiveBlending;
  const NRM = THREE.NormalBlending;

  // Bright point sources placed along the galactic band (group-local coords)
  const pts: Array<{ tex: THREE.CanvasTexture; pos: V3; sz: number }> = [
    { tex: tex.white,  pos: [-160,   5, -346], sz: 52 },
    { tex: tex.white,  pos: [  60,  10, -342], sz: 40 },
    { tex: tex.cyan,   pos: [-280,   3, -350], sz: 34 },
    { tex: tex.pink,   pos: [ 355,  -3, -344], sz: 30 },
    { tex: tex.yellow, pos: [-445,  -8, -336], sz: 24 },
    { tex: tex.white,  pos: [ 510,   3, -340], sz: 32 },
    { tex: tex.white,  pos: [ 205,   8, -338], sz: 26 },
    { tex: tex.white,  pos: [ -55,  12, -340], sz: 22 },
    { tex: tex.cyan,   pos: [ 420,   5, -344], sz: 20 },
    { tex: tex.white,  pos: [-370,   2, -348], sz: 28 },
  ];

  return (
    <group ref={groupRef}>
      {/* Deep-blue ambient fill — covers most of the galactic-centre hemisphere */}
      <mesh position={[0, -60, -390]} renderOrder={-75}>
        <planeGeometry args={[2200, 1400]} />
        <meshBasicMaterial map={tex.blueAmbient} transparent opacity={1.0}
          blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[-300, -40, -360]} rotation={[0, 0.15, 0]} renderOrder={-74}>
        <planeGeometry args={[1500, 900]} />
        <meshBasicMaterial map={tex.blueAmbient} transparent opacity={0.42}
          blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Wide pale blue-white galactic band outer glow */}
      <mesh position={[0, 0, -375]} renderOrder={-70}>
        <planeGeometry args={[2000, 420]} />
        <meshBasicMaterial map={tex.outerGlow} transparent opacity={1.0}
          blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -14, -358]} rotation={[0.03, 0, 0]} renderOrder={-69}>
        <planeGeometry args={[1800, 360]} />
        <meshBasicMaterial map={tex.outerGlow} transparent opacity={0.52}
          blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Warm cream/white galactic core glow */}
      <mesh position={[0, 5, -355]} renderOrder={-65}>
        <planeGeometry args={[1500, 360]} />
        <meshBasicMaterial map={tex.coreGlow} transparent opacity={1.0}
          blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Dark dust lane — NormalBlending so it blocks the emission light behind it */}
      <mesh position={[0, 14, -345]} renderOrder={-60}>
        <planeGeometry args={[1400, 340]} />
        <meshBasicMaterial map={tex.dustLane} transparent opacity={1.0}
          blending={NRM} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
      </mesh>

      {/* Bright nebula point sources along the band */}
      {pts.map((p, i) => (
        <mesh key={i} position={p.pos} renderOrder={-55}>
          <planeGeometry args={[p.sz, p.sz]} />
          <meshBasicMaterial map={p.tex} transparent opacity={1.0}
            blending={ADD} depthWrite={false} depthTest={false} side={THREE.DoubleSide} />
        </mesh>
      ))}
    </group>
  );
}
