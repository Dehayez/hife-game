/**
 * VectorUtils.js
 * 
 * Utility functions for common vector math operations.
 * Reduces code duplication and improves readability.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Calculate distance between two 2D points (XZ plane)
 * @param {number} x1 - First point X
 * @param {number} z1 - First point Z
 * @param {number} x2 - Second point X
 * @param {number} z2 - Second point Z
 * @returns {number} Distance
 */
export function distance2D(x1, z1, x2, z2) {
  const dx = x2 - x1;
  const dz = z2 - z1;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * Calculate distance between two 3D points
 * @param {THREE.Vector3} pos1 - First position
 * @param {THREE.Vector3} pos2 - Second position
 * @returns {number} Distance
 */
export function distance3D(pos1, pos2) {
  const dx = pos2.x - pos1.x;
  const dy = pos2.y - pos1.y;
  const dz = pos2.z - pos1.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

/**
 * Normalize a 2D direction vector
 * @param {number} x - X component
 * @param {number} z - Z component
 * @param {number} minLength - Minimum length threshold (default: 0.001)
 * @returns {Object|null} Normalized vector {x, z} or null if too short
 */
export function normalize2D(x, z, minLength = 0.001) {
  const length = Math.sqrt(x * x + z * z);
  if (length < minLength) {
    return null;
  }
  return {
    x: x / length,
    z: z / length
  };
}

/**
 * Normalize a 3D direction vector
 * @param {THREE.Vector3} vector - Vector to normalize
 * @param {number} minLength - Minimum length threshold (default: 0.001)
 * @returns {THREE.Vector3|null} Normalized vector or null if too short
 */
export function normalize3D(vector, minLength = 0.001) {
  const length = vector.length();
  if (length < minLength) {
    return null;
  }
  return vector.clone().normalize();
}

/**
 * Calculate dot product of two 2D vectors
 * @param {number} x1 - First vector X
 * @param {number} z1 - First vector Z
 * @param {number} x2 - Second vector X
 * @param {number} z2 - Second vector Z
 * @returns {number} Dot product
 */
export function dot2D(x1, z1, x2, z2) {
  return x1 * x2 + z1 * z2;
}

/**
 * Calculate speed from velocity components
 * @param {number} vx - Velocity X
 * @param {number} vz - Velocity Z
 * @returns {number} Speed magnitude
 */
export function calculateSpeed2D(vx, vz) {
  return Math.sqrt(vx * vx + vz * vz);
}

/**
 * Calculate speed from 3D velocity components
 * @param {number} vx - Velocity X
 * @param {number} vy - Velocity Y
 * @param {number} vz - Velocity Z
 * @returns {number} Speed magnitude
 */
export function calculateSpeed3D(vx, vy, vz) {
  return Math.sqrt(vx * vx + vy * vy + vz * vz);
}

/**
 * Create a 2D direction vector from angle
 * @param {number} angle - Angle in radians
 * @returns {Object} Direction vector {x, z}
 */
export function directionFromAngle(angle) {
  return {
    x: Math.cos(angle),
    z: Math.sin(angle)
  };
}

/**
 * Create a random 2D direction vector
 * @returns {Object} Normalized direction vector {x, z}
 */
export function randomDirection2D() {
  const angle = Math.random() * Math.PI * 2;
  return directionFromAngle(angle);
}

