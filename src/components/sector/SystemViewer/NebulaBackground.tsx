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
  edgeFade = 0.18,
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

  // Erase all 4 borders so the plane geometry never shows a hard rectangular edge.
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

  // Keep nebula centred on camera so it acts as background regardless of camera pan.
  // The group carries no rotation, so planes stay in fixed world directions.
  useFrame(({ camera }) => {
    groupRef.current?.position.copy(camera.position);
  });

  const layers = useMemo(() => {
    // ── Textures ──────────────────────────────────────────────────────────────

    // Wide blue/indigo ambient haze — fills the galactic-centre hemisphere
    const blueHaze = makeCloudTex(1024, 256, [
      { cx: 0.5,  cy: 0.5, rx: 0.70, ry: 1.20, stops: [[0, 'rgba(35,65,180,0.38)'], [1, 'rgba(10,18,80,0)']] },
      { cx: 0.25, cy: 0.5, rx: 0.40, ry: 0.90, stops: [[0, 'rgba(28,75,160,0.22)'], [1, 'rgba(10,18,80,0)']] },
      { cx: 0.75, cy: 0.5, rx: 0.38, ry: 0.90, stops: [[0, 'rgba(45,58,200,0.22)'], [1, 'rgba(10,18,80,0)']] },
    ]);

    // Main orange/yellow core glow — galactic centre brightness
    const coreGlow = makeCloudTex(1024, 512, [
      { cx: 0.50, cy: 0.55, rx: 0.55, ry: 0.42,
        stops: [[0, 'rgba(255,175,45,0.48)'], [0.5, 'rgba(255,95,18,0.16)'], [1, 'rgba(200,55,0,0)']] },
      { cx: 0.50, cy: 0.50, rx: 0.20, ry: 0.22,
        stops: [[0, 'rgba(255,248,205,0.92)'], [0.4, 'rgba(255,195,75,0.52)'], [1, 'rgba(255,115,18,0)']] },
      { cx: 0.28, cy: 0.52, rx: 0.28, ry: 0.22,
        stops: [[0, 'rgba(255,115,28,0.42)'], [1, 'rgba(200,48,5,0)']] },
      { cx: 0.73, cy: 0.50, rx: 0.30, ry: 0.20,
        stops: [[0, 'rgba(230,95,22,0.36)'], [1, 'rgba(175,38,5,0)']] },
    ]);

    // Deep red/crimson dense cloud
    const redCloud = makeCloudTex(512, 256, [
      { cx: 0.40, cy: 0.55, rx: 0.50, ry: 0.60,
        stops: [[0, 'rgba(155,28,8,0.58)'], [0.5, 'rgba(115,18,5,0.26)'], [1, 'rgba(75,8,0,0)']] },
      { cx: 0.68, cy: 0.38, rx: 0.38, ry: 0.50,
        stops: [[0, 'rgba(135,22,7,0.48)'], [1, 'rgba(75,8,0,0)']] },
      { cx: 0.20, cy: 0.40, rx: 0.22, ry: 0.35,
        stops: [[0, 'rgba(175,48,14,0.32)'], [1, 'rgba(75,8,0,0)']] },
    ]);

    // Dark absorption cloud — rendered with NormalBlending so it darkens emission behind it
    const darkCloud = makeCloudTex(512, 256, [
      { cx: 0.48, cy: 0.50, rx: 0.38, ry: 0.46,
        stops: [[0, 'rgba(3,1,7,0.82)'], [0.55, 'rgba(3,1,7,0.32)'], [1, 'rgba(3,1,7,0)']] },
      { cx: 0.70, cy: 0.37, rx: 0.28, ry: 0.35,
        stops: [[0, 'rgba(5,2,9,0.72)'], [1, 'rgba(3,1,7,0)']] },
      { cx: 0.22, cy: 0.60, rx: 0.20, ry: 0.28,
        stops: [[0, 'rgba(3,1,7,0.62)'], [1, 'rgba(3,1,7,0)']] },
    ]);

    // Purple/violet nebulosity on the flanks
    const purpleCloud = makeCloudTex(512, 512, [
      { cx: 0.50, cy: 0.50, rx: 0.55, ry: 0.50,
        stops: [[0, 'rgba(115,45,215,0.36)'], [0.5, 'rgba(75,28,155,0.16)'], [1, 'rgba(35,8,75,0)']] },
      { cx: 0.30, cy: 0.60, rx: 0.35, ry: 0.40,
        stops: [[0, 'rgba(95,38,185,0.26)'], [1, 'rgba(35,8,75,0)']] },
      { cx: 0.70, cy: 0.35, rx: 0.30, ry: 0.35,
        stops: [[0, 'rgba(135,55,195,0.22)'], [1, 'rgba(35,8,75,0)']] },
    ]);

    const ADD = THREE.AdditiveBlending;
    const NRM = THREE.NormalBlending;

    // ── Layer descriptors ─────────────────────────────────────────────────────
    // pos/rot are group-local (group follows camera world pos, no rotation copy).
    // Toward -Z = galactic centre direction; +Z = dark empty space.
    // renderOrder determines paint order when depthTest=false.
    return [
      // Wide blue haze — fills the galactic-centre hemisphere
      { tex: blueHaze,    pos: [   0, -48, -362] as V3, rot: [ 0.12,  0.00,  0.00] as V3, w: 720, h: 210, op: 1.0, bl: ADD, ro: -70 },
      { tex: blueHaze,    pos: [-210, -22, -302] as V3, rot: [ 0.05,  0.30, -0.05] as V3, w: 510, h: 165, op: 0.60, bl: ADD, ro: -69 },
      { tex: blueHaze,    pos: [ 210, -32, -302] as V3, rot: [ 0.05, -0.30,  0.05] as V3, w: 510, h: 165, op: 0.60, bl: ADD, ro: -68 },
      // Main orange/yellow core glow
      { tex: coreGlow,    pos: [   0, -12, -362] as V3, rot: [ 0.06,  0.00,  0.00] as V3, w: 630, h: 315, op: 1.0, bl: ADD, ro: -65 },
      // Deep red/crimson clouds
      { tex: redCloud,    pos: [  32,  26, -332] as V3, rot: [-0.06, -0.08,  0.10] as V3, w: 345, h: 202, op: 0.90, bl: ADD, ro: -60 },
      { tex: redCloud,    pos: [ -52,  12, -322] as V3, rot: [ 0.04,  0.12, -0.06] as V3, w: 285, h: 162, op: 0.72, bl: ADD, ro: -59 },
      // Dark absorption cloud — darkens the bright emission behind it
      { tex: darkCloud,   pos: [  16,  20, -328] as V3, rot: [ 0.03,  0.00,  0.05] as V3, w: 315, h: 178, op: 1.0, bl: NRM, ro: -55 },
      // Purple/violet flanks
      { tex: purpleCloud, pos: [-192, -16, -302] as V3, rot: [ 0.04,  0.22,  0.00] as V3, w: 285, h: 285, op: 0.75, bl: ADD, ro: -50 },
      { tex: purpleCloud, pos: [ 215, -22, -312] as V3, rot: [ 0.02, -0.18,  0.00] as V3, w: 265, h: 265, op: 0.65, bl: ADD, ro: -50 },
      // Wisp of purple drifting above the galactic plane
      { tex: purpleCloud, pos: [ -28,  92, -312] as V3, rot: [-0.26,  0.05,  0.03] as V3, w: 325, h: 162, op: 0.38, bl: ADD, ro: -49 },
    ];
  }, []);

  return (
    <group ref={groupRef}>
      {layers.map((l, i) => (
        <mesh key={i} position={l.pos} rotation={l.rot} renderOrder={l.ro}>
          <planeGeometry args={[l.w, l.h]} />
          <meshBasicMaterial
            map={l.tex}
            transparent
            opacity={l.op}
            blending={l.bl}
            depthWrite={false}
            depthTest={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}
