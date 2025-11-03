/**
 * LightUtils.js
 * 
 * Utility functions for creating trail lights and other lighting effects.
 * Reduces code duplication across projectile types.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Create a point light for projectile trails
 * @param {Object} config - Light configuration
 * @param {number} config.color - Light color
 * @param {number} config.intensity - Light intensity
 * @param {number} config.range - Light range (distance)
 * @param {THREE.Vector3} config.position - Initial position
 * @returns {THREE.PointLight} Created point light
 */
export function createTrailLight(config) {
  const {
    color,
    intensity,
    range,
    position
  } = config;

  const light = new THREE.PointLight(color, intensity, range);
  
  if (position) {
    light.position.copy(position);
  }
  
  return light;
}

/**
 * Update trail light position to follow projectile
 * @param {THREE.PointLight} light - Trail light
 * @param {THREE.Vector3} position - Position to follow
 */
export function updateTrailLightPosition(light, position) {
  if (light && position) {
    light.position.copy(position);
  }
}

