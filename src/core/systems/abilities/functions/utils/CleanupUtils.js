/**
 * CleanupUtils.js
 * 
 * Utility functions for cleaning up THREE.js resources.
 * Ensures proper disposal of geometries, materials, and objects.
 */

/**
 * Dispose of geometry and material from a mesh
 * @param {THREE.Mesh} mesh - Mesh to cleanup
 */
export function disposeMesh(mesh) {
  if (!mesh) return;
  
  if (mesh.geometry) {
    mesh.geometry.dispose();
  }
  
  if (mesh.material) {
    // Handle both single materials and arrays
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach(material => disposeMaterial(material));
    } else {
      disposeMaterial(mesh.material);
    }
  }
}

/**
 * Dispose of a material
 * @param {THREE.Material} material - Material to cleanup
 */
export function disposeMaterial(material) {
  if (!material) return;
  
  // Dispose of textures
  if (material.map) material.map.dispose();
  if (material.normalMap) material.normalMap.dispose();
  if (material.emissiveMap) material.emissiveMap.dispose();
  if (material.alphaMap) material.alphaMap.dispose();
  
  material.dispose();
}

/**
 * Dispose of geometry and materials from multiple children
 * @param {THREE.Object3D} container - Container object with children
 */
export function disposeChildren(container) {
  if (!container || !container.children) return;
  
  container.children.forEach(child => {
    if (child.geometry) child.geometry.dispose();
    if (child.material) {
      if (Array.isArray(child.material)) {
        child.material.forEach(material => disposeMaterial(material));
      } else {
        disposeMaterial(child.material);
      }
    }
  });
}

/**
 * Remove object from scene and dispose resources
 * @param {THREE.Object3D} object - Object to remove
 * @param {THREE.Scene} scene - Scene to remove from
 */
export function removeFromScene(object, scene) {
  if (!object || !scene) return;
  
  // Dispose resources before removing
  if (object.geometry && object.material) {
    disposeMesh(object);
  } else if (object.children) {
    disposeChildren(object);
  }
  
  scene.remove(object);
}

