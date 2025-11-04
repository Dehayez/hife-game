/**
 * CharacterAbilityStatsConfig.js
 * 
 * Merged character ability stats configuration.
 * This config is computed by merging base stats with character-specific configs.
 */

import { createCharacterStats } from '../functions/CharacterAbilityStats.js';
import { LUCY_BOLT_ATTACK_CONFIG } from './characters/lucy/bolt/AttackConfig.js';
import { LUCY_MORTAR_ATTACK_CONFIG } from './characters/lucy/mortar/AttackConfig.js';
import { LUCY_MELEE_ATTACK_CONFIG } from './characters/lucy/melee/AttackConfig.js';
import { HERALD_BOLT_ATTACK_CONFIG } from './characters/herald/bolt/AttackConfig.js';
import { HERALD_MORTAR_ATTACK_CONFIG } from './characters/herald/mortar/AttackConfig.js';
import { HERALD_MELEE_ATTACK_CONFIG } from './characters/herald/melee/AttackConfig.js';

/**
 * Character Ability Stats Configuration
 * 
 * Each character has stats for three abilities:
 * 1. Bolt (regular projectile)
 * 2. Mortar (arc projectile with splash area)
 * 3. Melee (sword swing attack)
 */
export const CHARACTER_STATS = {
  lucy: createCharacterStats('lucy', LUCY_BOLT_ATTACK_CONFIG, LUCY_MORTAR_ATTACK_CONFIG, LUCY_MELEE_ATTACK_CONFIG),
  herald: createCharacterStats('herald', HERALD_BOLT_ATTACK_CONFIG, HERALD_MORTAR_ATTACK_CONFIG, HERALD_MELEE_ATTACK_CONFIG)
};

