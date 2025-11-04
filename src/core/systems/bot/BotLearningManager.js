/**
 * BotLearningManager.js
 * 
 * Manages bot learning from player behavior.
 * Tracks player actions and patterns, then adapts bot AI accordingly.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getDifficultyConfig } from '../../../config/bot/BotDifficultyConfig.js';
import { getBotAIStats } from '../../../config/bot/BotStats.js';
import { saveLearningData, loadLearningData } from '../../../utils/LearningStorageUtils.js';

/**
 * Bot Learning Manager
 * 
 * Tracks player behavior patterns and learns from them:
 * - Shooting patterns (timing, frequency, positioning)
 * - Movement patterns (paths, avoidance, positioning)
 * - Combat tactics (engagement distance, retreat patterns)
 */
export class BotLearningManager {
  /**
   * Create a new BotLearningManager
   * @param {string} difficulty - Current difficulty level
   */
  constructor(difficulty = 'beginner') {
    this.difficulty = difficulty;
    this.config = getDifficultyConfig(difficulty);
    
    // Learning data storage
    this.learningData = {
      shooting: {
        averageInterval: 2.0,        // Average time between shots
        patterns: [],                // Recent shooting patterns
        preferredRange: 10,          // Preferred engagement distance
        accuracy: 0.5               // Learned accuracy
      },
      movement: {
        patterns: [],                // Movement path patterns
        avoidancePatterns: [],       // How player avoids projectiles
        positioning: [],             // Preferred positions
        speedVariations: []          // Speed change patterns
      },
      combat: {
        engagementDistance: 10,     // Preferred engagement distance
        retreatThreshold: 0.3,       // Health % when retreating
        aggressiveThreshold: 0.7     // Health % when being aggressive
      },
      sessions: 0,                   // Number of learning sessions
      lastUpdate: Date.now()          // Last update timestamp
    };
    
    // Real-time tracking
    this.playerActions = {
      shots: [],
      movements: [],
      positions: []
    };
    
    // Load saved learning data
    this.loadSavedData();
  }
  
  /**
   * Set difficulty level
   * @param {string} difficulty - Difficulty level
   */
  setDifficulty(difficulty) {
    this.difficulty = difficulty;
    this.config = getDifficultyConfig(difficulty);
  }
  
  /**
   * Track player shooting action
   * @param {THREE.Vector3} playerPosition - Player position
   * @param {THREE.Vector3} targetPosition - Target position (if available)
   * @param {number} timestamp - Action timestamp
   */
  trackPlayerShot(playerPosition, targetPosition = null, timestamp = Date.now()) {
    this.playerActions.shots.push({
      position: playerPosition.clone(),
      target: targetPosition ? targetPosition.clone() : null,
      timestamp: timestamp
    });
    
    // Keep only recent shots (last 100)
    if (this.playerActions.shots.length > 100) {
      this.playerActions.shots.shift();
    }
    
    // Update shooting patterns periodically
    this._updateShootingPatterns();
  }
  
  /**
   * Track player movement
   * @param {THREE.Vector3} position - Current position
   * @param {THREE.Vector3} velocity - Movement velocity
   * @param {number} timestamp - Action timestamp
   */
  trackPlayerMovement(position, velocity, timestamp = Date.now()) {
    this.playerActions.movements.push({
      position: position.clone(),
      velocity: velocity.clone(),
      timestamp: timestamp
    });
    
    // Keep only recent movements (last 200)
    if (this.playerActions.movements.length > 200) {
      this.playerActions.movements.shift();
    }
    
    // Update positions
    this.playerActions.positions.push({
      position: position.clone(),
      timestamp: timestamp
    });
    
    // Keep only recent positions (last 100)
    if (this.playerActions.positions.length > 100) {
      this.playerActions.positions.shift();
    }
  }
  
  /**
   * Get learned shooting interval for bots
   * @returns {number} Shooting interval in seconds
   */
  getLearnedShootInterval() {
    const baseInterval = this.learningData.shooting.averageInterval;
    const variance = baseInterval * 0.2; // 20% variance
    return baseInterval + (Math.random() - 0.5) * variance;
  }
  
  /**
   * Get learned preferred range for bots
   * @returns {number} Preferred engagement range
   */
  getLearnedPreferredRange() {
    return this.learningData.shooting.preferredRange;
  }
  
  /**
   * Get learned movement pattern for bots
   * @param {THREE.Vector3} botPosition - Bot position
   * @param {THREE.Vector3} playerPosition - Player position
   * @returns {Object} Movement suggestion with direction and speed
   */
  getLearnedMovement(botPosition, playerPosition) {
    if (this.learningData.movement.patterns.length === 0) {
      return null; // No patterns learned yet
    }
    
    // Analyze recent player movement patterns
    const recentMovements = this.playerActions.movements.slice(-20);
    if (recentMovements.length === 0) {
      return null;
    }
    
    // Calculate average movement direction
    let avgDirection = new THREE.Vector3(0, 0, 0);
    for (const move of recentMovements) {
      if (move.velocity && move.velocity.length() > 0) {
        avgDirection.add(move.velocity);
      }
    }
    
    if (avgDirection.length() < 0.001) {
      return null; // No meaningful movement detected
    }
    
    avgDirection.divideScalar(recentMovements.length);
    
    // Normalize and apply learning rate
    const learnedDirection = avgDirection.normalize().multiplyScalar(this.config.learningRate);
    
    return {
      direction: learnedDirection,
      speed: learnedDirection.length()
    };
  }
  
  /**
   * Get learned combat behavior
   * @param {number} botHealth - Bot health (0-1)
   * @returns {Object} Combat behavior suggestion
   */
  getLearnedCombatBehavior(botHealth) {
    const combat = this.learningData.combat;
    
    return {
      engagementDistance: combat.engagementDistance,
      shouldRetreat: botHealth < combat.retreatThreshold,
      shouldBeAggressive: botHealth > combat.aggressiveThreshold,
      preferredRange: this.learningData.shooting.preferredRange
    };
  }
  
  /**
   * Update learning data from tracked actions
   */
  updateLearning() {
    this._updateShootingPatterns();
    this._updateMovementPatterns();
    this._updateCombatPatterns();
    
    // Save periodically
    if (Date.now() - this.learningData.lastUpdate > 30000) { // Every 30 seconds
      this.saveLearningData();
      this.learningData.lastUpdate = Date.now();
    }
  }
  
  /**
   * Update shooting patterns from tracked shots
   * @private
   */
  _updateShootingPatterns() {
    const shots = this.playerActions.shots;
    if (shots.length < 2) return;
    
    // Calculate average interval between shots
    let totalInterval = 0;
    let intervalCount = 0;
    
    for (let i = 1; i < shots.length; i++) {
      const interval = (shots[i].timestamp - shots[i - 1].timestamp) / 1000;
      if (interval < 10) { // Only consider reasonable intervals
        totalInterval += interval;
        intervalCount++;
      }
    }
    
    if (intervalCount > 0) {
      const newAverage = totalInterval / intervalCount;
      // Apply learning rate to blend old and new data
      this.learningData.shooting.averageInterval = 
        this.learningData.shooting.averageInterval * (1 - this.config.learningRate) +
        newAverage * this.config.learningRate;
    }
    
    // Calculate preferred range from recent shots
    if (shots.length > 0) {
      const recentShots = shots.slice(-10);
      let totalRange = 0;
      let rangeCount = 0;
      
      for (const shot of recentShots) {
        if (shot.target) {
          const range = shot.position.distanceTo(shot.target);
          if (range > 0 && range < 20) {
            totalRange += range;
            rangeCount++;
          }
        }
      }
      
      if (rangeCount > 0) {
        const newPreferredRange = totalRange / rangeCount;
        this.learningData.shooting.preferredRange = 
          this.learningData.shooting.preferredRange * (1 - this.config.learningRate) +
          newPreferredRange * this.config.learningRate;
      }
    }
  }
  
  /**
   * Update movement patterns from tracked movements
   * @private
   */
  _updateMovementPatterns() {
    const movements = this.playerActions.movements;
    if (movements.length < 10) return;
    
    // Store recent movement patterns
    const recentPatterns = movements.slice(-20);
    this.learningData.movement.patterns = recentPatterns.map(m => ({
      position: m.position.clone(),
      velocity: m.velocity.clone(),
      timestamp: m.timestamp
    }));
    
    // Keep only recent patterns based on retention
    const maxPatterns = this.config.patternRetention * 20;
    if (this.learningData.movement.patterns.length > maxPatterns) {
      this.learningData.movement.patterns = 
        this.learningData.movement.patterns.slice(-maxPatterns);
    }
  }
  
  /**
   * Update combat patterns
   * @private
   */
  _updateCombatPatterns() {
    // Combat patterns are updated based on observed behavior
    // This can be extended with more sophisticated analysis
  }
  
  /**
   * Get learning progress statistics
   * @returns {Object} Learning progress data
   */
  getLearningProgress() {
    const shotsTracked = this.playerActions.shots.length;
    const movementsTracked = this.playerActions.movements.length;
    const patternsLearned = this.learningData.movement.patterns.length;
    
    // Calculate learning completion percentage
    const shootingProgress = Math.min(100, (shotsTracked / 50) * 100);
    const movementProgress = Math.min(100, (movementsTracked / 100) * 100);
    const patternProgress = Math.min(100, (patternsLearned / (this.config.patternRetention * 20)) * 100);
    
    const overallProgress = (shootingProgress + movementProgress + patternProgress) / 3;
    
    return {
      shooting: {
        progress: shootingProgress,
        patternsLearned: this.learningData.shooting.patterns.length,
        averageInterval: this.learningData.shooting.averageInterval.toFixed(2),
        preferredRange: this.learningData.shooting.preferredRange.toFixed(2)
      },
      movement: {
        progress: movementProgress,
        patternsLearned: patternsLearned,
        totalMovements: movementsTracked
      },
      combat: {
        progress: patternProgress,
        engagementDistance: this.learningData.combat.engagementDistance.toFixed(2)
      },
      overall: {
        progress: overallProgress,
        sessions: this.learningData.sessions,
        difficulty: this.config.name
      }
    };
  }
  
  /**
   * Load saved learning data from storage
   */
  loadSavedData() {
    const saved = loadLearningData(this.difficulty);
    if (saved) {
      // Merge saved data with current
      this.learningData = {
        ...this.learningData,
        ...saved,
        lastUpdate: Date.now()
      };
      
      // Increment sessions
      this.learningData.sessions++;
    }
  }
  
  /**
   * Save learning data to storage
   */
  saveLearningData() {
    saveLearningData(this.difficulty, {
      shooting: this.learningData.shooting,
      movement: {
        patterns: this.learningData.movement.patterns.slice(-50), // Keep last 50
        avoidancePatterns: this.learningData.movement.avoidancePatterns.slice(-20)
      },
      combat: this.learningData.combat,
      sessions: this.learningData.sessions,
      lastUpdate: Date.now()
    });
  }
  
  /**
   * Reset learning data
   */
  reset() {
    this.learningData = {
      shooting: {
        averageInterval: 2.0,
        patterns: [],
        preferredRange: 10,
        accuracy: 0.5
      },
      movement: {
        patterns: [],
        avoidancePatterns: [],
        positioning: [],
        speedVariations: []
      },
      combat: {
        engagementDistance: 10,
        retreatThreshold: 0.3,
        aggressiveThreshold: 0.7
      },
      sessions: 0,
      lastUpdate: Date.now()
    };
    
    this.playerActions = {
      shots: [],
      movements: [],
      positions: []
    };
    
    this.saveLearningData();
  }
}

