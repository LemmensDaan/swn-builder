import * as THREE from 'three';

export function setupShadowFiltering(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.type = THREE.PCFShadowMap;
}

export function configureShadowLight(
  light: THREE.PointLight,
  systemRadius: number,
  mapSize: number,
): void {
  light.shadow.mapSize.set(mapSize, mapSize);
  // Tighten far to actual system size — this is the #1 factor for shadow precision.
  // Shadow texels spread over (far)³ volume; halving far gives 8x better density.
  light.shadow.camera.far = Math.max(systemRadius * 2.5, 80);
  light.shadow.camera.near = 0.1;
  light.shadow.camera.updateProjectionMatrix();
  light.shadow.bias = -0.001;
  light.shadow.normalBias = 0.05;
}
