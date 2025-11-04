/**
 * GeometryUtils.js
 * 
 * Utility functions for creating common THREE.js geometries and materials.
 * Reduces code duplication across projectile types.
 * Uses geometry pooling for optimization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getGeometryPool } from './GeometryPool.js';

/**
 * Create a sphere geometry with specified parameters
 * Uses geometry pool for optimization - geometries are reused instead of created/disposed
 * @param {number} radius - Sphere radius
 * @param {number} segments - Geometry segments (detail level)
 * @returns {THREE.SphereGeometry} Geometry from pool
 */
export function createSphereGeometry(radius, segments) {
  const pool = getGeometryPool();
  return pool.acquireSphere(radius, segments);
}

/**
 * Create a circle geometry with specified parameters
 * @param {number} radius - Circle radius
 * @param {number} segments - Geometry segments (detail level)
 * @returns {THREE.CircleGeometry} Created geometry
 */
export function createCircleGeometry(radius, segments) {
  return new THREE.CircleGeometry(radius, segments);
}

/**
 * Create a standard material with emissive properties
 * @param {Object} config - Material configuration
 * @param {number} config.color - Base color
 * @param {number} config.emissiveIntensity - Emissive intensity (0.0 - 1.0)
 * @param {number} config.metalness - Material metalness (0.0 - 1.0)
 * @param {number} config.roughness - Material roughness (0.0 - 1.0)
 * @param {boolean} config.transparent - Whether material is transparent
 * @param {number} config.opacity - Opacity (0.0 - 1.0)
 * @param {THREE.Texture} config.alphaMap - Optional alpha map texture
 * @param {number} config.side - Material side (THREE.FrontSide, DoubleSide, etc.)
 * @returns {THREE.MeshStandardMaterial} Created material
 */
export function createEmissiveMaterial(config) {
  const {
    color,
    emissiveIntensity = 0.9,
    metalness = 0.5,
    roughness = 0.5,
    transparent = false,
    opacity = 1.0,
    alphaMap = null,
    side = THREE.FrontSide
  } = config;

  return new THREE.MeshStandardMaterial({
    color: color,
    emissive: color,
    emissiveIntensity: emissiveIntensity,
    metalness: metalness,
    roughness: roughness,
    transparent: transparent,
    opacity: opacity,
    alphaMap: alphaMap,
    side: side
  });
}

/**
 * Create a projectile mesh with geometry and material
 * @param {Object} config - Mesh configuration
 * @param {THREE.Geometry} config.geometry - Geometry to use
 * @param {THREE.Material} config.material - Material to use
 * @param {THREE.Vector3} config.position - Initial position
 * @param {boolean} config.castShadow - Whether mesh casts shadows
 * @returns {THREE.Mesh} Created mesh
 */
export function createProjectileMesh(config) {
  const {
    geometry,
    material,
    position,
    castShadow = true
  } = config;

  const mesh = new THREE.Mesh(geometry, material);
  
  if (position) {
    mesh.position.copy(position);
  }
  
  mesh.castShadow = castShadow;
  
  return mesh;
}

