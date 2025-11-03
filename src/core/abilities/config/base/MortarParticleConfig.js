/**
 * Base Mortar Particle Config
 * Configuration for mortar projectile particle effects
 */
export const MORTAR_PARTICLE_BASE = {
  // Ambient Particle Settings (particles around projectile sphere)
  ambient: {
    particleCount: 8,              // Base number for mortars (bigger, so more particles)
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
 * Collision Particle Config for Mortars
 * Configuration for collision splash particle calculations
 */
export const MORTAR_COLLISION_PARTICLES = {
  // Base values
  baseParticleCount: 20,           // Base number of particles (mortars are bigger)
  baseSpreadRadius: 0.5,           // Base spread radius in units
  
  // Normalization bases
  baseSize: 0.18,                  // Global base mortar size
  baseSpeed: 15,                   // Average mortar speed for normalization
  
  // Size scaling
  sizeExponent: 1.5,               // Exponential scaling for size
  sizeWeight: 0.5,                 // Weight of size in particle count (50%)
  
  // Speed scaling
  speedExponent: 1.2,              // Exponential scaling for speed
  speedWeight: 0.2,                // Weight of speed in particle count (20%)
  
  // Splash radius (unique to mortars)
  splashRadiusWeight: 0.15,        // Weight of splash radius in particle count (15%)
  splashRadiusBase: 0.9,           // Base splash radius for normalization
  
  // Other factors
  damageWeight: 0.05,              // Weight of damage in particle count (5%)
  forceWeight: 0.1,                // Weight of force in particle count (10%)
  forceMax: 40,                    // Maximum force value for normalization
  
  // Spread radius factors
  spreadSizeMultiplier: 3,         // How much size affects spread (0.12 size = 0.36 spread)
  spreadSpeedMultiplier: 0.5,      // How much speed affects spread (15 speed = 0.5 spread)
  spreadSplashMultiplier: 0.3,     // How much splash radius affects spread
  spreadForceMax: 0.15,            // Maximum force contribution to spread
  spreadForceDivisor: 40,          // Force divisor for spread calculation
  
  // Limits
  minParticleCount: 10,             // Minimum particles
  minSpreadRadius: 0.4,            // Minimum spread radius
  speedMultiplierMin: 0.5,         // Minimum speed multiplier
  speedMultiplierMax: 2.5          // Maximum speed multiplier
};

