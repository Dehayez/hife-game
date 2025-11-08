/**
 * BotDifficultyConfig.js
 * 
 * Configuration for bot difficulty levels.
 * Each difficulty level affects bot behavior, learning rate, and AI parameters.
 */

/**
 * Bot Difficulty Levels
 */
export const BOT_DIFFICULTY = {
  EASY: 'easy',
  BEGINNER: 'beginner',
  MIDWAY: 'midway',
  VETERAN: 'veteran'
};

/**
 * Difficulty Configuration
 * 
 * Each difficulty level has:
 * - learningRate: How fast bots learn from player (0-1)
 * - adaptationSpeed: How quickly bots adapt to new patterns
 * - aiAccuracy: Base accuracy for shooting (0-1)
 * - aiReactionTime: Reaction time multiplier (lower = faster)
 * - movementIntelligence: How smart movement decisions are (0-1)
 * - patternRetention: How long bots remember patterns (sessions)
 */
export const DIFFICULTY_CONFIG = {
  [BOT_DIFFICULTY.EASY]: {
    name: 'Easy',
    learningRate: 0.1,           // Slow learning
    adaptationSpeed: 0.05,        // Very slow adaptation
    aiAccuracy: 0.3,              // Low accuracy
    aiReactionTime: 2.0,          // Slow reactions
    movementIntelligence: 0.2,    // Basic movement
    patternRetention: 1,          // Forget quickly
    shootIntervalMultiplier: 1.5, // Slower shooting
    followDistanceMultiplier: 0.8, // Shorter follow distance
    burstPauseMin: 3.0,          // Minimum pause between bursts (seconds)
    burstPauseMax: 6.0,          // Maximum pause between bursts (seconds)
    idleChance: 0.4,             // Chance to enter idle state (40%)
    idleDurationMin: 1.5,        // Minimum idle duration (seconds)
    idleDurationMax: 3.5,        // Maximum idle duration (seconds)
    movementPauseChance: 0.3,     // Chance to pause movement (30%)
    movementPauseMin: 0.8,       // Minimum movement pause (seconds)
    movementPauseMax: 2.0        // Maximum movement pause (seconds)
  },
  [BOT_DIFFICULTY.BEGINNER]: {
    name: 'Beginner',
    learningRate: 0.3,            // Moderate learning
    adaptationSpeed: 0.15,        // Slow adaptation
    aiAccuracy: 0.5,              // Medium accuracy
    aiReactionTime: 1.5,          // Moderate reactions
    movementIntelligence: 0.4,    // Some movement intelligence
    patternRetention: 2,          // Remember for 2 sessions
    shootIntervalMultiplier: 1.2, // Slightly slower shooting
    followDistanceMultiplier: 0.9, // Slightly shorter follow distance
    burstPauseMin: 2.0,          // Minimum pause between bursts (seconds)
    burstPauseMax: 4.5,          // Maximum pause between bursts (seconds)
    idleChance: 0.3,             // Chance to enter idle state (30%)
    idleDurationMin: 1.0,        // Minimum idle duration (seconds)
    idleDurationMax: 2.5,        // Maximum idle duration (seconds)
    movementPauseChance: 0.25,    // Chance to pause movement (25%)
    movementPauseMin: 0.6,       // Minimum movement pause (seconds)
    movementPauseMax: 1.8        // Maximum movement pause (seconds)
  },
  [BOT_DIFFICULTY.MIDWAY]: {
    name: 'Midway',
    learningRate: 0.6,            // Good learning
    adaptationSpeed: 0.4,         // Moderate adaptation
    aiAccuracy: 0.7,              // Good accuracy
    aiReactionTime: 1.0,          // Normal reactions
    movementIntelligence: 0.7,    // Good movement intelligence
    patternRetention: 5,          // Remember for 5 sessions
    shootIntervalMultiplier: 1.0, // Normal shooting
    followDistanceMultiplier: 1.0, // Normal follow distance
    burstPauseMin: 1.5,          // Minimum pause between bursts (seconds)
    burstPauseMax: 3.0,          // Maximum pause between bursts (seconds)
    idleChance: 0.2,             // Chance to enter idle state (20%)
    idleDurationMin: 0.8,        // Minimum idle duration (seconds)
    idleDurationMax: 2.0,        // Maximum idle duration (seconds)
    movementPauseChance: 0.15,    // Chance to pause movement (15%)
    movementPauseMin: 0.4,       // Minimum movement pause (seconds)
    movementPauseMax: 1.2        // Maximum movement pause (seconds)
  },
  [BOT_DIFFICULTY.VETERAN]: {
    name: 'Veteran',
    learningRate: 0.9,            // Fast learning
    adaptationSpeed: 0.8,         // Fast adaptation
    aiAccuracy: 0.85,             // High accuracy
    aiReactionTime: 0.7,          // Fast reactions
    movementIntelligence: 0.9,    // Excellent movement intelligence
    patternRetention: 10,         // Remember for 10 sessions
    shootIntervalMultiplier: 0.8, // Faster shooting
    followDistanceMultiplier: 1.2, // Longer follow distance
    burstPauseMin: 1.0,          // Minimum pause between bursts (seconds)
    burstPauseMax: 2.5,          // Maximum pause between bursts (seconds)
    idleChance: 0.1,             // Chance to enter idle state (10%)
    idleDurationMin: 0.5,        // Minimum idle duration (seconds)
    idleDurationMax: 1.5,        // Maximum idle duration (seconds)
    movementPauseChance: 0.1,     // Chance to pause movement (10%)
    movementPauseMin: 0.3,       // Minimum movement pause (seconds)
    movementPauseMax: 1.0        // Maximum movement pause (seconds)
  }
};

/**
 * Get difficulty configuration
 * @param {string} difficulty - Difficulty level
 * @returns {Object} Difficulty configuration
 */
export function getDifficultyConfig(difficulty = BOT_DIFFICULTY.BEGINNER) {
  return DIFFICULTY_CONFIG[difficulty] || DIFFICULTY_CONFIG[BOT_DIFFICULTY.BEGINNER];
}

/**
 * Get all available difficulty levels
 * @returns {Array<string>} Array of difficulty level keys
 */
export function getAvailableDifficulties() {
  return Object.values(BOT_DIFFICULTY);
}

