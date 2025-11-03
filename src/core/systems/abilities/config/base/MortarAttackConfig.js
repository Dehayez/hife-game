/**
 * Base Mortar Attack Config
 * Controls visual appearance, physics, and behavior of mortar projectiles
 */
export const MORTAR_ATTACK_CONFIG = {
  // Physics Constants
  physics: {
    gravity: -20,                     // Gravity for arc trajectory
    lifetime: 5,                      // Maximum lifetime in seconds
    explosionRadius: 2.0,            // Explosion radius for mid-air detection
    directHitRadius: 0.8,            // Additional radius for direct hit damage
    nearTargetDistance: 1.0,          // Distance threshold for "near target" check
    closeToGroundDistance: 0.5,      // Distance threshold for "close to ground" check
  },
  
  // Visual Settings (defaults - can be overridden per character)
  visual: {
    geometrySegments: 12,             // Geometry detail level
    emissiveIntensity: 0.8,            // Base emissive intensity
    metalness: 0.3,                   // Material metalness
    roughness: 0.2,                   // Material roughness
    rotationSpeed: 3,                 // Rotation speed per second
  },
  
  // Trail Light Settings (defaults - can be overridden per character)
  trailLight: {
    intensity: 1.2,                   // Base trail light intensity
    range: 4,                         // Base trail light range
  },
  
  // Arc Preview Settings (visual preview of mortar trajectory)
  arcPreview: {
    tubeRadius: 0.08,                // Thickness of the arc preview tube
    color: 0xffffff,                  // White color
    opacity: 0.05,                    // Arc preview opacity
    points: 60,                       // Number of points for smoother curve
    tubeSegments: 8,                  // Number of radial segments in tube geometry
  },
};

/**
 * Splash Area Configuration
 * Controls visual appearance, particle effects, and behavior of splash areas
 */
export const SPLASH_AREA_CONFIG = {
  // Visual Settings
  visual: {
    geometrySegments: 32,             // Circle geometry segments
    emissiveIntensity: 1.0,           // Splash base emissive intensity
    metalness: 0.1,                   // Material metalness
    roughness: 0.9,                   // Material roughness
    opacityTextureSize: 256,          // Canvas texture size for opacity gradient
    groundOffset: 0.05,               // Height above ground
    lightHeightOffset: 0.3,           // Light height above ground
  },
  
  // Light Settings
  light: {
    lucyIntensity: 2.0,               // Splash light intensity for Lucy
    heraldIntensity: 3.5,             // Splash light intensity for Herald
    lucyRangeMultiplier: 2,           // Light range multiplier for Lucy (splashRadius * multiplier)
    heraldRangeMultiplier: 3,         // Light range multiplier for Herald (splashRadius * multiplier)
  },
  
  // Animation Timing
  timing: {
    expandDuration: 0.2,              // Fast expansion animation duration (seconds)
    // shrinkDelay and shrinkDuration come from character stats
  },
  
  // Particle System Settings
  particles: {
    count: 20,                        // Number of splash particles
    spawnHeight: 0.1,                 // Initial height above splash base
    sizeMultiplier: 0.15,             // Particle size relative to splash radius
    
    // Particle Velocity
    horizontalDrift: 0.2,             // Horizontal drift velocity range
    upwardVelocityMin: 0.3,            // Minimum upward velocity
    upwardVelocityMax: 0.5,            // Maximum upward velocity
    
    // Particle Lifetime
    lifetimeMin: 0.8,                 // Minimum particle lifetime (seconds)
    lifetimeMax: 1.4,                 // Maximum particle lifetime (seconds)
    
    // Particle Behavior
    turbulence: 0.05,                 // Turbulence amount for wiggle effect
    airResistance: 0.3,               // Air resistance multiplier (velocity reduction per second)
    maxHeight: 1.5,                   // Maximum height for particle fade-out
    recycleThreshold: 0.3,            // Time before removal to stop recycling particles
    
    // Particle Opacity
    baseOpacity: 0.9,                 // Base particle opacity
    shrinkPhaseMultiplier: 0.5,       // Additional fade during shrink phase
    finalFadeDuration: 0.3,          // Final fade duration before removal
  },
  
  // Damage Tick Settings
  damage: {
    ticksPerSecond: 5,                // Damage ticks per second (1 / tickInterval)
  },
};

