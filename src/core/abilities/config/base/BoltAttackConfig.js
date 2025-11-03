/**
 * Base Bolt Attack Config
 * Controls visual appearance, physics, and behavior of bolt projectiles
 */
export const BOLT_ATTACK_CONFIG = {
  // Visual Settings
  visual: {
    geometrySegments: 8,              // Geometry detail level
    emissiveIntensity: 0.9,           // Emissive glow intensity (0.0 - 1.0)
    metalness: 0.7,                   // Material metalness (0.0 - 1.0)
    roughness: 0.2,                   // Material roughness (0.0 - 1.0)
    rotationSpeed: 5,                 // Rotation speed per second
  },
  
  // Trail Light Settings
  trailLight: {
    intensity: 7,                   // Trail light intensity
    range: 4,                         // Trail light range (distance)
  },
  
  // Physics & Behavior
  physics: {
    heraldAccelerationMultiplier: 1.5, // Herald's max speed multiplier (beyond maxSpeed)
    // Herald starts at minSpeed and accelerates up to maxSpeed * multiplier
    // Lucy starts at maxSpeed and decelerates to minSpeed
  },
  
  // Cursor Following Behavior
  cursorFollow: {
    targetDistance: 20,               // Distance ahead for joystick aiming
    maxCursorDistance: 20,            // Maximum cursor distance for speed calculation
    followSpeedMultiplier: 5,          // How fast cursor following responds (higher = faster)
  },
  
  // Fallback Arena Bounds (if collision manager unavailable)
  fallbackArena: {
    halfSize: 15,                     // Half arena size for bounds checking
  },
};

