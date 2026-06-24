import * as THREE from 'three';
// @ts-ignore - three loaders are available at runtime
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// @ts-ignore - three loaders are available at runtime
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

interface CachedModel {
  scene: THREE.Group;
  animations: THREE.AnimationClip[];
}

const modelCache = new Map<string, CachedModel>();
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

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
