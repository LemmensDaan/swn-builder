import * as THREE from 'three';

export function setupShadowFiltering(renderer: THREE.WebGLRenderer): void {
  // VSMShadowMap stores depth in a color texture — no depth comparison sampling,
  // so it works identically on Firefox, Chrome, and Safari.
  // PCF variants rely on depth texture comparison filtering which is
  // implementation-defined in WebGL and silently broken on Firefox.
  renderer.shadowMap.type = THREE.VSMShadowMap;
}

export function configureShadowLight(light: THREE.PointLight): void {
  // VSMShadowMap doesn't use bias the same way PCF does.
  // radius controls the softness of the VSM blur pass.
  light.shadow.bias = 0;
  light.shadow.radius = 1;
}
