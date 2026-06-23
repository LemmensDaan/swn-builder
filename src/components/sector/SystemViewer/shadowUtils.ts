import * as THREE from 'three';

export function setupShadowFiltering(renderer: THREE.WebGLRenderer): void {
  renderer.shadowMap.type = THREE.PCFShadowMap;
}

export function configureShadowLight(light: THREE.PointLight): void {
  // Don't touch mapSize — it's set via JSX props at mount and can't be changed without
  // disposing the shadow map. Don't touch far — Three.js defaults to 500 which matches
  // the light's distance attribute, which is correct.
  light.shadow.bias = -0.001;
  light.shadow.normalBias = 0.02;
}
