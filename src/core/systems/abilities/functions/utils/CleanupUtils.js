/**
 * CleanupUtils.js
 * 
 * Utility functions for cleaning up THREE.js resources.
 * Ensures proper disposal of geometries, materials, and objects.
 * Uses geometry pooling for optimization - returns geometries to pool instead of disposing.
 */

import { getGeometryPool } from './GeometryPool.js';

/**
 * Dispose of geometry and material from a mesh
 * Returns sphere geometries to pool instead of disposing them
 * @param {THREE.Mesh} mesh - Mesh to cleanup
 */
export function disposeMesh(mesh) {
  if (!mesh) return;
  
  if (mesh.geometry) {
    // Check if this is a pooled geometry (Sphere, Octahedron, or Cone)
    // Use type check as optimization, but pool will handle disposal if not found
    const geometryType = mesh.geometry.type;
    if (geometryType === 'SphereGeometry' || 
        geometryType === 'OctahedronGeometry' || 
        geometryType === 'ConeGeometry') {
      // Return to pool instead of disposing
      const pool = getGeometryPool();
      pool.releaseFromMesh(mesh, 1);
    } else {
      // For other geometry types, dispose normally
      mesh.geometry.dispose();
    }
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
 * Returns sphere geometries to pool instead of disposing them
 * @param {THREE.Object3D} container - Container object with children
 */
export function disposeChildren(container) {
  if (!container || !container.children) return;
  
  const pool = getGeometryPool();
  
  container.children.forEach(child => {
    if (child.geometry) {
      // Check if this is a pooled geometry (Sphere, Octahedron, or Cone)
      // Use type check as optimization, but pool will handle disposal if not found
      const geometryType = child.geometry.type;
      if (geometryType === 'SphereGeometry' || 
          geometryType === 'OctahedronGeometry' || 
          geometryType === 'ConeGeometry') {
        // Return to pool instead of disposing
        pool.releaseFromMesh(child, 1);
      } else {
        // For other geometry types, dispose normally
        child.geometry.dispose();
      }
    }
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

