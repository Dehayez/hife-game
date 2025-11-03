/**
 * GameModeManager.js
 * 
 * Main manager for all game mode-related functionality.
 * Coordinates game mode switching, state management, scoring, and entity spawning.
 * 
 * This file acts as a facade, delegating to specialized modules:
 * - GameModeConfig.js: Game mode configurations
 * - GameModeStats.js: Game mode stats and scoring
 */

import { getHighScore, setHighScore, getBestTime, setBestTime } from '../../../../utils/StorageUtils.js';
import { getModeConfig, isModeEnabled, getAllEnabledModes } from '../config/GameModeConfig.js';
import { getDefaultModeState, getScoringConfig, getSpawnCounts, formatTime } from '../config/GameModeStats.js';

export class GameModeManager {
  /**
   * Create a new GameModeManager
   * @param {Object} entityManager - Entity manager for spawning entities
   * @param {string} arena - Arena name ('standard' or 'large')
   */
  constructor(entityManager = null, arena = 'standard') {
    this.currentMode = 'free-play';
    this.currentArena = arena;
    this.entityManager = entityManager;
    this.onModeChangeCallback = null;
    this.onRestartCallback = null;
    
    // Initialize mode state
    this.modeState = getDefaultModeState();
    this.modeState.highScore = 0;
    
    // Load high score and best time for current mode and arena
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    }
  }

  /**
   * Set the arena
   * @param {string} arena - Arena name
   */
  setArena(arena) {
    this.currentArena = arena;
    // Reload scores for new arena
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    } else {
      this.modeState.bestTime = null;
    }
  }

  /**
   * Set the entity manager
   * @param {Object} entityManager - Entity manager instance
   */
  setEntityManager(entityManager) {
    this.entityManager = entityManager;
  }

  /**
   * Set callback for mode changes
   * @param {Function} callback - Callback function
   */
  setOnModeChangeCallback(callback) {
    this.onModeChangeCallback = callback;
  }

  /**
   * Set callback for restarts
   * @param {Function} callback - Callback function
   */
  setOnRestartCallback(callback) {
    this.onRestartCallback = callback;
  }

  /**
   * Set the current game mode
   * @param {string} mode - Mode key
   * @returns {boolean} True if mode was set successfully
   */
  setMode(mode) {
    if (!isModeEnabled(mode)) {
      return false;
    }
    
    const previousMode = this.currentMode;
    
    // Don't reset if already in the same mode
    if (previousMode === mode) {
      return true;
    }
    
    this.currentMode = mode;
    this.resetModeState();
    
    // Load high score and best time for the new mode and current arena
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    }
    
    if (this.entityManager) {
      this._spawnModeEntities();
    }
    
    // Trigger respawn when mode changes
    if (this.onModeChangeCallback && previousMode !== mode) {
      this.onModeChangeCallback();
    }
    
    return true;
  }

  /**
   * Spawn entities for the current mode
   * @private
   */
  _spawnModeEntities() {
    if (!this.entityManager) return;
    
    switch (this.currentMode) {
      case 'collection': {
        const spawnCounts = getSpawnCounts('collection');
        this.entityManager.spawnCollectiblesForCollection(spawnCounts.collectibles);
        break;
      }
      case 'survival': {
        const spawnCounts = getSpawnCounts('survival');
        this.entityManager.spawnHazardsForSurvival(spawnCounts.hazards);
        this.modeState.timer = 0;
        break;
      }
      case 'time-trial': {
        const spawnCounts = getSpawnCounts('time-trial');
        this.entityManager.spawnCheckpointsForTimeTrial(spawnCounts.checkpoints);
        this.modeState.timer = 0;
        break;
      }
      case 'shooting':
        // Shooting mode - no entities needed, just start the mode
        this.entityManager.clearAll();
        this.startMode(); // Auto-start shooting mode
        // Reset health when entering shooting mode
        if (this.modeState) {
          this.modeState.health = 100;
        }
        break;
      default:
        this.entityManager.clearAll();
        break;
    }
  }

  /**
   * Restart survival mode (internal use)
   * @private
   */
  _restartSurvivalMode() {
    this.resetModeState();
    
    // Reload high score and best time from storage after reset
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    }
    
    if (this.entityManager) {
      this._spawnModeEntities();
    }
    this.modeState.isStarted = false; // Require start button again
  }

  /**
   * Restart the current mode
   */
  restartMode() {
    // Reset mode state
    this.resetModeState();
    
    // Reload high score and best time from storage after reset
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    }
    
    if (this.entityManager) {
      this._spawnModeEntities();
    }
    
    // Reset started state - game will auto-start on movement
    this.modeState.isStarted = false;
    
    // Trigger respawn callback
    if (this.onModeChangeCallback) {
      this.onModeChangeCallback();
    }
  }

  /**
   * Get current mode
   * @returns {string} Current mode key
   */
  getMode() {
    return this.currentMode;
  }

  /**
   * Get current mode state
   * @returns {Object} Mode state object with kills, deaths, timer, etc.
   */
  getModeState() {
    return this.modeState;
  }

  /**
   * Get current mode configuration
   * @returns {Object} Mode configuration object
   */
  getModeConfig() {
    return getModeConfig(this.currentMode);
  }

  /**
   * Get mode configuration by key
   * @param {string} modeKey - Mode key
   * @returns {Object|null} Mode configuration or null
   */
  getModeConfigByKey(modeKey) {
    return getModeConfig(modeKey);
  }

  /**
   * Reset mode state to defaults
   */
  resetModeState() {
    this.modeState = getDefaultModeState();
    this.modeState.highScore = 0;
  }

  /**
   * Start the current mode
   */
  startMode() {
    this.modeState.isStarted = true;
    this.modeState.isPaused = false;
    
    if (this.currentMode === 'time-trial' || this.currentMode === 'survival') {
      this.modeState.startTime = Date.now() / 1000;
    }
  }

  /**
   * Pause the current mode
   */
  pause() {
    this.modeState.isPaused = true;
  }

  /**
   * Resume the current mode
   */
  resume() {
    this.modeState.isPaused = false;
  }

  /**
   * Update mode state
   * @param {number} dt - Delta time in seconds
   * @param {Object} entityManager - Entity manager
   */
  update(dt, entityManager) {
    const mode = this.currentMode;
    
    switch (mode) {
      case 'time-trial':
        if (this.modeState.isStarted && !this.modeState.isPaused && this.modeState.startTime && !this.modeState.isComplete) {
          this.modeState.timer += dt;
          
          if (entityManager) {
            const activated = entityManager.getActivatedCheckpoints();
            const total = entityManager.getAllCheckpoints();
            
            if (activated === total && total > 0 && !this.modeState.isComplete) {
              this.modeState.isComplete = true;
              const finishTime = this.modeState.timer;
              if (!this.modeState.bestTime || finishTime < this.modeState.bestTime) {
                this.modeState.bestTime = finishTime;
                setBestTime(this.currentMode, finishTime, this.currentArena);
              }
            }
          }
        }
        break;
      case 'survival':
        if (this.modeState.isStarted && !this.modeState.isPaused && !this.modeState.isComplete) {
          this.modeState.timer += dt;
        }
        break;
      case 'shooting':
        if (this.modeState.isStarted && !this.modeState.isPaused) {
          this.modeState.timer += dt;
        }
        break;
      case 'collection':
        if (entityManager) {
          const collected = entityManager.getAllCollectibles() - entityManager.getRemainingCollectibles();
          const total = entityManager.getAllCollectibles();
          
          if (collected === total && total > 0) {
            this.modeState.isComplete = true;
          }
        }
        break;
      default:
        break;
    }
  }

  /**
   * Get display information for the current mode
   * @returns {Object} Display info with mode, primary, and secondary text
   */
  getDisplayInfo() {
    const mode = this.currentMode;
    const config = getModeConfig(mode);
    
    switch (mode) {
      case 'time-trial':
        const checkpointsInfo = this.entityManager 
          ? `${this.entityManager.getActivatedCheckpoints()}/${this.entityManager.getAllCheckpoints()}`
          : '';
        const completeText = this.modeState.isComplete ? ' ✓ All Shrines Activated!' : '';
        const bestTimeText = this.modeState.bestTime 
          ? ` | Best: ${formatTime(this.modeState.bestTime)}` 
          : '';
        return {
          mode: config.name,
          primary: formatTime(this.modeState.timer) + completeText + bestTimeText,
          secondary: checkpointsInfo ? `Shrines: ${checkpointsInfo}` : null
        };
      case 'collection':
        const remaining = this.entityManager ? this.entityManager.getRemainingCollectibles() : 0;
        const total = this.entityManager ? this.entityManager.getAllCollectibles() : 0;
        const collectInfo = total > 0 ? `${total - remaining}/${total}` : '';
        const completeCollect = remaining === 0 && total > 0 ? ' ✓ All Gems Collected!' : '';
        const highScoreText = this.modeState.highScore > 0 ? ` | High: ${this.modeState.highScore}` : '';
        return {
          mode: config.name,
          primary: collectInfo ? `Gems: ${collectInfo}${completeCollect}` : `Gems: ${this.modeState.items.length}`,
          secondary: `Magical Energy: ${this.modeState.score}${highScoreText}`
        };
      case 'survival':
        const survivalBestTimeText = this.modeState.bestTime 
          ? ` | Best: ${formatTime(this.modeState.bestTime)}` 
          : '';
        const lastTimeText = this.modeState.lastTime 
          ? ` | Last: ${formatTime(this.modeState.lastTime)}` 
          : '';
        const survivalHighScoreText = this.modeState.highScore > 0 ? ` | High: ${this.modeState.highScore}` : '';
        return {
          mode: config.name,
          primary: formatTime(this.modeState.timer) + survivalBestTimeText + lastTimeText,
          secondary: `Spirit Power: ${this.modeState.score}${survivalHighScoreText}`
        };
      case 'shooting':
        return {
          mode: config.name,
          primary: `Health: ${Math.max(0, this.modeState.health)}`,
          secondary: `Kills: ${this.modeState.kills} | Deaths: ${this.modeState.deaths}`
        };
      default:
        return {
          mode: null,
          primary: null,
          secondary: null
        };
    }
  }

  /**
   * Format time in MM:SS.ms format
   * @param {number} seconds - Time in seconds
   * @returns {string} Formatted time string
   */
  formatTime(seconds) {
    return formatTime(seconds);
  }

  /**
   * Add score points
   * @param {number} points - Points to add
   */
  addScore(points) {
    const scoringConfig = getScoringConfig();
    this.modeState.score += points;
    // Update high score if current score exceeds it
    if (this.modeState.score > this.modeState.highScore) {
      this.modeState.highScore = this.modeState.score;
      setHighScore(this.currentMode, this.modeState.highScore, this.currentArena);
    }
  }

  /**
   * Collect an item
   * @param {string} itemId - Item ID
   * @returns {boolean} True if item was collected
   */
  collectItem(itemId) {
    const scoringConfig = getScoringConfig();
    if (!this.modeState.items.includes(itemId)) {
      this.modeState.items.push(itemId);
      this.addScore(scoringConfig.itemCollected);
      return true;
    }
    return false;
  }

  /**
   * Handle entity collision
   * @param {Object} collision - Collision data
   */
  handleEntityCollision(collision) {
    if (!collision) return;
    const scoringConfig = getScoringConfig();

    if (collision.collectible) {
      const itemId = collision.collectible.userData.id;
      if (this.collectItem(itemId)) {
        if (this.entityManager) {
          this.entityManager.collectItem(collision.collectible);
        }
      }
    }

    if (collision.checkpoint) {
      const checkpointId = collision.checkpoint.userData.id;
      if (!this.modeState.checkpoints.includes(checkpointId)) {
        this.modeState.checkpoints.push(checkpointId);
        if (this.entityManager) {
          this.entityManager.activateCheckpoint(collision.checkpoint);
          this.addScore(scoringConfig.checkpointActivated);
        }
      }
    }

    if (collision.hazard) {
      if (this.currentMode === 'survival') {
        // In survival mode, touching a hazard stops timer, saves time, and restarts
        if (this.modeState.isStarted && !this.modeState.isComplete) {
          // Save the current time
          this.modeState.lastTime = this.modeState.timer;
          
          // Update best time if this is better (higher is better in survival)
          if (!this.modeState.bestTime || this.modeState.timer > this.modeState.bestTime) {
            this.modeState.bestTime = this.modeState.timer;
            setBestTime(this.currentMode, this.modeState.bestTime, this.currentArena);
          }
          
          // Pause and mark as complete temporarily
          this.modeState.isComplete = true;
          this.modeState.isPaused = true;
          
          // Restart the mode after a short delay
          setTimeout(() => {
            this._restartSurvivalMode();
            if (this.onModeChangeCallback) {
              this.onModeChangeCallback();
            }
          }, 1500);
        }
      }
    }
  }

  /**
   * Get all enabled modes
   * @returns {Array<string>} Array of enabled mode keys
   */
  getAllModes() {
    return getAllEnabledModes();
  }
}

