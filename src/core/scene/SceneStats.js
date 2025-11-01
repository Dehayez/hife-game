/**
 * SceneStats.js
 * 
 * Centralized configuration for all scene stats.
 * This file provides a clear view of every scene stat that can be edited.
 */

/**
 * Scene Configuration Stats
 * 
 * All stats related to scene setup, lighting, rendering, and arena elements.
 */
export const SCENE_STATS = {
  /**
   * Standard Arena Configuration
   */
  standard: {
    arenaSize: 20,
    cameraOffset: { x: 0, y: 6, z: 8 },
    fogDensity: 0.045,
    moonPosition: { x: -27, y: 2, z: -40 },
    moonSize: 1.5,
    moonGlowScale: 8,
    shadowCameraBounds: {
      left: -30,
      right: 30,
      top: 30,
      bottom: -30,
      far: 100
    },
    magicLightPositions: [
      { x: -8, y: 3, z: -8 },
      { x: 8, y: 3, z: 8 }
    ],
    magicLightRange: 15,
    centerLightRange: 12,
    moonLightPosition: { x: -27, y: 16, z: -40 }
  },
  
  /**
   * Large Arena Configuration
   */
  large: {
    arenaSize: 40,
    cameraOffset: { x: 0, y: 8, z: 10 },
    fogDensity: 0.03,
    moonPosition: { x: -50, y: 2, z: -60 },
    moonSize: 2,
    moonGlowScale: 12,
    shadowCameraBounds: {
      left: -50,
      right: 50,
      top: 50,
      bottom: -50,
      far: 150
    },
    magicLightPositions: [
      { x: -15, y: 3, z: -15 },
      { x: 15, y: 3, z: 15 }
    ],
    magicLightRange: 20,
    centerLightRange: 15,
    moonLightPosition: { x: -50, y: 20, z: -60 }
  },
  
  /**
   * Shared Scene Configuration
   */
  shared: {
    background: 0x0a1a1f,
    fogColor: 0x0a1a1f,
    cameraFov: 65,
    cameraNear: 0.1,
    cameraFar: 1000,
    hemisphereLightColor: 0x4a8a5f,
    hemisphereLightGroundColor: 0x1a1428,
    hemisphereLightIntensity: 0.6,
    moonLightColor: 0xaaccff,
    moonLightIntensity: 2,
    directionalLightColor: 0x7ab8a0,
    directionalLightIntensity: 0.4,
    magicLight1Color: 0x8a4fa8,
    magicLight1Intensity: 0.5,
    magicLight2Color: 0x4fa88a,
    magicLight2Intensity: 0.5,
    centerLightColor: 0xffcc44,
    centerLightIntensity: 0.3,
    shadowMapSize: 2048,
    shadowBias: -0.0001,
    shadowNormalBias: 0.02,
    shadowRadius: 4,
    shadowCameraNear: 0.1
  }
};

/**
 * Get scene stats for arena type
 * @param {string} arenaType - Arena type ('standard' or 'large')
 * @returns {Object} Scene stats configuration
 */
export function getSceneStats(arenaType) {
  return SCENE_STATS[arenaType] || SCENE_STATS.standard;
}

/**
 * Get shared scene stats
 * @returns {Object} Shared scene configuration
 */
export function getSharedSceneStats() {
  return SCENE_STATS.shared;
}

