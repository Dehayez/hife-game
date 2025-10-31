/**
 * GameModeStats.js
 * 
 * Centralized configuration for game mode stats and scoring.
 * This file provides a clear view of every game mode stat that can be edited.
 */

/**
 * Game Mode Stats Configuration
 * 
 * Default values and scoring rules for each game mode.
 */
export const GAME_MODE_STATS = {
  /**
   * Default Mode State Values
   */
  defaultState: {
    timer: 0,                  // Timer in seconds
    score: 0,                 // Current score
    items: [],                 // Collected items
    hazards: [],               // Active hazards
    checkpoints: [],           // Activated checkpoints
    startTime: null,           // Start time timestamp
    bestTime: null,            // Best time achieved
    lastTime: null,            // Last time achieved
    isComplete: false,        // Whether mode is complete
    isPaused: false,           // Whether mode is paused
    isStarted: false,          // Whether mode has started
    health: 100,              // Current health
    kills: 0,                 // Number of kills
    deaths: 0                 // Number of deaths
  },
  
  /**
   * Scoring Configuration
   */
  scoring: {
    itemCollected: 10,         // Points for collecting an item
    checkpointActivated: 20     // Points for activating a checkpoint
  },
  
  /**
   * Entity Spawn Counts
   */
  spawnCounts: {
    collection: {
      collectibles: 8          // Number of collectibles to spawn
    },
    survival: {
      hazards: 10             // Number of hazards to spawn
    },
    timeTrial: {
      checkpoints: 5          // Number of checkpoints to spawn
    }
  }
};

/**
 * Get default mode state
 * @returns {Object} Default mode state object
 */
export function getDefaultModeState() {
  return { ...GAME_MODE_STATS.defaultState };
}

/**
 * Get scoring configuration
 * @returns {Object} Scoring configuration
 */
export function getScoringConfig() {
  return GAME_MODE_STATS.scoring;
}

/**
 * Get spawn counts for a mode
 * @param {string} modeKey - Mode key
 * @returns {Object|null} Spawn counts for mode or null
 */
export function getSpawnCounts(modeKey) {
  switch (modeKey) {
    case 'collection':
      return GAME_MODE_STATS.spawnCounts.collection;
    case 'survival':
      return GAME_MODE_STATS.spawnCounts.survival;
    case 'time-trial':
      return GAME_MODE_STATS.spawnCounts.timeTrial;
    default:
      return null;
  }
}

/**
 * Format time in MM:SS.ms format
 * @param {number} seconds - Time in seconds
 * @returns {string} Formatted time string
 */
export function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

