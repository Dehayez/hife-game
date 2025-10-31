import { getHighScore, setHighScore, getBestTime, setBestTime } from '../utils/StorageUtils.js';

export class GameModeManager {
  constructor(entityManager = null, arena = 'standard') {
    this.currentMode = 'free-play';
    this.currentArena = arena;
    this.entityManager = entityManager;
    this.onModeChangeCallback = null;
    this.onRestartCallback = null;
    this.modes = {
      'free-play': {
        name: 'Forest Wander',
        description: 'Explore the magical forest freely',
        enabled: true
      },
      'time-trial': {
        name: 'Crystal Shrine',
        description: 'Activate mystical shrines before time runs out',
        enabled: true
      },
      'collection': {
        name: 'Gem Gathering',
        description: 'Collect enchanted crystals scattered throughout',
        enabled: true
      },
      'survival': {
        name: 'Shadow Escape',
        description: 'Survive the cursed thorns as long as possible',
        enabled: true
      }
    };
    
    this.modeState = {
      timer: 0,
      score: 0,
      items: [],
      hazards: [],
      checkpoints: [],
      startTime: null,
      bestTime: null,
      lastTime: null,
      isComplete: false,
      isPaused: false,
      isStarted: false,
      highScore: 0
    };
    
    // Load high score and best time for current mode and arena
    this.modeState.highScore = getHighScore(this.currentMode, this.currentArena);
    const savedBestTime = getBestTime(this.currentMode, this.currentArena);
    if (savedBestTime !== null) {
      this.modeState.bestTime = savedBestTime;
    }
  }

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

  setEntityManager(entityManager) {
    this.entityManager = entityManager;
  }

  setOnModeChangeCallback(callback) {
    this.onModeChangeCallback = callback;
  }

  setOnRestartCallback(callback) {
    this.onRestartCallback = callback;
  }

  setMode(mode) {
    if (!this.modes[mode] || !this.modes[mode].enabled) {
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

  _spawnModeEntities() {
    if (!this.entityManager) return;
    
    switch (this.currentMode) {
      case 'collection':
        this.entityManager.spawnCollectiblesForCollection(8);
        break;
      case 'survival':
        this.entityManager.spawnHazardsForSurvival(10);
        this.modeState.timer = 0;
        break;
      case 'time-trial':
        this.entityManager.spawnCheckpointsForTimeTrial(5);
        this.modeState.timer = 0;
        break;
      default:
        this.entityManager.clearAll();
        break;
    }
  }

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

  getMode() {
    return this.currentMode;
  }

  getModeConfig() {
    return this.modes[this.currentMode];
  }

  getModeConfigByKey(modeKey) {
    return this.modes[modeKey] || null;
  }

  resetModeState() {
    this.modeState = {
      timer: 0,
      score: 0,
      items: [],
      hazards: [],
      checkpoints: [],
      startTime: null,
      bestTime: null,
      lastTime: null,
      isComplete: false,
      isPaused: false,
      isStarted: false
    };
  }

  startMode() {
    this.modeState.isStarted = true;
    this.modeState.isPaused = false;
    
    if (this.currentMode === 'time-trial' || this.currentMode === 'survival') {
      this.modeState.startTime = Date.now() / 1000;
    }
  }

  pause() {
    this.modeState.isPaused = true;
  }

  resume() {
    this.modeState.isPaused = false;
  }

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

  getDisplayInfo() {
    const mode = this.currentMode;
    const config = this.modes[mode];
    
    switch (mode) {
      case 'time-trial':
        const checkpointsInfo = this.entityManager 
          ? `${this.entityManager.getActivatedCheckpoints()}/${this.entityManager.getAllCheckpoints()}`
          : '';
        const completeText = this.modeState.isComplete ? ' ✓ All Shrines Activated!' : '';
        const bestTimeText = this.modeState.bestTime 
          ? ` | Best: ${this.formatTime(this.modeState.bestTime)}` 
          : '';
        return {
          mode: config.name,
          primary: this.formatTime(this.modeState.timer) + completeText + bestTimeText,
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
          ? ` | Best: ${this.formatTime(this.modeState.bestTime)}` 
          : '';
        const lastTimeText = this.modeState.lastTime 
          ? ` | Last: ${this.formatTime(this.modeState.lastTime)}` 
          : '';
        const survivalHighScoreText = this.modeState.highScore > 0 ? ` | High: ${this.modeState.highScore}` : '';
        return {
          mode: config.name,
          primary: this.formatTime(this.modeState.timer) + survivalBestTimeText + lastTimeText,
          secondary: `Spirit Power: ${this.modeState.score}${survivalHighScoreText}`
        };
      default:
        return {
          mode: null,
          primary: null,
          secondary: null
        };
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }

  addScore(points) {
    this.modeState.score += points;
    // Update high score if current score exceeds it
    if (this.modeState.score > this.modeState.highScore) {
      this.modeState.highScore = this.modeState.score;
      setHighScore(this.currentMode, this.modeState.highScore, this.currentArena);
    }
  }

  collectItem(itemId) {
    if (!this.modeState.items.includes(itemId)) {
      this.modeState.items.push(itemId);
      this.addScore(10);
      return true;
    }
    return false;
  }

  handleEntityCollision(collision) {
    if (!collision) return;

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
          this.addScore(20);
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

  getAllModes() {
    return Object.keys(this.modes).filter(key => this.modes[key].enabled);
  }
}

