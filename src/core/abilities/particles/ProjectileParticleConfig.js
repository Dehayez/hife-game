/**
 * ProjectileParticleConfig.js
 * 
 * Configuration for projectile particle effects (ambient and trail particles).
 * Adjust these numbers to fine-tune particle effects for each ability and character.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * HOW TO EDIT PROJECTILE PARTICLE EFFECTS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * 1. GLOBAL BASE SETTINGS (affects all characters and abilities):
 *    Edit the values in PROJECTILE_PARTICLE_BASE below.
 *    These are base values that all characters inherit.
 * 
 * 2. CHARACTER-SPECIFIC OVERRIDES (affects one character):
 *    Edit values in PROJECTILE_PARTICLES.characterName (lucy/herald).
 *    Use multipliers (e.g., 0.5 = 50%, 1.5 = 150%) or direct overrides.
 * 
 * 3. ABILITY-SPECIFIC OVERRIDES (affects one ability for one character):
 *    Edit values in PROJECTILE_PARTICLES.characterName.abilityName (bolt/mortar).
 *    These override the character base settings for that specific ability.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * EXAMPLE:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * To make Lucy's bolt trail particles brighter:
 *   PROJECTILE_PARTICLES.lucy.bolt.trail.opacityMin = 0.8 (default is 0.6)
 * 
 * To make Herald's mortar have more ambient particles:
 *   PROJECTILE_PARTICLES.herald.mortar.ambient.particleCount = 12 (default is 8)
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Global Base Particle Settings
 * These are the base values that all characters inherit.
 */
export const PROJECTILE_PARTICLE_BASE = {
  // Ambient Particle Settings (particles around projectile sphere)
  ambient: {
    particleCount: 6,              // Base number of ambient particles (bolt default)
    particleCountMortar: 8,       // Base number for mortars (bigger, so more particles)
    
    // Size
    sizeMin: 0.03,                 // Minimum particle size
    sizeMax: 0.06,                  // Maximum particle size
    
    // Opacity
    opacityMin: 0.5,                // Minimum opacity (0.0 - 1.0)
    opacityMax: 0.9,                // Maximum opacity (0.0 - 1.0)
    
    // Positioning
    distanceMin: 0.8,               // Minimum distance from projectile (relative to projectile size)
    distanceMax: 1.2,               // Maximum distance from projectile (relative to projectile size)
    
    // Lifetime
    lifetimeMin: 0.4,               // Minimum lifetime in seconds
    lifetimeMax: 0.7,                // Maximum lifetime in seconds
    
    // Movement
    orbitSpeed: 0.02,               // Orbit rotation speed per frame
    outwardSpeedMin: 0.3,            // Minimum outward expansion speed
    outwardSpeedMax: 0.6,            // Maximum outward expansion speed
    rotationSpeedMin: 0.5,          // Minimum rotation speed around orbit
    rotationSpeedMax: 1.0            // Maximum rotation speed around orbit
  },
  
  // Trail Particle Settings (particles behind projectile while moving)
  trail: {
    // Spawning
    spawnInterval: 0.03,            // Seconds between trail particle spawns (lower = more frequent)
    minVelocity: 0.1,                // Minimum velocity to spawn trail particles
    
    // Size
    sizeMin: 0.04,                   // Minimum particle size
    sizeMax: 0.08,                   // Maximum particle size
    
    // Opacity
    opacityMin: 0.6,                 // Minimum opacity (0.0 - 1.0)
    opacityMax: 0.9,                 // Maximum opacity (0.0 - 1.0)
    
    // Positioning
    behindDistance: 0.8,             // Distance behind projectile (relative to projectile size)
    randomOffset: 0.3,               // Random offset amount (relative to projectile size)
    
    // Lifetime
    lifetimeMin: 0.2,                // Minimum lifetime in seconds
    lifetimeMax: 0.4,                // Maximum lifetime in seconds
    
    // Movement
    speedMin: 0.5,                   // Minimum speed
    speedMax: 1.0,                   // Maximum speed
    backwardDrift: 0.3,              // Backward drift factor (opposite of velocity)
    randomDirection: 0.5              // Random direction spread
  }
};

/**
 * Character and Ability Specific Particle Overrides
 * 
 * Structure:
 *   characterName (lucy/herald)
 *     → abilityName (bolt/mortar)
 *       → particleType (ambient/trail)
 *         → property: value
 * 
 * Use multipliers for percentage-based changes, or direct values for overrides.
 */
export const PROJECTILE_PARTICLES = {
  // Lucy's Particle Settings
  lucy: {
    // Lucy's Bolt Particles
    bolt: {
      ambient: {
        particleCount: 6,           // Same as base
        // sizeMin, sizeMax: use base
        opacityMin: 0.2,             // Slightly brighter (0.5 base)
        opacityMax: 0.4,             // Slightly brighter (0.9 base)
        // distanceMin, distanceMax: use base
        lifetimeMin: 0.3,            // Slightly shorter (0.4 base)
        lifetimeMax: 0.6,            // Slightly shorter (0.7 base)
        orbitSpeed: 0.025,            // Slightly faster orbit (0.02 base)
        // outwardSpeed, rotationSpeed: use base
      },
      trail: {
        spawnInterval: 0.025,         // More frequent (0.03 base) - faster projectiles
        // minVelocity: use base
        sizeMin: 0.015,               // Slightly smaller (0.04 base)
        sizeMax: 0.02,                // Slightly smaller (0.08 base)
        opacityMin: 0.7,             // Brighter (0.6 base)
        opacityMax: 0.95,             // Brighter (0.9 base)
        // behindDistance, randomOffset: use base
        lifetimeMin: 0.15,           // Shorter (0.2 base) - faster fade
        lifetimeMax: 0.35,           // Shorter (0.4 base) - faster fade
        speedMin: 0.6,               // Faster (0.5 base)
        speedMax: 1.2,               // Faster (1.0 base)
        // backwardDrift, randomDirection: use base
      }
    },
    
    // Lucy's Mortar Particles
    mortar: {
      ambient: {
        particleCount: 1,             // Slightly more than base (8 default for mortar)
        sizeMin: 0.04,                // Slightly larger (0.03 base)
        sizeMax: 0.07,                // Slightly larger (0.06 base)
        opacityMin: 0.55,            // Slightly brighter (0.5 base)
        opacityMax: 0.92,             // Slightly brighter (0.9 base)
        // distanceMin, distanceMax: use base
        lifetimeMin: 0.35,            // Slightly shorter (0.4 base)
        lifetimeMax: 0.65,            // Slightly shorter (0.7 base)
        orbitSpeed: 0.022,            // Slightly faster (0.02 base)
        // outwardSpeed, rotationSpeed: use base
      },
      trail: {
        spawnInterval: 0.028,         // Slightly more frequent (0.03 base)
        // minVelocity: use base
        sizeMin: 0.045,               // Slightly larger (0.04 base)
        sizeMax: 0.09,                // Slightly larger (0.08 base)
        opacityMin: 0.65,            // Slightly brighter (0.6 base)
        opacityMax: 0.93,             // Slightly brighter (0.9 base)
        // behindDistance, randomOffset: use base
        lifetimeMin: 0.18,           // Slightly shorter (0.2 base)
        lifetimeMax: 0.38,           // Slightly shorter (0.4 base)
        // speedMin, speedMax: use base
        // backwardDrift, randomDirection: use base
      }
    }
  },
  
  // Herald's Particle Settings
  herald: {
    // Herald's Bolt Particles
    bolt: {
      ambient: {
        particleCount: 7,            // More particles (6 base) - bigger projectile
        sizeMin: 0.04,                // Larger (0.03 base)
        sizeMax: 0.08,                // Larger (0.06 base)
        opacityMin: 0.45,             // Slightly dimmer (0.5 base) - more mystical
        opacityMax: 0.85,             // Slightly dimmer (0.9 base)
        distanceMin: 0.9,             // Further out (0.8 base) - bigger projectile
        distanceMax: 1.4,             // Further out (1.2 base)
        lifetimeMin: 0.5,             // Longer (0.4 base)
        lifetimeMax: 0.8,             // Longer (0.7 base)
        orbitSpeed: 0.018,            // Slower orbit (0.02 base) - more majestic
        outwardSpeedMin: 0.2,        // Slower expansion (0.3 base)
        outwardSpeedMax: 0.5,         // Slower expansion (0.6 base)
        rotationSpeedMin: 0.4,        // Slower rotation (0.5 base)
        rotationSpeedMax: 0.8          // Slower rotation (1.0 base)
      },
      trail: {
        spawnInterval: 0.035,         // Less frequent (0.03 base) - slower projectile
        // minVelocity: use base
        sizeMin: 0.05,                // Larger (0.04 base)
        sizeMax: 0.1,                  // Larger (0.08 base)
        opacityMin: 0.5,              // Dimmer (0.6 base) - more mystical
        opacityMax: 0.85,             // Dimmer (0.9 base)
        behindDistance: 1.0,          // Further behind (0.8 base)
        randomOffset: 0.4,             // More spread (0.3 base)
        lifetimeMin: 0.25,            // Longer (0.2 base)
        lifetimeMax: 0.45,            // Longer (0.4 base)
        speedMin: 0.4,                // Slower (0.5 base)
        speedMax: 0.9,                 // Slower (1.0 base)
        backwardDrift: 0.25,          // Less drift (0.3 base)
        randomDirection: 0.6          // More spread (0.5 base)
      }
    },
    
    // Herald's Mortar Particles
    mortar: {
      ambient: {
        particleCount: 5,            // More particles (8 base) - bigger mortar
        sizeMin: 0.05,                // Larger (0.03 base)
        sizeMax: 0.09,                // Larger (0.06 base)
        opacityMin: 0.3,              // Same as bolt (0.5 base)
        opacityMax: 0.6,              // Slightly brighter (0.9 base)
        distanceMin: 0.95,            // Further out (0.8 base)
        distanceMax: 1.5,             // Further out (1.2 base)
        lifetimeMin: 0.45,            // Longer (0.4 base)
        lifetimeMax: 0.75,             // Longer (0.7 base)
        orbitSpeed: 0.016,            // Slower orbit (0.02 base)
        outwardSpeedMin: 0.25,        // Slower expansion (0.3 base)
        outwardSpeedMax: 0.55,         // Slower expansion (0.6 base)
        rotationSpeedMin: 0.45,        // Slightly faster rotation (0.5 base)
        rotationSpeedMax: 0.85          // Slower rotation (1.0 base)
      },
      trail: {
        spawnInterval: 0.04,           // Less frequent (0.03 base) - arc trajectory
        // minVelocity: use base
        sizeMin: 0.06,                // Larger (0.04 base)
        sizeMax: 0.12,                 // Larger (0.08 base)
        opacityMin: 0.55,             // Slightly brighter (0.6 base)
        opacityMax: 0.9,               // Same (0.9 base)
        behindDistance: 1.2,           // Further behind (0.8 base) - bigger mortar
        randomOffset: 0.5,             // More spread (0.3 base)
        lifetimeMin: 0.22,            // Slightly longer (0.2 base)
        lifetimeMax: 0.42,            // Slightly longer (0.4 base)
        speedMin: 0.45,               // Slightly slower (0.5 base)
        speedMax: 0.95,                // Slightly slower (1.0 base)
        backwardDrift: 0.28,          // Slightly less drift (0.3 base)
        randomDirection: 0.55          // Slightly more spread (0.5 base)
      }
    }
  }
};

/**
 * Get projectile particle config for a character and ability
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {string} abilityName - Ability name ('bolt' or 'mortar')
 * @param {string} particleType - Particle type ('ambient' or 'trail')
 * @returns {Object} Merged particle configuration
 */
export function getProjectileParticleConfig(characterName, abilityName, particleType) {
  const base = PROJECTILE_PARTICLE_BASE[particleType];
  const character = PROJECTILE_PARTICLES[characterName];
  
  if (!character || !base) {
    return base || {};
  }
  
  const ability = character[abilityName];
  if (!ability || !ability[particleType]) {
    return base;
  }
  
  // Merge base with character-specific and ability-specific overrides
  const override = ability[particleType];
  const merged = { ...base };
  
  // Apply overrides
  for (const key in override) {
    if (override[key] !== undefined) {
      merged[key] = override[key];
    }
  }
  
  // Special handling for ambient particle count (use mortar count for mortars)
  if (particleType === 'ambient' && abilityName === 'mortar' && !override.particleCount) {
    merged.particleCount = merged.particleCountMortar || merged.particleCount;
  }
  
  return merged;
}

