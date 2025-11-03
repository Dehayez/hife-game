/**
 * ParticleCalculationConfig.js
 * 
 * Configuration for collision splash particle calculations.
 * Adjust these numbers to fine-tune particle effects.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * PARTICLE CALCULATION SETTINGS
 * ═══════════════════════════════════════════════════════════════════
 * 
 * All numbers here control how many particles are created and how far
 * they spread when projectiles/mortars collide with objects.
 */

/**
 * Bolt (Projectile) Particle Configuration
 */
export const BOLT_PARTICLES = {
  // Base values
  baseParticleCount: 12,          // Base number of particles
  baseSpreadRadius: 0.3,           // Base spread radius in units
  
  // Normalization bases (for scaling calculations)
  baseSize: 0.13,                  // Global base projectile size (from GlobalCharacterStats)
  baseSpeed: 10,                  // Global base projectile speed (from GlobalCharacterStats)
  
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

/**
 * Mortar Particle Configuration
 */
export const MORTAR_PARTICLES = {
  // Base values
  baseParticleCount: 20,           // Base number of particles (mortars are bigger)
  baseSpreadRadius: 0.5,           // Base spread radius in units
  
  // Normalization bases
  baseSize: 0.18,                  // Global base mortar size (from GlobalCharacterStats)
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

