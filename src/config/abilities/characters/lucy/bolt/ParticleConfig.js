/**
 * Lucy Bolt Particle Config
 * Lucy-specific bolt particle overrides with POISON effects
 */
export const LUCY_BOLT_PARTICLE_CONFIG = {
  ambient: {
    particleCount: 8,           // More particles for poison effect
    sizeMin: 0.04,               // Larger poison particles
    sizeMax: 0.08,               // Larger poison particles
    opacityMin: 0.5,             // Brighter for poison visibility
    opacityMax: 0.85,            // Brighter for poison visibility
    distanceMin: 0.85,           // Further out for poison cloud
    distanceMax: 1.3,            // Further out for poison cloud
    lifetimeMin: 0.5,            // Longer for lingering poison
    lifetimeMax: 0.8,            // Longer for lingering poison
    orbitSpeed: 0.03,            // Faster orbit for dynamic poison
    outwardSpeedMin: 0.25,       // Slower expansion for poison cloud
    outwardSpeedMax: 0.5,         // Slower expansion for poison cloud
    rotationSpeedMin: 0.4,       // Slower rotation for poison
    rotationSpeedMax: 0.8         // Slower rotation for poison
  },
  trail: {
    spawnInterval: 0.02,         // More frequent for continuous poison trail
    sizeMin: 0.05,               // Larger poison trail particles
    sizeMax: 0.1,                // Larger poison trail particles
    opacityMin: 0.6,             // Brighter for poison trail
    opacityMax: 0.9,             // Brighter for poison trail
    behindDistance: 1.0,         // Further behind for longer poison trail
    randomOffset: 0.4,           // More spread for poison
    lifetimeMin: 0.25,          // Longer for lingering poison trail
    lifetimeMax: 0.45,          // Longer for lingering poison trail
    speedMin: 0.4,              // Slower for poison trail
    speedMax: 0.9,               // Slower for poison trail
    backwardDrift: 0.25,        // Less drift for poison
    randomDirection: 0.6         // More spread for poison
  },
  // Poison-specific effects
  effectType: 'poison',          // Mark as poison effect
  poisonColors: {
    core: 0x00ff00,             // Bright green core
    mid: 0x88ff00,               // Yellow-green
    outer: 0x00ff88,             // Cyan-green
    toxic: 0x9c57b6              // Purple toxic (Lucy's color)
  }
};

