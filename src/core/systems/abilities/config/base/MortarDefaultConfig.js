/**
 * MortarDefaultConfig.js
 * 
 * Default mortar configuration derived from base mortar attack config.
 * This provides runtime defaults for mortar creation.
 */

import { MORTAR_ATTACK_CONFIG } from './MortarAttackConfig.js';

/**
 * Default mortar creation configuration
 * These are the default behaviors - can be overridden per character
 */
export const DEFAULT_MORTAR_CONFIG = {
  // Visual settings (from config)
  geometrySegments: MORTAR_ATTACK_CONFIG.visual.geometrySegments,
  emissiveIntensity: MORTAR_ATTACK_CONFIG.visual.emissiveIntensity,
  metalness: MORTAR_ATTACK_CONFIG.visual.metalness,
  roughness: MORTAR_ATTACK_CONFIG.visual.roughness,
  trailLightIntensity: MORTAR_ATTACK_CONFIG.trailLight.intensity,
  trailLightRange: MORTAR_ATTACK_CONFIG.trailLight.range,
  
  // Movement
  rotationSpeed: MORTAR_ATTACK_CONFIG.visual.rotationSpeed,
};

/**
 * Global mortar physics constants (imported from config)
 */
export const MORTAR_GRAVITY = MORTAR_ATTACK_CONFIG.physics.gravity;
export const MORTAR_LIFETIME = MORTAR_ATTACK_CONFIG.physics.lifetime;
export const EXPLOSION_RADIUS = MORTAR_ATTACK_CONFIG.physics.explosionRadius;
export const DIRECT_HIT_RADIUS = MORTAR_ATTACK_CONFIG.physics.directHitRadius;

