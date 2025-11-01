/**
 * EntityStats.js
 * 
 * Centralized configuration for all entity stats.
 * This file provides a clear view of every entity stat that can be edited.
 */

/**
 * Entity Configuration Stats
 * 
 * All stats related to collectibles, hazards, checkpoints, and effects.
 */
export const ENTITY_STATS = {
  /**
   * Collectible (Gem) Configuration
   */
  collectible: {
    size: 0.18,               // Gem size (OctahedronGeometry radius)
    height: 1.2,               // Gem height above ground
    color: 0xcc4444,          // Red gem color
    emissiveIntensity: 0.7,   // Glow intensity
    metalness: 0.6,           // Material metalness
    roughness: 0.2,           // Material roughness
    opacity: 0.9,             // Material opacity
    lightIntensity: 0.8,      // Point light intensity
    lightRange: 5,            // Point light range
    lightDecay: 1,            // Point light decay (linear)
    fadeOutDuration: 0.3      // Fade out duration when collected (seconds)
  },
  
  /**
   * Hazard (Thorn) Configuration
   */
  hazard: {
    defaultSize: 0.5,         // Default hazard size
    sizeVariation: 0.3,       // Size variation range
    mainBodySize: 0.6,        // Main body size multiplier
    mainBodyHeight: 0.5,      // Main body height
    spikeCount: 6,            // Number of spikes around base
    spikeSize: 0.15,          // Spike size multiplier
    spikeHeight: 0.3,         // Spike height
    mainColor: 0x2a1a3a,      // Main body color (dark purple/black)
    mainEmissive: 0x4a1a5a,   // Main body emissive color
    mainEmissiveIntensity: 0.8, // Main body emissive intensity
    spikeColor: 0x3a1a4a,     // Spike color
    spikeEmissive: 0x5a1a6a,  // Spike emissive color
    spikeEmissiveIntensity: 0.6, // Spike emissive intensity
    metalness: 0.1,           // Material metalness
    roughness: 0.9,           // Material roughness
    minSpeed: 2,              // Minimum movement speed (units/sec)
    maxSpeed: 4,              // Maximum movement speed (units/sec)
    directionChangeMin: 1,    // Minimum seconds between direction changes
    directionChangeMax: 3    // Maximum seconds between direction changes
  },
  
  /**
   * Checkpoint (Shrine) Configuration
   */
  checkpoint: {
    pillarRadiusTop: 0.25,    // Pillar top radius
    pillarRadiusBottom: 0.3,  // Pillar bottom radius
    pillarHeight: 1.5,        // Pillar height
    pillarSegments: 8,        // Pillar cylinder segments
    pillarColor: 0x3a4a4a,    // Pillar color
    pillarEmissive: 0x2a3a3a, // Pillar emissive color
    pillarEmissiveIntensity: 0.2, // Pillar emissive intensity
    pillarMetalness: 0.3,     // Pillar metalness
    pillarRoughness: 0.8,     // Pillar roughness
    crystalSize: 0.35,        // Crystal size
    crystalDetail: 1,         // Crystal detail level
    crystalColor: 0xffcc44,   // Crystal color (main color)
    crystalEmissive: 0x4a8a7a, // Crystal emissive color
    crystalEmissiveIntensity: 0.6, // Crystal emissive intensity
    crystalMetalness: 0.7,    // Crystal metalness
    crystalRoughness: 0.2,    // Crystal roughness
    crystalOpacity: 0.85,     // Crystal opacity
    ringRadius: 0.4,          // Ring major radius
    ringTube: 0.05,           // Ring tube radius
    ringSegments: 8,          // Ring radial segments
    ringTubularSegments: 16,  // Ring tubular segments
    ringColor: 0xffcc44,      // Ring color
    ringEmissive: 0x4a8a7a,   // Ring emissive color
    ringEmissiveIntensity: 0.5, // Ring emissive intensity
    ringMetalness: 0.6,      // Ring metalness
    ringRoughness: 0.3,      // Ring roughness
    lightColor: 0xffcc44,    // Glow light color
    lightIntensity: 0.6,      // Glow light intensity
    lightRange: 3,            // Glow light range
    lightHeight: 2,           // Glow light height
    activatedCrystalColor: 0x8aefcf,  // Activated crystal color
    activatedCrystalEmissive: 0xffcc44, // Activated crystal emissive color
    activatedCrystalEmissiveIntensity: 1.0, // Activated crystal emissive intensity
    activatedRingColor: 0x8aefcf,    // Activated ring color
    activatedRingEmissive: 0xffcc44,  // Activated ring emissive color
    activatedRingEmissiveIntensity: 0.8, // Activated ring emissive intensity
    activatedLightColor: 0x8aefcf,   // Activated light color
    activatedLightIntensity: 1.0      // Activated light intensity
  },
  
  /**
   * Confetti Effect Configuration
   */
  confetti: {
    particleCount: 30,        // Number of confetti particles
    particleSize: 0.1,        // Particle size
    spread: 2.0,               // Spread radius
    minLifetime: 0.5,          // Minimum particle lifetime
    maxLifetime: 1.5,          // Maximum particle lifetime
    minVelocity: 1.0,          // Minimum upward velocity
    maxVelocity: 3.0,          // Maximum upward velocity
    color: 0xcc4444           // Confetti color (red like gem)
  },
  
  /**
   * Spawn Configuration
   */
  spawn: {
    minDistance: 1.5,         // Minimum distance from spawn center
    collectionCount: 8,       // Default collectibles for collection mode
    survivalCount: 10,        // Default hazards for survival mode
    timeTrialCount: 5,        // Default checkpoints for time trial mode
    largeArenaMultiplier: {
      collection: 3,          // Multiply collectibles for large arena
      survival: 2,           // Multiply hazards for large arena
      timeTrial: 2            // Multiply checkpoints for large arena
    }
  }
};

/**
 * Get collectible stats
 * @returns {Object} Collectible configuration
 */
export function getCollectibleStats() {
  return ENTITY_STATS.collectible;
}

/**
 * Get hazard stats
 * @returns {Object} Hazard configuration
 */
export function getHazardStats() {
  return ENTITY_STATS.hazard;
}

/**
 * Get checkpoint stats
 * @returns {Object} Checkpoint configuration
 */
export function getCheckpointStats() {
  return ENTITY_STATS.checkpoint;
}

/**
 * Get confetti stats
 * @returns {Object} Confetti configuration
 */
export function getConfettiStats() {
  return ENTITY_STATS.confetti;
}

/**
 * Get spawn stats
 * @returns {Object} Spawn configuration
 */
export function getSpawnStats() {
  return ENTITY_STATS.spawn;
}

