import * as THREE from 'three';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// @ts-ignore
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
// @ts-ignore
import { KTX2Loader } from 'three/examples/jsm/loaders/KTX2Loader.js';

interface CachedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const modelCache = new Map<string, CachedModel>();
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

/**
 * Call this once inside the Canvas (where useThree is available) to enable
 * KTX2/Basis Universal compressed texture support.
 *
 * Prerequisites:
 *   1. Copy the transcoder files from node_modules/three/examples/jsm/libs/ to public/libs/basis/:
 *        basis_transcoder.js
 *        basis_transcoder.wasm
 *   2. Convert your GLB textures with gltf-transform:
 *        npx @gltf-transform/cli etc1s  input.glb output.glb   (smaller, mobile-safe)
 *        npx @gltf-transform/cli uastc  input.glb output.glb   (higher quality)
 */
export function initModelLoader(renderer: THREE.WebGLRenderer): void {
  const ktx2Loader = new KTX2Loader()
    .setTranscoderPath('/libs/basis/')
    .detectSupport(renderer);
  gltfLoader.setKTX2Loader(ktx2Loader);
}

export async function loadModel(path: string): Promise<THREE.Group> {
  if (modelCache.has(path)) {
    const cached = modelCache.get(path)!;
    const clone = cached.scene.clone();
    (clone as any).animations = cached.animations;
    return clone;
  }

  try {
    let model: THREE.Group;
    let animations: THREE.AnimationClip[] = [];

    if (path.endsWith('.glb') || path.endsWith('.gltf')) {
      const gltf = await gltfLoader.loadAsync(path);
      model = gltf.scene as THREE.Group;
      animations = gltf.animations || [];
    } else if (path.endsWith('.obj')) {
      model = (await objLoader.loadAsync(path)) as THREE.Group;
    } else {
      throw new Error(`Unsupported model format: ${path}`);
    }

    modelCache.set(path, { scene: model, animations });
    const clone = model.clone();
    (clone as any).animations = animations;
    return clone;
  } catch (err) {
    console.error(`Failed to load model: ${path}`, err);
    throw err;
  }
}
