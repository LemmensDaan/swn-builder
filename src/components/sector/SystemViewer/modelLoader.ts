import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

const modelCache = new Map<string, THREE.Group>();
const gltfLoader = new GLTFLoader();
const objLoader = new OBJLoader();

export async function loadModel(path: string): Promise<THREE.Group> {
  if (modelCache.has(path)) {
    return modelCache.get(path)!.clone();
  }

  try {
    let model: THREE.Group;

    if (path.endsWith('.glb') || path.endsWith('.gltf')) {
      const gltf = await gltfLoader.loadAsync(path);
      model = gltf.scene as THREE.Group;
    } else if (path.endsWith('.obj')) {
      model = (await objLoader.loadAsync(path)) as THREE.Group;
    } else {
      throw new Error(`Unsupported model format: ${path}`);
    }

    modelCache.set(path, model);
    return model.clone();
  } catch (err) {
    console.error(`Failed to load model: ${path}`, err);
    throw err;
  }
}
