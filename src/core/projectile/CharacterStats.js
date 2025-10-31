/**
 * CharacterStats.js
 * 
 * Centralized configuration for all character ability stats.
 * This file provides a clear view of every ability stat for every character.
 * 
 * Add new characters or modify ability stats here.
 */

/**
 * Character Ability Stats Configuration
 * 
 * Each character has stats for two abilities:
 * 1. Firebolt (regular projectile)
 * 2. Mortar (arc projectile with fire splash)
 */
export const CHARACTER_STATS = {
  /**
   * Lucy - Agile spellcaster
   * Fast, lower damage attacks with smaller projectiles
   */
  lucy: {
    name: 'Lucy',
    color: 0xff6b9d, // Pink/magenta color
    
    // Firebolt Ability Stats
    firebolt: {
      damage: 20,              // Damage per hit
      cooldown: 0.6,           // Seconds between shots
      projectileSpeed: 8,      // Units per second
      size: 0.08,              // Projectile radius (smaller)
      lifetime: 3              // Seconds before projectile despawns
    },
    
    // Mortar Ability Stats
    mortar: {
      damage: 35,              // Direct hit damage
      areaDamage: 10,          // Area damage per tick (5 ticks/second)
      cooldown: 2.5,           // Seconds between mortar shots
      arcHeight: 3.0,          // Maximum height of arc trajectory
      splashRadius: 0.8,       // Radius of fire splash area
      fireDuration: 1.5,       // How long fire persists on ground (seconds)
      shrinkDelay: 0.8,        // Wait time before fire starts shrinking (seconds)
      size: 0.12               // Mortar projectile radius
    }
  },
  
  /**
   * Herald - Powerful warrior
   * Slower, higher damage attacks with larger projectiles
   */
  herald: {
    name: 'Herald',
    color: 0xff8c42, // Orange color
    
    // Firebolt Ability Stats
    firebolt: {
      damage: 35,              // Damage per hit (higher than Lucy)
      cooldown: 0.8,           // Seconds between shots (slower than Lucy)
      projectileSpeed: 9,      // Units per second (slightly faster)
      size: 0.18,              // Projectile radius (larger than Lucy)
      lifetime: 3              // Seconds before projectile despawns
    },
    
    // Mortar Ability Stats
    mortar: {
      damage: 35,              // Direct hit damage (higher than Lucy)
      areaDamage: 5,          // Area damage per tick (higher than Lucy)
      cooldown: 3.5,           // Seconds between mortar shots (slower than Lucy)
      arcHeight: 4.0,          // Maximum height of arc trajectory (higher arc)
      splashRadius: 1.0,       // Radius of fire splash area (larger than Lucy)
      fireDuration: 2.0,       // How long fire persists on ground (longer than Lucy)
      shrinkDelay: 1.0,        // Wait time before fire starts shrinking (longer than Lucy)
      size: 0.25               // Mortar projectile radius (larger fireball)
    }
  }
};

/**
 * Get character stats by name
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {Object} Character stats object or defaults to Lucy
 */
export function getCharacterStats(characterName) {
  return CHARACTER_STATS[characterName] || CHARACTER_STATS.lucy;
}

/**
 * Get firebolt stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Firebolt ability stats
 */
export function getFireboltStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.firebolt;
}

/**
 * Get mortar stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Mortar ability stats
 */
export function getMortarStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.mortar;
}

/**
 * Get character color
 * @param {string} characterName - Character name
 * @returns {number} Character color as hex number
 */
export function getCharacterColor(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.color;
}

