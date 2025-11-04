/**
 * Spawner.js
 * 
 * Handles entity spawning and position generation.
 */

import { getSpawnStats } from '../../../config/entity/EntityStats.js';

/**
 * Generate random positions for spawning entities
 * @param {number} count - Number of positions to generate
 * @param {number} minDistance - Minimum distance from center
 * @param {number} arenaSize - Arena size
 * @returns {Array<Object>} Array of position objects with x and z
 */
export function generateRandomPositions(count, minDistance, arenaSize) {
  const positions = [];
  const halfArena = arenaSize / 2;
  
  for (let i = 0; i < count; i++) {
    let attempts = 0;
    let x, z;
    
    // Try to find a valid position (not too close to center, not outside arena)
    do {
      const angle = Math.random() * Math.PI * 2;
      const radius = minDistance + Math.random() * (halfArena - minDistance - 1);
      x = Math.cos(angle) * radius;
      z = Math.sin(angle) * radius;
      attempts++;
    } while (attempts < 100 && (Math.abs(x) < minDistance || Math.abs(z) < minDistance || 
           Math.abs(x) >= halfArena || Math.abs(z) >= halfArena));
    
    positions.push({ x, z });
  }
  
  return positions;
}

/**
 * Get spawn count adjusted for arena size
 * @param {string} mode - Mode name ('collection', 'survival', 'time-trial')
 * @param {number} defaultCount - Default count
 * @param {number} arenaSize - Arena size
 * @returns {number} Adjusted spawn count
 */
export function getAdjustedSpawnCount(mode, defaultCount, arenaSize) {
  const spawnStats = getSpawnStats();
  const isLargeArena = arenaSize >= 35;
  
  if (!isLargeArena) {
    return defaultCount;
  }
  
  const multipliers = spawnStats.largeArenaMultiplier;
  
  switch (mode) {
    case 'collection':
      return defaultCount * multipliers.collection;
    case 'survival':
      return defaultCount * multipliers.survival;
    case 'time-trial':
      return defaultCount * multipliers.timeTrial;
    default:
      return defaultCount;
  }
}

