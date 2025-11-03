/**
 * Base Melee Attack Config
 * General ability settings that apply to melee and other abilities
 */
export const GENERAL_ABILITY_CONFIG = {
  // Minimum distance thresholds
  minDistance: {
    directionLength: 0.001,           // Minimum direction vector length
    targetDistance: 0.01,             // Minimum target distance for calculations
    projectileDistance: 0.01,         // Minimum projectile distance for calculations
  },
  
  // Geometry detail levels
  geometry: {
    boltSegments: 8,                  // Bolt geometry segments
    mortarSegments: 12,               // Mortar geometry segments
    splashAreaSegments: 32,            // Splash area circle segments
  },
};

