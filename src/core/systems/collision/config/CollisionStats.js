/**
 * CollisionStats.js
 * 
 * Centralized configuration for all collision stats.
 * This file provides a clear view of every collision stat that can be edited.
 */

/**
 * Collision Configuration Stats
 * 
 * All stats related to walls, respawn system, and collision detection.
 */
export const COLLISION_STATS = {
  /**
   * Wall Configuration
   */
  wall: {
    margin: 0.2,               // Margin from arena edge
    height: 1.2,               // Wall height
    perimeterColor: 0x1a3008,  // Darker forest green color for perimeter
    innerWallColor: 0x808080,   // Light grey color for inner walls
    wallMargin: 0.2            // Margin for walls
  },
  
  /**
   * Standard Arena Inner Wall Positions
   */
  standardInnerWalls: [
    { x: -4, z: -2, w: 6, h: 0.4 },
    { x: 3, z: 3, w: 0.4, h: 6 },
    { x: -2, z: 5, w: 4, h: 0.4 }
  ],
  
  /**
   * Large Arena Obstacle Configuration
   */
  largeArenaObstacles: [
    // Corridor-style walls forming passageways
    { x: -12, z: -8, w: 2, h: 0.4, type: 'horizontal', color: 0x808080 },
    { x: -8, z: -12, w: 0.4, h: 2, type: 'vertical', color: 0x808080 },
    { x: 8, z: 12, w: 2, h: 0.4, type: 'horizontal', color: 0x808080 },
    { x: 12, z: 8, w: 0.4, h: 2, type: 'vertical', color: 0x808080 },
    
    // Central maze-like structures
    { x: 0, z: 8, w: 4, h: 0.4, type: 'horizontal', color: 0x6a6a6a },
    { x: 0, z: -8, w: 4, h: 0.4, type: 'horizontal', color: 0x6a6a6a },
    { x: 8, z: 0, w: 0.4, h: 4, type: 'vertical', color: 0x6a6a6a },
    { x: -8, z: 0, w: 0.4, h: 4, type: 'vertical', color: 0x6a6a6a },
    
    // Elevated platforms
    { x: -12, z: -12, w: 1.5, h: 0.4, type: 'horizontal', color: 0x4a6a4a, height: 2.4 },
    { x: 12, z: 12, w: 1.5, h: 0.4, type: 'horizontal', color: 0x4a6a4a, height: 2.4 },
    { x: -12, z: 12, w: 1.5, h: 0.4, type: 'horizontal', color: 0x4a6a4a, height: 2.4 },
    { x: 12, z: -12, w: 1.5, h: 0.4, type: 'horizontal', color: 0x4a6a4a, height: 2.4 },
    
    // Scattered pillars and blocks
    { x: -6, z: -6, w: 1, h: 1, type: 'square', color: 0x6a6a6a },
    { x: 6, z: 6, w: 1, h: 1, type: 'square', color: 0x6a6a6a },
    { x: -6, z: 6, w: 1, h: 1, type: 'square', color: 0x6a6a6a },
    { x: 6, z: -6, w: 1, h: 1, type: 'square', color: 0x6a6a6a },
    
    // Platforms in corner areas
    { x: -15, z: -15, w: 0.4, h: 2, type: 'vertical', color: 0x4a6a4a },
    { x: 15, z: -15, w: 0.4, h: 2, type: 'vertical', color: 0x4a6a4a },
    { x: 0, z: -16, w: 6, h: 0.4, type: 'horizontal', color: 0x4a6a4a },
    
    // Side platforms
    { x: 15, z: 0, w: 0.4, h: 3, type: 'vertical', color: 0x6a6a6a },
    { x: -15, z: 0, w: 0.4, h: 3, type: 'vertical', color: 0x6a6a6a },
    
    // Bridge-like structures
    { x: -4, z: -4, w: 4, h: 0.6, type: 'bridge', color: 0x808080 },
    { x: 4, z: 4, w: 4, h: 0.6, type: 'bridge', color: 0x808080 },
    
    // Narrow passage areas (creating fun run challenges)
    { x: 0, z: -16, w: 0.6, h: 0.6, type: 'pillar', color: 0x6a6a6a },
    { x: 0, z: 16, w: 0.6, h: 0.6, type: 'pillar', color: 0x6a6a6a },
    { x: -16, z: 0, w: 0.6, h: 0.6, type: 'pillar', color: 0x6a6a6a },
    { x: 16, z: 0, w: 0.6, h: 0.6, type: 'pillar', color: 0x6a6a6a }
  ],
  
  /**
   * Large Arena Obstacle Colors
   */
  largeArenaColors: {
    lightGrey: 0x808080,
    stoneColor: 0x6a6a6a,
    mossColor: 0x4a6a4a
  },
  
  /**
   * Large Arena Additional Configuration
   */
  largeArena: {
    survivalWallHeight: 5.0,   // Extended collision box height in survival mode
    arenaMargin: 0.6,            // Margin for position constraining
    groundCheckHeight: 5         // Height to check for obstacles (for ground height)
  },
  
  /**
   * Respawn System Configuration
   */
  respawn: {
    respawnTime: 3,            // Respawn countdown in seconds
    fallThreshold: -5,         // Y position threshold for falling outside
    checkInterval: 0.1         // How often to check for falling (seconds)
  },
  
  /**
   * Ground Configuration
   */
  ground: {
    defaultHeight: 0,          // Default ground height
    tolerance: 0.01            // Tolerance for ground height checks
  }
};

/**
 * Get collision wall stats
 * @returns {Object} Wall configuration
 */
export function getWallStats() {
  return COLLISION_STATS.wall;
}

/**
 * Get inner wall positions for arena type
 * @param {string} arenaType - Arena type ('standard' or 'large')
 * @returns {Array<Object>} Array of wall position objects
 */
export function getInnerWallPositions(arenaType) {
  return COLLISION_STATS.standardInnerWalls;
}

/**
 * Get large arena obstacles
 * @returns {Array<Object>} Array of obstacle configuration objects
 */
export function getLargeArenaObstacles() {
  return COLLISION_STATS.largeArenaObstacles;
}

/**
 * Get large arena colors
 * @returns {Object} Color configuration object
 */
export function getLargeArenaColors() {
  return COLLISION_STATS.largeArenaColors;
}

/**
 * Get large arena configuration
 * @returns {Object} Large arena configuration
 */
export function getLargeArenaConfig() {
  return COLLISION_STATS.largeArena;
}

/**
 * Get respawn stats
 * @returns {Object} Respawn configuration
 */
export function getRespawnStats() {
  return COLLISION_STATS.respawn;
}

/**
 * Get ground stats
 * @returns {Object} Ground configuration
 */
export function getGroundStats() {
  return COLLISION_STATS.ground;
}

