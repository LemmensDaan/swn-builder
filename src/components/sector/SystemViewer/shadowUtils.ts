import * as THREE from 'three';

export function setupShadowFiltering(renderer: THREE.WebGLRenderer): void {
  // VSMShadowMap: cross-browser compatible (Firefox safe), no depth comparison issues
  renderer.shadowMap.type = THREE.VSMShadowMap;
}

export function configureShadowLight(light: THREE.PointLight): void {
  light.shadow.bias = 0;
  // With 4096px, radius=0.5 gives clean shadows without aliasing
  light.shadow.radius = 0.5;
}
