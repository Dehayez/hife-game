/**
 * Base Bolt Particle Config
 * Configuration for bolt projectile particle effects
 */
export const BOLT_PARTICLE_BASE = {
  // Ambient Particle Settings (particles around projectile sphere)
  ambient: {
    particleCount: 6,              // Base number of ambient particles
    sizeMin: 0.03,                 // Minimum particle size
    sizeMax: 0.06,                  // Maximum particle size
    opacityMin: 0.5,                // Minimum opacity (0.0 - 1.0)
    opacityMax: 0.9,                // Maximum opacity (0.0 - 1.0)
    distanceMin: 0.8,               // Minimum distance from projectile (relative to projectile size)
    distanceMax: 1.2,               // Maximum distance from projectile (relative to projectile size)
    lifetimeMin: 0.4,               // Minimum lifetime in seconds
    lifetimeMax: 0.7,                // Maximum lifetime in seconds
    orbitSpeed: 0.02,               // Orbit rotation speed per frame
    outwardSpeedMin: 0.3,            // Minimum outward expansion speed
    outwardSpeedMax: 0.6,            // Maximum outward expansion speed
    rotationSpeedMin: 0.5,          // Minimum rotation speed around orbit
    rotationSpeedMax: 1.0            // Maximum rotation speed around orbit
  },
  
  // Trail Particle Settings (particles behind projectile while moving)
  trail: {
    spawnInterval: 0.03,            // Seconds between trail particle spawns (lower = more frequent)
    minVelocity: 0.1,                // Minimum velocity to spawn trail particles
    sizeMin: 0.04,                   // Minimum particle size
    sizeMax: 0.08,                   // Maximum particle size
    opacityMin: 0.6,                 // Minimum opacity (0.0 - 1.0)
    opacityMax: 0.9,                 // Maximum opacity (0.0 - 1.0)
    behindDistance: 0.8,             // Distance behind projectile (relative to projectile size)
    randomOffset: 0.3,               // Random offset amount (relative to projectile size)
    lifetimeMin: 0.2,                // Minimum lifetime in seconds
    lifetimeMax: 0.4,                // Maximum lifetime in seconds
    speedMin: 0.5,                   // Minimum speed
    speedMax: 1.0,                   // Maximum speed
    backwardDrift: 0.3,              // Backward drift factor (opposite of velocity)
    randomDirection: 0.5              // Random direction spread
  }
};

/**
 * Collision Particle Config for Bolts
 * Configuration for collision splash particle calculations
 */
export const BOLT_COLLISION_PARTICLES = {
  // Base values
  baseParticleCount: 12,          // Base number of particles
  baseSpreadRadius: 0.3,           // Base spread radius in units
  
  // Normalization bases (for scaling calculations)
  baseSize: 0.13,                  // Global base projectile size
  baseSpeed: 10,                  // Global base projectile speed
  
  // Size scaling
  sizeExponent: 1.5,               // Exponential scaling for size (higher = more dramatic difference)
  sizeWeight: 0.6,                 // Weight of size in particle count (60%)
  
  // Speed scaling
  speedExponent: 1.2,              // Exponential scaling for speed
  speedWeight: 0.25,               // Weight of speed in particle count (25%)
  
  // Other factors
  damageWeight: 0.05,              // Weight of damage in particle count (5%)
  forceWeight: 0.1,                // Weight of force/momentum in particle count (10%)
  forceMax: 40,                    // Maximum force value for normalization
  
  // Spread radius factors
  spreadSizeMultiplier: 4,         // How much size affects spread (0.08 size = 0.32 spread)
  spreadSpeedMultiplier: 0.6,      // How much speed affects spread (10 speed = 0.6 spread)
  spreadForceMax: 0.15,            // Maximum force contribution to spread
  spreadForceDivisor: 35,          // Force divisor for spread calculation
  
  // Limits
  minParticleCount: 6,             // Minimum particles (even for smallest projectiles)
  minSpreadRadius: 0.2,            // Minimum spread radius
  speedMultiplierMin: 0.5,         // Minimum speed multiplier (for slow projectiles)
  speedMultiplierMax: 2.5          // Maximum speed multiplier (for fast projectiles)
};

