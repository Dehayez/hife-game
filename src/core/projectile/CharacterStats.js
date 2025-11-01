/**
 * CharacterStats.js
 * 
 * Centralized configuration for all character ability stats.
 * This file provides a clear view of every ability stat for every character.
 * 
 * Add new characters or modify ability stats here.
 * 
 * ═══════════════════════════════════════════════════════════════════
 * TO EDIT MELEE ATTACK STATS:
 * ═══════════════════════════════════════════════════════════════════
 * 
 * Scroll down to find each character's "MELEE ATTACK STATS" section.
 * Each character (Lucy and Herald) has their own melee stats.
 * 
 * Melee stats you can edit:
 *   - damage: Damage per tick - how much damage each tick deals during animation (number)
 *   - tickInterval: Seconds between damage ticks (e.g., 0.1 = 10 ticks/second) (number)
 *   - range: Attack range in units - how far the attack reaches (number)
 *            ⚠️ All animations and particles scale with this value:
 *               - Circle inner radius: range * 0.875
 *               - Circle outer radius: range (exact)
 *               - Particle size: range * 0.15 (15-25% of range)
 *               - Particle speed: range * 2.5 (scales proportionally)
 *   - animationDuration: How long the animation lasts in seconds (number)
 *                        ⚠️ Circle and particles use this for timing
 *                        Damage is applied over this duration in ticks
 *   - cooldown: Seconds between melee attacks (cooldown time) (number)
 *   - poisonDamage: Poison damage per tick - damage dealt after animation ends (number)
 *   - poisonTickInterval: Seconds between poison damage ticks (number)
 *   - poisonDuration: How long poison lasts in seconds (total poison duration) (number)
 * 
 * Example locations:
 *   - Lucy melee stats: Around line 49-56
 *   - Herald melee stats: Around line 90-97
 * 
 * HOW VARIABLES ARE USED:
 * - All abilities (melee, firebolt, mortar) use their stats variables
 * - Animations scale with range/size using: variable * multiplier
 * - Particles scale with range/size using: variable * 0.15 (or similar)
 * - Everything scales proportionally - edit the base variable and everything updates!
 * 
 * ═══════════════════════════════════════════════════════════════════
 */

/**
 * Character Ability Stats Configuration
 * 
 * Each character has stats for three abilities:
 * 1. Firebolt (regular projectile)
 * 2. Mortar (arc projectile with fire splash)
 * 3. Melee (sword swing attack)
 */
export const CHARACTER_STATS = {
  /**
   * Lucy - Agile spellcaster
   * Fast, lower damage attacks with smaller projectiles
   */
  lucy: {
    name: 'Lucy',
    color: 0x9c57b6, // Purple color (#9c57b6)
    
    // Firebolt Ability Stats
    firebolt: {
      damage: 10,              // Damage per hit (lower for Uzi-like rapid fire)
      cooldown: 0.15,          // Seconds between shots (Uzi-like rapid fire)
      projectileSpeed: 12,     // Units per second (faster)
      size: 0.08,              // Projectile radius (smaller)
      lifetime: 3,             // Seconds before projectile despawns
      cursorFollowStrength: 0.3 // How much projectile follows cursor (0.0 = none, 1.0 = full)
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
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // MELEE ATTACK STATS - Edit these values to change melee attack
    // ═══════════════════════════════════════════════════════════════════
    melee: {
      damage: 10,              // Damage per tick (damage dealt each tick during animation)
      tickInterval: 0.1,        // Seconds between damage ticks (10 ticks/second)
      range: 1.4,               // Attack range in units (how far the attack reaches)
      animationDuration: 2,    // Animation duration in seconds (how long the attack animation lasts)
      cooldown: 3.0,           // Seconds between melee attacks (cooldown time)
      poisonDamage: 1,         // Poison damage per tick (damage dealt after animation ends)
      poisonTickInterval: 0.5, // Seconds between poison damage ticks (2 ticks/second)
      poisonDuration: 3.0      // How long poison lasts in seconds (total poison duration)
    }
    // ═══════════════════════════════════════════════════════════════════
  },
  
  /**
   * Herald - Powerful warrior
   * Slower, higher damage attacks with larger projectiles
   */
  herald: {
    name: 'Herald',
    color: 0xf5ba0b, // Gold color (#f5ba0b)
    
    // Firebolt Ability Stats
    firebolt: {
      damage: 35,              // Damage per hit (balanced with lucy)
      cooldown: 0.8,           // Seconds between shots (slower than Lucy)
      projectileSpeed: 9,      // Units per second (slightly faster)
      size: 0.18,              // Projectile radius (larger than Lucy)
      lifetime: 3,             // Seconds before projectile despawns
      cursorFollowStrength: 0.5 // How much projectile follows cursor (0.0 = none, 1.0 = full)
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
    },
    
    // ═══════════════════════════════════════════════════════════════════
    // MELEE ATTACK STATS - Edit these values to change melee attack
    // ═══════════════════════════════════════════════════════════════════
    melee: {
      damage: 12,              // Damage per tick (higher damage per tick than Lucy)
      tickInterval: 0.1,        // Seconds between damage ticks (10 ticks/second)
      range: 1.4,               // Attack range in units (larger for powerful warrior)
      animationDuration: 0.6,  // Animation duration in seconds (longer for powerful swing)
      cooldown: 4.0,           // Seconds between melee attacks (slower cooldown than Lucy)
      poisonDamage: 1,         // Poison damage per tick (damage dealt after animation ends)
      poisonTickInterval: 0.5,  // Seconds between poison damage ticks (2 ticks/second)
      poisonDuration: 4.0       // How long poison lasts in seconds (longer poison duration)
    }
    // ═══════════════════════════════════════════════════════════════════
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

/**
 * Get melee attack stats for a character
 * @param {string} characterName - Character name
 * @returns {Object} Melee ability stats
 */
export function getMeleeStats(characterName) {
  const stats = getCharacterStats(characterName);
  return stats.melee;
}

