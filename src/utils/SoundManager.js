import { getSoundEffectsVolume, getBackgroundCinematicVolume } from './StorageUtils.js';
import { tryLoadAudio, tryLoadAudioWithFallback, getAudioPath, loadCustomAudio } from './AudioLoader.js';
import { isSoundEnabled, getSoundValue } from '../config/global/SoundConfig.js';

export class SoundManager {
  constructor(customFootstepPath = null, customObstacleFootstepPath = null, customJumpPath = null, customObstacleJumpPath = null) {
    this.audioContext = null;
    this.masterVolume = 0.15; // Default volume (0-1) - DEPRECATED: Use soundEffectsVolume instead
    this.soundEnabled = true;
    this.customFootstepPath = customFootstepPath;
    this.customObstacleFootstepPath = customObstacleFootstepPath;
    this.customJumpPath = customJumpPath;
    this.customObstacleJumpPath = customObstacleJumpPath;
    this.footstepAudio = null;
    this.obstacleFootstepAudio = null;
    this.jumpAudio = null;
    this.obstacleJumpAudio = null;
    this.flyAudio = null;
    this.currentFlySound = null; // Track currently playing fly sound to stop it
    this.backgroundMusic = null;
    this.backgroundMusicPath = null;
    this.backgroundMusicVolume = 0.06; // Quiet first-render default - will be loaded from storage via initFromStorage
    this.soundEffectsVolume = 0.15; // Sound effects volume (0-1) - will be loaded from storage via initFromStorage
    
    // Cache for loaded custom audio files
    this.customAudioCache = new Map();

    // Procedural drum loop state (layered over background music)
    this._drumTimer = null;
    this._drumNextStep = 0;
    this._drumScheduledUntil = 0;
    this._drumStepIndex = 0;
    this._drumNoiseBuffer = null;
    this._drumBarActive = false; // re-rolled at each bar boundary for sparse playback

    // Intermittent background-music state
    this._musicSegmentTimer = null;
    this._musicFadeTimer = null;
    this._musicActive = false;     // true = currently inside an on-segment
    this._musicSegmentEnabled = false; // master switch for the scheduler loop

    // Live performance state — drums + ambience react to player activity.
    // intensity ramps toward intensityTarget; targets come from action bumps
    // (notifyAction) and movement state (notifyMovementState). Idle clients
    // drift to ~0, which ducks drum volume and slows the ambient wood scheduler.
    this._intensity = 0;
    this._intensityTarget = 0;
    this._movementIntensity = 0;
    this._actionIntensity = 0;
    this._lastActionTime = 0;
    this._lastIntensityTickMs = 0;
    this._intensityTimer = null;

    // Ambient wood SFX scheduler state
    this._ambientWoodTimer = null;
    
    // Listener position for distance-based volume (player position)
    this.listenerPosition = null;
    
    // Distance-based volume settings
    this.maxHearingDistance = 50; // Maximum distance at which sound is audible
    this.minVolumeDistance = 5; // Distance at which sound starts to fade (minimum distance for full volume)
    
    // Initialize volumes from storage
    this.initFromStorage();
    
    this._initAudioContext();
    // Load sounds asynchronously (fire-and-forget in constructor)
    // These will be properly loaded via loadFootstepSound/etc methods during character initialization
    if (customFootstepPath) {
      this._loadCustomFootstep(customFootstepPath).catch(() => {
        // Silently handle errors in constructor
      });
    }
    if (customObstacleFootstepPath) {
      this._loadCustomObstacleFootstep(customObstacleFootstepPath).catch(() => {
        // Silently handle errors in constructor
      });
    }
    if (customJumpPath) {
      this._loadCustomJump(customJumpPath).catch(() => {
        // Silently handle errors in constructor
      });
    }
    if (customObstacleJumpPath) {
      this._loadCustomObstacleJump(customObstacleJumpPath).catch(() => {
        // Silently handle errors in constructor
      });
    }
  }

  /**
   * Set the listener position (player position) for distance-based volume calculations
   * @param {THREE.Vector3|Object} position - Position object with x, y, z or THREE.Vector3
   */
  setListenerPosition(position) {
    if (!position) {
      this.listenerPosition = null;
      return;
    }
    
    // Extract x, y, z from position object or Vector3
    if (position.x !== undefined && position.y !== undefined && position.z !== undefined) {
      this.listenerPosition = { x: position.x, y: position.y, z: position.z };
    }
  }

  /**
   * Calculate distance-based volume multiplier
   * Uses inverse distance falloff: volume decreases as distance increases
   * @param {Object|THREE.Vector3} soundPosition - Sound position with x, y, z
   * @returns {number} Volume multiplier (0-1)
   */
  calculateDistanceVolume(soundPosition) {
    // If no listener position set, return full volume (backward compatibility)
    if (!this.listenerPosition || !soundPosition) {
      return 1.0;
    }
    
    // Extract coordinates
    const listenerX = this.listenerPosition.x || 0;
    const listenerY = this.listenerPosition.y || 0;
    const listenerZ = this.listenerPosition.z || 0;
    
    const soundX = soundPosition.x || 0;
    const soundY = soundPosition.y || 0;
    const soundZ = soundPosition.z || 0;
    
    // Calculate 3D distance
    const dx = soundX - listenerX;
    const dy = soundY - listenerY;
    const dz = soundZ - listenerZ;
    const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // If sound is very close, full volume
    if (distance <= this.minVolumeDistance) {
      return 1.0;
    }
    
    // If sound is beyond max hearing distance, no volume
    if (distance >= this.maxHearingDistance) {
      return 0.0;
    }
    
    // Inverse distance falloff between minVolumeDistance and maxHearingDistance
    // Volume = 1 - (distance - minVolumeDistance) / (maxHearingDistance - minVolumeDistance)
    const fadeRange = this.maxHearingDistance - this.minVolumeDistance;
    const volumeMultiplier = 1.0 - (distance - this.minVolumeDistance) / fadeRange;
    
    // Ensure volume is between 0 and 1
    return Math.max(0, Math.min(1, volumeMultiplier));
  }

  /**
   * Calculate volume with distance-based falloff
   * @param {number} baseVolume - Base volume (0-1)
   * @param {Object|THREE.Vector3} soundPosition - Optional sound position for distance calculation
   * @returns {number} Adjusted volume (0-1)
   */
  _getAdjustedVolume(baseVolume, soundPosition = null) {
    if (!soundPosition) {
      return baseVolume;
    }
    
    const distanceMultiplier = this.calculateDistanceVolume(soundPosition);
    return baseVolume * distanceMultiplier;
  }

  async _loadCustomFootstep(path) {
    // Clear existing audio if loading new one
    this.footstepAudio = null;
    
    if (!path) return;
    
    try {
      // Use AudioLoader which handles caching
      this.footstepAudio = await tryLoadAudio(path);
      if (!this.footstepAudio) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.footstepAudio = loadCustomAudio(path, this.soundEffectsVolume);
      } else {
        this.footstepAudio.volume = this.soundEffectsVolume;
      }
      
      if (this.footstepAudio) {
        // Handle loading errors gracefully
        this.footstepAudio.addEventListener('error', (e) => {
          this.footstepAudio = null;
          this._footstepReady = false;
        });
        
        // Mark as ready when loaded
        this.footstepAudio.addEventListener('canplaythrough', () => {
          this._footstepReady = true;
        }, { once: true });
        
        this.footstepAudio.addEventListener('loadeddata', () => {
          this._footstepReady = true;
        }, { once: true });
        
        // Initialize ready state
        this._footstepReady = false;
        
        // Try to load immediately if not already loaded
        if (this.footstepAudio.readyState === 0) {
          this.footstepAudio.load();
        } else {
          this._footstepReady = true;
        }
      }
    } catch (error) {
      this.footstepAudio = null;
      this._footstepReady = false;
    }
  }

  async _loadCustomObstacleFootstep(path) {
    // Clear existing audio if loading new one
    this.obstacleFootstepAudio = null;
    
    if (!path) return;
    
    try {
      // Use AudioLoader which handles caching
      this.obstacleFootstepAudio = await tryLoadAudio(path);
      if (!this.obstacleFootstepAudio) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.obstacleFootstepAudio = loadCustomAudio(path, this.soundEffectsVolume);
      } else {
        this.obstacleFootstepAudio.volume = this.soundEffectsVolume;
      }
      
      if (this.obstacleFootstepAudio) {
        // Handle loading errors gracefully
        this.obstacleFootstepAudio.addEventListener('error', (e) => {
          this.obstacleFootstepAudio = null;
          this._obstacleFootstepReady = false;
        });
        
        // Mark as ready when loaded
        this.obstacleFootstepAudio.addEventListener('canplaythrough', () => {
          this._obstacleFootstepReady = true;
        }, { once: true });
        
        this.obstacleFootstepAudio.addEventListener('loadeddata', () => {
          this._obstacleFootstepReady = true;
        }, { once: true });
        
        // Initialize ready state
        this._obstacleFootstepReady = false;
        
        // Try to load immediately if not already loaded
        if (this.obstacleFootstepAudio.readyState === 0) {
          this.obstacleFootstepAudio.load();
        } else {
          this._obstacleFootstepReady = true;
        }
      }
    } catch (error) {
      this.obstacleFootstepAudio = null;
    }
  }

  async loadFootstepSound(path) {
    this.customFootstepPath = path;
    await this._loadCustomFootstep(path);
  }

  async loadObstacleFootstepSound(path) {
    this.customObstacleFootstepPath = path;
    await this._loadCustomObstacleFootstep(path);
  }

  async _loadCustomJump(path) {
    // Clear existing audio if loading new one
    this.jumpAudio = null;
    
    if (!path) return;
    
    try {
      // Use AudioLoader which handles caching
      this.jumpAudio = await tryLoadAudio(path);
      if (!this.jumpAudio) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.jumpAudio = loadCustomAudio(path, this.soundEffectsVolume);
      } else {
        this.jumpAudio.volume = this.soundEffectsVolume;
      }
      
      if (this.jumpAudio) {
        // Handle loading errors gracefully
        this.jumpAudio.addEventListener('error', (e) => {
          this.jumpAudio = null;
          this._jumpReady = false;
        });
        
        // Mark as ready when loaded
        this.jumpAudio.addEventListener('canplaythrough', () => {
          this._jumpReady = true;
        }, { once: true });
        
        this.jumpAudio.addEventListener('loadeddata', () => {
          this._jumpReady = true;
        }, { once: true });
        
        // Initialize ready state
        this._jumpReady = false;
        
        // Try to load immediately if not already loaded
        if (this.jumpAudio.readyState === 0) {
          this.jumpAudio.load();
        } else {
          this._jumpReady = true;
        }
      }
    } catch (error) {
      this.jumpAudio = null;
      this._jumpReady = false;
    }
  }

  async _loadCustomObstacleJump(path) {
    // Clear existing audio if loading new one
    this.obstacleJumpAudio = null;
    
    if (!path) return;
    
    try {
      // Use AudioLoader which handles caching
      this.obstacleJumpAudio = await tryLoadAudio(path);
      if (!this.obstacleJumpAudio) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.obstacleJumpAudio = loadCustomAudio(path, this.soundEffectsVolume);
      } else {
        this.obstacleJumpAudio.volume = this.soundEffectsVolume;
      }
      
      if (this.obstacleJumpAudio) {
        // Handle loading errors gracefully
        this.obstacleJumpAudio.addEventListener('error', (e) => {
          this.obstacleJumpAudio = null;
          this._obstacleJumpReady = false;
        });
        
        // Mark as ready when loaded
        this.obstacleJumpAudio.addEventListener('canplaythrough', () => {
          this._obstacleJumpReady = true;
        }, { once: true });
        
        this.obstacleJumpAudio.addEventListener('loadeddata', () => {
          this._obstacleJumpReady = true;
        }, { once: true });
        
        // Initialize ready state
        this._obstacleJumpReady = false;
        
        // Try to load immediately if not already loaded
        if (this.obstacleJumpAudio.readyState === 0) {
          this.obstacleJumpAudio.load();
        } else {
          this._obstacleJumpReady = true;
        }
      }
    } catch (error) {
      this.obstacleJumpAudio = null;
    }
  }

  async loadJumpSound(path) {
    this.customJumpPath = path;
    await this._loadCustomJump(path);
  }

  async loadObstacleJumpSound(path) {
    this.customObstacleJumpPath = path;
    await this._loadCustomObstacleJump(path);
  }

  async _loadCustomFly(path) {
    // Clear existing audio if loading new one
    this.flyAudio = null;
    
    if (!path) return;
    
    try {
      // Use AudioLoader which handles caching
      this.flyAudio = await tryLoadAudio(path);
      if (!this.flyAudio) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.flyAudio = loadCustomAudio(path, this.soundEffectsVolume);
      } else {
        this.flyAudio.volume = this.soundEffectsVolume;
      }
      
      if (this.flyAudio) {
        // Handle loading errors gracefully
        this.flyAudio.addEventListener('error', (e) => {
          this.flyAudio = null;
          this._flyReady = false;
        });
        
        // Mark as ready when loaded
        this.flyAudio.addEventListener('canplaythrough', () => {
          this._flyReady = true;
        }, { once: true });
        
        this.flyAudio.addEventListener('loadeddata', () => {
          this._flyReady = true;
        }, { once: true });
        
        // Initialize ready state
        this._flyReady = false;
        
        // Try to load immediately if not already loaded
        if (this.flyAudio.readyState === 0) {
          this.flyAudio.load();
        } else {
          this._flyReady = true;
        }
      }
    } catch (error) {
      this.flyAudio = null;
      this._flyReady = false;
    }
  }

  async loadFlySound(path) {
    await this._loadCustomFly(path);
  }

  /**
   * Initialize volumes from storage
   */
  initFromStorage() {
    try {
      this.soundEffectsVolume = getSoundEffectsVolume();
      this.backgroundMusicVolume = getBackgroundCinematicVolume();
      this.masterVolume = this.soundEffectsVolume; // Keep for backward compatibility
    } catch (error) {
      // Use defaults if storage read fails
      this.soundEffectsVolume = 0.15;
      this.backgroundMusicVolume = 0.06;
      this.masterVolume = 0.15;
    }
  }

  _initAudioContext() {
    try {
      // Create audio context - may need user interaction first
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      this.soundEnabled = false;
    }
  }

  _ensureAudioContext() {
    if (!this.audioContext || this.audioContext.state === 'suspended') {
      try {
        if (this.audioContext) {
          this.audioContext.resume();
        } else {
          this._initAudioContext();
        }
      } catch (error) {
        // Audio context resume failed
      }
    }
    return this.audioContext && this.audioContext.state === 'running';
  }

  /**
   * Play jump sound when jumping - uses dedicated jump sound if available, otherwise falls back to footstep sound
   * @param {boolean} isObstacle - Currently unused, kept for API compatibility
   */
  playJump(isObstacle = false) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('movement', 'jump')) return;
    this.notifyAction('jump', 0.6);

    // Always use the same jump audio for all jumps (ground and obstacle)
    if (this.jumpAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA = 2)
        // HAVE_FUTURE_DATA = 2, HAVE_ENOUGH_DATA = 4
        const isReady = this.jumpAudio.readyState >= 2 || this._jumpReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.jumpAudio.cloneNode();
          audioClone.volume = this.soundEffectsVolume;
          audioClone.currentTime = 0;
          
          // Try to play - if it fails, fall back to footstep sound
          const playPromise = audioClone.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Successfully started playing jump sound
                return;
              })
              .catch(err => {
                // Auto-play may be blocked or audio failed to load, fall back to footstep
              });
            return; // Return immediately, promise will handle success/failure
          } else {
            // Play started synchronously (older browsers)
            return;
          }
        } else {
          // Audio not ready yet, try to load
          if (this.jumpAudio.readyState === 0) {
            // Not loaded at all, trigger load
            this.jumpAudio.load();
          }
          // Fall through to footstep fallback below
        }
      } catch (err) {
        // Fall through to footstep fallback below
      }
    }

    // Fallback: Use obstacle footstep audio for obstacle jumps (if available)
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        const audioClone = this.obstacleFootstepAudio.cloneNode();
        audioClone.volume = this.soundEffectsVolume * 0.6; // 60% of normal volume (quieter)
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          // Error playing jump sound
        });
        return;
      } catch (err) {
        // Fall through to procedural
      }
    }

    // Fallback: Use base footstep audio for base ground jumps (if available)
    if (!isObstacle && this.footstepAudio) {
      try {
        const audioClone = this.footstepAudio.cloneNode();
        audioClone.volume = this.soundEffectsVolume * 0.6; // 60% of normal volume (quieter)
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          // Error playing jump sound
        });
        return;
      } catch (err) {
        // Fall through to procedural
      }
    }

    // Fallback to procedural footstep sound but quieter
    if (!this._ensureAudioContext()) return;

    // Use the same procedural sound as footstep but at reduced volume
    const now = this.audioContext.currentTime;

    if (isObstacle) {
      // Obstacle footstep sound but quieter
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(120, now);
      oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.12, now + 0.005); // Reduced volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscillator.start(now);
      oscillator.stop(now + 0.08);

      const ringOsc = this.audioContext.createOscillator();
      const ringGain = this.audioContext.createGain();

      ringOsc.connect(ringGain);
      ringGain.connect(this.audioContext.destination);

      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(400, now);
      ringOsc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

      ringGain.gain.setValueAtTime(0, now);
      ringGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.048, now + 0.01); // Reduced volume
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      ringOsc.start(now);
      ringOsc.stop(now + 0.1);
    } else {
      // Base ground footstep sound but quieter
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.09, now + 0.01); // Reduced volume
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);

      const clickOsc = this.audioContext.createOscillator();
      const clickGain = this.audioContext.createGain();

      clickOsc.connect(clickGain);
      clickGain.connect(this.audioContext.destination);

      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

      clickGain.gain.setValueAtTime(0, now);
      clickGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.03, now + 0.005); // Reduced volume
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);
    }
  }

  /**
   * Play fly sound when starting to fly
   */
  playFly() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('movement', 'fly')) return;
    this.notifyAction('fly', 0.5);
    this.notifyMovementState({ isMoving: true, isRunning: false, isGrounded: false });

    // Stop any currently playing fly sound first
    this.stopFly();

    if (this.flyAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA = 2)
        const isReady = this.flyAudio.readyState >= 2 || this._flyReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.flyAudio.cloneNode();
          audioClone.volume = this.soundEffectsVolume;
          audioClone.currentTime = 0;
          
          // Track the currently playing sound so we can stop it later
          this.currentFlySound = audioClone;
          
          // Try to play
          const playPromise = audioClone.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Successfully started playing fly sound
                return;
              })
              .catch(err => {
                // Auto-play may be blocked or audio failed to load
                this.currentFlySound = null;
              });
            return;
          } else {
            // Play started synchronously (older browsers)
            return;
          }
        } else {
          // Audio not ready yet, try to load
          if (this.flyAudio.readyState === 0) {
            // Not loaded at all, trigger load
            this.flyAudio.load();
          }
        }
      } catch (err) {
        // Error playing fly sound
        this.currentFlySound = null;
      }
    }

    // Fallback to procedural fly sound
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    
    // Create a whoosh/ascending sound for flying
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Ascending whoosh sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.4, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);

    // Add a subtle high-frequency lift sound
    const liftOsc = this.audioContext.createOscillator();
    const liftGain = this.audioContext.createGain();

    liftOsc.connect(liftGain);
    liftGain.connect(this.audioContext.destination);

    liftOsc.type = 'sine';
    liftOsc.frequency.setValueAtTime(300, now);
    liftOsc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

    liftGain.gain.setValueAtTime(0, now);
    liftGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.2, now + 0.005);
    liftGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    liftOsc.start(now);
    liftOsc.stop(now + 0.1);
  }

  /**
   * Stop currently playing fly sound
   */
  stopFly() {
    if (this.currentFlySound) {
      try {
        this.currentFlySound.pause();
        this.currentFlySound.currentTime = 0;
        this.currentFlySound = null;
      } catch (err) {
        // Error stopping fly sound
        this.currentFlySound = null;
      }
    }
  }

  /**
   * Play landing sound when jumping and landing
   * @param {boolean} isObstacle - If true, plays obstacle/platform landing sound
   */
  playLanding(isObstacle = false) {
    if (!this.soundEnabled) return;
    if (isObstacle && !isSoundEnabled('movement', 'landingObstacle')) return;
    if (!isObstacle && !isSoundEnabled('movement', 'landingGround')) return;

    // Layer a procedural wood thud on top of the landing sound
    const woodKey = isObstacle ? 'onLandingObstacle' : 'onLandingGround';
    if (isSoundEnabled('wood', woodKey)) {
      const landingVol = getSoundValue('wood', 'landingVolume', 0.7);
      this._playWoodKnock(isObstacle ? landingVol * 1.15 : landingVol);
    }
    this.notifyAction('landing', 0.55);

    // For landing, we can reuse the footstep sounds but potentially with different volume
    // Or play a slightly different version. For now, we'll use footstep sounds but louder
    // to simulate impact. If custom landing sounds are added later, we can load them separately.
    
    // Use obstacle footstep audio for obstacle landings (if available)
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        const audioClone = this.obstacleFootstepAudio.cloneNode();
        audioClone.volume = this.soundEffectsVolume * 1.5; // 50% louder for impact
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          // Error playing landing sound
        });
        return;
      } catch (err) {
        // Fall through to procedural
      }
    }

    // Use base footstep audio for base ground landings (if available)
    if (!isObstacle && this.footstepAudio) {
      try {
        const audioClone = this.footstepAudio.cloneNode();
        audioClone.volume = this.soundEffectsVolume * 1.5; // 50% louder for impact
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          // Error playing landing sound
        });
        return;
      } catch (err) {
        // Fall through to procedural
      }
    }

    // Fallback to procedural landing sound (louder/deeper than footstep)
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    if (isObstacle) {
      // Obstacle landing - harder impact with more reverb
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Deeper, more impactful sound for obstacle landing
      oscillator.type = 'square';
      oscillator.frequency.setValueAtTime(100, now);
      oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.12);

      // Stronger impact envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.3, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      oscillator.start(now);
      oscillator.stop(now + 0.12);

      // Add metallic impact ring
      const ringOsc = this.audioContext.createOscillator();
      const ringGain = this.audioContext.createGain();

      ringOsc.connect(ringGain);
      ringGain.connect(this.audioContext.destination);

      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(350, now);
      ringOsc.frequency.exponentialRampToValueAtTime(150, now + 0.15);

      ringGain.gain.setValueAtTime(0, now);
      ringGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.12, now + 0.015);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      ringOsc.start(now);
      ringOsc.stop(now + 0.15);
    } else {
      // Base ground landing - deep thud
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Deeper thud for landing impact
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(60, now);
      oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.15);

      // Stronger impact envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.25, now + 0.015);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      oscillator.start(now);
      oscillator.stop(now + 0.15);

      // Add subtle low-frequency rumble
      const rumbleOsc = this.audioContext.createOscillator();
      const rumbleGain = this.audioContext.createGain();

      rumbleOsc.connect(rumbleGain);
      rumbleGain.connect(this.audioContext.destination);

      rumbleOsc.type = 'sine';
      rumbleOsc.frequency.setValueAtTime(120, now);
      rumbleOsc.frequency.exponentialRampToValueAtTime(60, now + 0.1);

      rumbleGain.gain.setValueAtTime(0, now);
      rumbleGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.08, now + 0.01);
      rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      rumbleOsc.start(now);
      rumbleOsc.stop(now + 0.1);
    }
  }

  /**
   * Play footstep sound - uses custom audio file if available, otherwise generates procedural sound
   * @param {boolean} isObstacle - If true, plays obstacle/platform footstep sound
   */
  playFootstep(isObstacle = false, isRunning = false) {
    if (!this.soundEnabled) return;
    if (isObstacle && !isSoundEnabled('movement', 'footstepObstacle')) return;
    if (!isObstacle && !isSoundEnabled('movement', 'footstepGround')) return;

    // Drive the live drum performance: each footstep pulses movement intensity.
    this.notifyMovementState({ isMoving: true, isRunning, isGrounded: true });
    this.notifyAction(isRunning ? 'run' : 'walk', isRunning ? 0.55 : 0.35);

    // Layer a procedural wood knock on top of the regular footstep sound
    const woodKey = isObstacle ? 'onFootstepObstacle' : 'onFootstepGround';
    if (isSoundEnabled('wood', woodKey)) {
      const stepVol = getSoundValue('wood', 'stepVolume', 0.45);
      this._playWoodKnock(isObstacle ? stepVol * 1.1 : stepVol);
    }

    // Use obstacle-specific audio if available and on obstacle
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA)
        // HAVE_FUTURE_DATA = 2, HAVE_ENOUGH_DATA = 4
        const isReady = this.obstacleFootstepAudio.readyState >= 2 || this._obstacleFootstepReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.obstacleFootstepAudio.cloneNode();
          audioClone.volume = this.soundEffectsVolume;
          audioClone.currentTime = 0;
          
          // Try to play - if it fails, fall back to procedural
          const playPromise = audioClone.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Successfully started playing custom sound
                return;
              })
              .catch(err => {
                // Auto-play may be blocked or audio failed to load, fall back to procedural
                // Fall through to procedural sound
                this._playProceduralFootstep(isObstacle);
              });
            return; // Return immediately, promise will handle success/failure
          } else {
            // Play started synchronously (older browsers)
            return;
          }
        } else {
          // Audio not ready yet, wait for it or fall back
          if (this.obstacleFootstepAudio.readyState === 0) {
            // Not loaded at all, trigger load
            this.obstacleFootstepAudio.load();
          }
          // Fall through to procedural sound while waiting
          this._playProceduralFootstep(isObstacle);
          return;
        }
      } catch (err) {
        // Fall through to procedural sound
        this._playProceduralFootstep(isObstacle);
        return;
      }
    }

    // Use custom audio file if available (for base ground)
    if (!isObstacle && this.footstepAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA)
        // HAVE_FUTURE_DATA = 2, HAVE_ENOUGH_DATA = 4
        const isReady = this.footstepAudio.readyState >= 2 || this._footstepReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.footstepAudio.cloneNode();
          audioClone.volume = this.soundEffectsVolume;
          audioClone.currentTime = 0;
          
          // Try to play - if it fails, fall back to procedural
          const playPromise = audioClone.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                // Successfully started playing custom sound
                return;
              })
              .catch(err => {
                // Auto-play may be blocked or audio failed to load, fall back to procedural
                // Fall through to procedural sound
                this._playProceduralFootstep(isObstacle);
              });
            return; // Return immediately, promise will handle success/failure
          } else {
            // Play started synchronously (older browsers)
            return;
          }
        } else {
          // Audio not ready yet, wait for it or fall back
          if (this.footstepAudio.readyState === 0) {
            // Not loaded at all, trigger load
            this.footstepAudio.load();
          }
          // Fall through to procedural sound while waiting
          this._playProceduralFootstep(isObstacle);
          return;
        }
      } catch (err) {
        // Fall through to procedural sound
        this._playProceduralFootstep(isObstacle);
        return;
      }
    }

    // Fallback to procedural sound (no custom audio available)
    this._playProceduralFootstep(isObstacle);
  }

  /**
   * Internal method to play procedural footstep sound
   * @param {boolean} isObstacle - If true, plays obstacle/platform footstep sound
   * @private
   */
  _playProceduralFootstep(isObstacle) {
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    if (isObstacle) {
      // Obstacle/platform footstep - harder, more metallic/clangy sound
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Create a harder, higher-frequency impact sound for obstacles
      oscillator.type = 'square'; // Square wave for more metallic sound
      oscillator.frequency.setValueAtTime(120, now);
      oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      // Quick attack with sharper decay
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.2, now + 0.005);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      oscillator.start(now);
      oscillator.stop(now + 0.08);

      // Add a metallic ring
      const ringOsc = this.audioContext.createOscillator();
      const ringGain = this.audioContext.createGain();

      ringOsc.connect(ringGain);
      ringGain.connect(this.audioContext.destination);

      ringOsc.type = 'sine';
      ringOsc.frequency.setValueAtTime(400, now);
      ringOsc.frequency.exponentialRampToValueAtTime(200, now + 0.1);

      ringGain.gain.setValueAtTime(0, now);
      ringGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.08, now + 0.01);
      ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      ringOsc.start(now);
      ringOsc.stop(now + 0.1);
    } else {
      // Base ground footstep - soft thump
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      // Create a low-frequency thump sound
      oscillator.type = 'sawtooth';
      oscillator.frequency.setValueAtTime(80, now);
      oscillator.frequency.exponentialRampToValueAtTime(40, now + 0.1);

      // Quick attack and decay envelope
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.15, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      oscillator.start(now);
      oscillator.stop(now + 0.1);

      // Add a subtle high-frequency click for texture
      const clickOsc = this.audioContext.createOscillator();
      const clickGain = this.audioContext.createGain();

      clickOsc.connect(clickGain);
      clickGain.connect(this.audioContext.destination);

      clickOsc.type = 'sine';
      clickOsc.frequency.setValueAtTime(200, now);
      clickOsc.frequency.exponentialRampToValueAtTime(100, now + 0.05);

      clickGain.gain.setValueAtTime(0, now);
      clickGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.05, now + 0.005);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);
    }
  }

  setVolume(volume) {
    // Legacy method - maps to sound effects volume
    this.setSoundEffectsVolume(volume);
  }

  /**
   * Set sound effects volume (for footsteps, jumps, etc.)
   * @param {number} volume - Volume level (0-1)
   */
  setSoundEffectsVolume(volume) {
    this.soundEffectsVolume = Math.max(0, Math.min(1, volume));
    this.masterVolume = this.soundEffectsVolume; // Keep for backward compatibility
    if (this.footstepAudio) {
      this.footstepAudio.volume = this.soundEffectsVolume;
    }
    if (this.obstacleFootstepAudio) {
      this.obstacleFootstepAudio.volume = this.soundEffectsVolume;
    }
    if (this.jumpAudio) {
      this.jumpAudio.volume = this.soundEffectsVolume;
    }
    if (this.obstacleJumpAudio) {
      this.obstacleJumpAudio.volume = this.soundEffectsVolume;
    }
    if (this.flyAudio) {
      this.flyAudio.volume = this.soundEffectsVolume;
    }
  }

  /**
   * Get current sound effects volume
   * @returns {number} Current sound effects volume (0-1)
   */
  getSoundEffectsVolume() {
    return this.soundEffectsVolume;
  }

  enable() {
    this.soundEnabled = true;
  }

  disable() {
    this.soundEnabled = false;
  }

  /**
   * Load background music from a file path (uses AudioLoader cache)
   * @param {string} path - Path to background music file
   */
  async loadBackgroundMusic(path) {
    if (!path) {
      return;
    }

    this.backgroundMusicPath = path;

    // Stop and remove existing background music if any
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
      this.backgroundMusic = null;
    }

    try {
      // Use AudioLoader which handles caching (use longer timeout for large files)
      this.backgroundMusic = await tryLoadAudio(path, 10000);
      if (!this.backgroundMusic) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.backgroundMusic = loadCustomAudio(path, this.backgroundMusicVolume);
      } else {
        this.backgroundMusic.volume = this.backgroundMusicVolume;
      }
      
      if (this.backgroundMusic) {
        const intermittent = isSoundEnabled('music', 'backgroundIntermittent');
        // In intermittent mode we manage looping ourselves; otherwise loop continuously.
        this.backgroundMusic.loop = !intermittent;

        // Handle loading errors gracefully
        this.backgroundMusic.addEventListener('error', () => {
          this.backgroundMusic = null;
        });

        const kickoff = () => {
          if (intermittent) {
            this._startMusicSegments();
          } else {
            this.playBackgroundMusic();
          }
        };

        // Auto-play when loaded (only if not already playing)
        if (this.backgroundMusic.readyState >= 3) {
          kickoff();
        } else {
          this.backgroundMusic.addEventListener('canplaythrough', () => {
            kickoff();
            setTimeout(() => {
              if (!intermittent && !this.isBackgroundMusicPlaying()) {
                this._backgroundMusicPlaying = false;
              }
            }, 100);
          }, { once: true });
        }

        // Don't call load() if already loaded - it causes unnecessary network requests
        if (this.backgroundMusic.readyState === 0 && !this.backgroundMusic.src) {
          this.backgroundMusic.load();
        } else {
          kickoff();
        }
      }
    } catch (error) {
      this.backgroundMusic = null;
    }
  }

  /**
   * Play background music (loops automatically)
   */
  playBackgroundMusic() {
    if (!this.backgroundMusic) {
      return;
    }

    if (!this.soundEnabled) {
      return;
    }

    if (!isSoundEnabled('music', 'background')) {
      return;
    }

    // Note: AudioContext is not needed for HTML5 Audio elements (background music)
    // It's only used for procedural sounds via Web Audio API

    try {
      const playPromise = this.backgroundMusic.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this._backgroundMusicPlaying = true;
            this._startDrumLoop();
            this._startAmbientWood();
          })
          .catch(err => {
            // Silently handle autoplay blocking - it's expected behavior in browsers
            this._backgroundMusicPlaying = false;
          });
      } else {
        this._startDrumLoop();
        this._startAmbientWood();
      }
    } catch (err) {
      // Silently handle autoplay blocking - it's expected behavior in browsers
      this._backgroundMusicPlaying = false;
    }
  }

  /**
   * Pause background music
   */
  pauseBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
    } catch (err) {
      // Error pausing background music
    }
    this._stopMusicSegments();
    this._stopDrumLoop();
    this._stopAmbientWood();
  }

  /**
   * Stop background music (pauses and resets to beginning)
   */
  stopBackgroundMusic() {
    if (!this.backgroundMusic) return;

    try {
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
    } catch (err) {
      // Error stopping background music
    }
    this._stopMusicSegments();
    this._stopDrumLoop();
    this._stopAmbientWood();
  }

  /**
   * Set background music volume (separate from sound effects)
   * @param {number} volume - Volume level (0-1)
   */
  setBackgroundMusicVolume(volume) {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      // In intermittent mode, only push the new volume when we're in an
      // on-segment; otherwise silent gaps stay silent.
      if (this._musicSegmentEnabled && !this._musicActive) {
        this.backgroundMusic.volume = 0;
      } else {
        this.backgroundMusic.volume = this.backgroundMusicVolume;
      }
    }
  }

  /**
   * Get current background music volume
   * @returns {number} Current background music volume (0-1)
   */
  getBackgroundMusicVolume() {
    return this.backgroundMusicVolume;
  }

  /**
   * Check if background music is currently playing
   * @returns {boolean} True if background music is playing
   */
  isBackgroundMusicPlaying() {
    return this.backgroundMusic && !this.backgroundMusic.paused && !this.backgroundMusic.ended;
  }

  /**
   * Play mortar explosion sound - tries custom sound first, falls back to procedural
   * For Herald, the sound loops until stopped
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   * @param {string} characterName - Optional character name for character-specific mortar explosion sound
   * @returns {Object|null} Sound control object with stop() method for Herald, null for others
   */
  async playMortarExplosion(position = null, characterName = null) {
    if (!this.soundEnabled) return null;
    if (!isSoundEnabled('abilities', 'mortarExplosion')) return null;
    this.notifyAction('mortarExplosion', 0.9);
    
    const normalizedName = characterName && characterName.toLowerCase();
    const isHerald = normalizedName === 'herald' || normalizedName === 'babyherald';
    
    // Try character-specific sound first (in characters folder, consistent with other character sounds)
    if (characterName) {
      // Try characters folder first: /assets/characters/{characterName}/mortar_explosion.wav or mortar_splash.wav
      const normalizedCharacterName = characterName.toLowerCase();
      
      // Try mortar_explosion first with format fallback
      let characterSoundPath = `/assets/characters/${normalizedCharacterName}/mortar_explosion`;
      
      // Check SoundManager cache first
      if (!this.customAudioCache.has(characterSoundPath)) {
        let loadedAudio = await tryLoadAudioWithFallback(characterSoundPath);
        if (loadedAudio) {
          this.customAudioCache.set(characterSoundPath, loadedAudio);
        } else {
          // If not found, try mortar_splash as alternative name
          const splashPath = `/assets/characters/${normalizedCharacterName}/mortar_splash`;
          loadedAudio = await tryLoadAudioWithFallback(splashPath);
          if (loadedAudio) {
            // Cache under the original path name for consistency
            this.customAudioCache.set(characterSoundPath, loadedAudio);
          }
        }
      }
      
      let characterAudio = this.customAudioCache.get(characterSoundPath);
      if (characterAudio) {
        // Clone for independent playback
        characterAudio = characterAudio.cloneNode();
      }
      
      if (characterAudio) {
        try {
          characterAudio.currentTime = 0;
          const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume, position);
          characterAudio.volume = adjustedVolume;
          
          // For Herald, loop the sound
          if (isHerald) {
            characterAudio.loop = true;
            await characterAudio.play();
            // Return control object to stop the sound later
            return {
              audio: characterAudio,
              stop: () => {
                if (characterAudio) {
                  characterAudio.pause();
                  characterAudio.currentTime = 0;
                  characterAudio.loop = false;
                }
              }
            };
          } else {
            // For other characters, play once
            await characterAudio.play();
            return null;
          }
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
      
      // Also try abilities folder: /assets/audio/abilities/{characterName}/mortar_explosion.wav
      const characterAbilitiesPath = getAudioPath('abilities', 'mortar', 'mortar_explosion', normalizedCharacterName);
      const characterAbilitiesAudio = await tryLoadAudio(characterAbilitiesPath);
      if (characterAbilitiesAudio) {
        try {
          characterAbilitiesAudio.currentTime = 0;
          const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume, position);
          characterAbilitiesAudio.volume = adjustedVolume;
          
          // For Herald, loop the sound
          if (isHerald) {
            characterAbilitiesAudio.loop = true;
            await characterAbilitiesAudio.play();
            return {
              audio: characterAbilitiesAudio,
              stop: () => {
                if (characterAbilitiesAudio) {
                  characterAbilitiesAudio.pause();
                  characterAbilitiesAudio.currentTime = 0;
                  characterAbilitiesAudio.loop = false;
                }
              }
            };
          } else {
            await characterAbilitiesAudio.play();
            return null;
          }
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
    }
    
    // Fall back to generic mortar explosion sound
    const genericPath = getAudioPath('abilities', 'mortar', 'mortar_explosion');
    const genericAudio = await tryLoadAudio(genericPath);
    if (genericAudio) {
      try {
        genericAudio.currentTime = 0;
        const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume, position);
        genericAudio.volume = adjustedVolume;
        
        // For Herald, loop the sound
        if (isHerald) {
          genericAudio.loop = true;
          await genericAudio.play();
          return {
            audio: genericAudio,
            stop: () => {
              if (genericAudio) {
                genericAudio.pause();
                genericAudio.currentTime = 0;
                genericAudio.loop = false;
              }
            }
          };
        } else {
          await genericAudio.play();
          return null;
        }
      } catch (error) {
        // Play failed, continue to procedural fallback
      }
    }
    
    // Final fallback to procedural sound (doesn't loop)
    this._playMortarExplosionProcedural(position);
    return null;
  }

  /**
   * Procedural mortar explosion sound
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   */
  _playMortarExplosionProcedural(position = null) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const distanceMultiplier = position ? this.calculateDistanceVolume(position) : 1.0;

    // Main explosion - deep rumble
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Deep explosion sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(60, now);
    oscillator.frequency.exponentialRampToValueAtTime(30, now + 0.3);

    // Loud explosion envelope with distance adjustment
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.8 * distanceMultiplier, now + 0.01); // 80% louder
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);

    // High-frequency crack/impact
    const crackOsc = this.audioContext.createOscillator();
    const crackGain = this.audioContext.createGain();

    crackOsc.connect(crackGain);
    crackGain.connect(this.audioContext.destination);

    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(400, now);
    crackOsc.frequency.exponentialRampToValueAtTime(200, now + 0.15);

    crackGain.gain.setValueAtTime(0, now);
    crackGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.6 * distanceMultiplier, now + 0.005);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    crackOsc.start(now);
    crackOsc.stop(now + 0.15);

    // Low-frequency rumble
    const rumbleOsc = this.audioContext.createOscillator();
    const rumbleGain = this.audioContext.createGain();

    rumbleOsc.connect(rumbleGain);
    rumbleGain.connect(this.audioContext.destination);

    rumbleOsc.type = 'sine';
    rumbleOsc.frequency.setValueAtTime(40, now);
    rumbleOsc.frequency.exponentialRampToValueAtTime(20, now + 0.4);

    rumbleGain.gain.setValueAtTime(0, now);
    rumbleGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.7 * distanceMultiplier, now + 0.02);
    rumbleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    rumbleOsc.start(now);
    rumbleOsc.stop(now + 0.4);
  }


  /**
   * Play mortar launch sound - tries custom sound first, falls back to procedural
   * @param {string} characterName - Optional character name for character-specific mortar launch sound
   */
  async playMortarLaunch(characterName = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'mortarLaunch')) return;
    this.notifyAction('mortar', 0.85);
    
    // Try character-specific sound first (in characters folder, consistent with other character sounds)
    if (characterName) {
      // Ensure character name is lowercase
      const normalizedCharacterName = characterName.toLowerCase();
      // Try characters folder first: /assets/characters/{characterName}/mortar_launch.wav
      const characterSoundPath = `/assets/characters/${normalizedCharacterName}/mortar_launch`;
      
      // Check SoundManager cache first to avoid reloading
      if (!this.customAudioCache.has(characterSoundPath)) {
        const loadedAudio = await tryLoadAudioWithFallback(characterSoundPath);
        if (loadedAudio) {
          this.customAudioCache.set(characterSoundPath, loadedAudio);
        }
      }
      
      let characterAudio = this.customAudioCache.get(characterSoundPath);
      if (characterAudio) {
        // Clone for independent playback
        characterAudio = characterAudio.cloneNode();
      }
      
      if (characterAudio) {
        try {
          characterAudio.currentTime = 0;
          characterAudio.volume = this.soundEffectsVolume;
          await characterAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
      
      // Also try abilities folder: /assets/audio/abilities/{characterName}/mortar_launch.wav
      const characterAbilitiesPath = getAudioPath('abilities', 'mortar', 'mortar_launch', normalizedCharacterName);
      const characterAbilitiesAudio = await tryLoadAudio(characterAbilitiesPath);
      if (characterAbilitiesAudio) {
        try {
          characterAbilitiesAudio.currentTime = 0;
          characterAbilitiesAudio.volume = this.soundEffectsVolume;
          await characterAbilitiesAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
    }
    
    // Fall back to generic mortar launch sound
    const genericPath = getAudioPath('abilities', 'mortar', 'mortar_launch');
    const genericAudio = await tryLoadAudio(genericPath);
    if (genericAudio) {
      try {
        genericAudio.currentTime = 0;
        genericAudio.volume = this.soundEffectsVolume;
        await genericAudio.play();
        return;
      } catch (error) {
        // Play failed, continue to procedural fallback
      }
    }
    
    // Final fallback to procedural sound
    this._playMortarLaunchProcedural();
  }

  /**
   * Procedural mortar launch sound
   */
  _playMortarLaunchProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;

    // Launch whoosh - fast frequency sweep
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Quick whoosh sound
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.2);

    // Loud launch envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.7, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);

    // Add high-frequency crack
    const crackOsc = this.audioContext.createOscillator();
    const crackGain = this.audioContext.createGain();

    crackOsc.connect(crackGain);
    crackGain.connect(this.audioContext.destination);

    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(600, now);
    crackOsc.frequency.exponentialRampToValueAtTime(300, now + 0.1);

    crackGain.gain.setValueAtTime(0, now);
    crackGain.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.5, now + 0.005);
    crackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    crackOsc.start(now);
    crackOsc.stop(now + 0.1);
  }

  /**
   * Play mortar arc sound - continuous whoosh during flight
   * DISABLED: Returns null to disable arc sound
   * @returns {Object|null} Audio context nodes for continuous playing/stopping (always null now)
   */
  playMortarArc() {
    // Arc sound disabled - return null immediately
    return null;
  }

  /**
   * Try to play custom audio file, fallback to procedural sound
   * @param {string} path - Path to custom audio file
   * @param {Function} proceduralFn - Function to generate procedural sound if custom file not found
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   * @returns {Promise<void>}
   */
  async _playSoundWithFallback(path, proceduralFn, position = null) {
    if (!this.soundEnabled) return;
    
    const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume, position);
    
    // Check cache first - tryLoadAudio already handles caching, but we can check our own cache too
    let audioToPlay = null;
    if (this.customAudioCache.has(path)) {
      const cachedAudio = this.customAudioCache.get(path);
      if (cachedAudio) {
        // Clone the cached audio for independent playback (allows overlapping sounds)
        audioToPlay = cachedAudio.cloneNode();
      }
    }
    
    // If not in cache, try to load it (tryLoadAudio will check AudioLoader's cache)
    if (!audioToPlay) {
      audioToPlay = await tryLoadAudio(path);
      if (audioToPlay) {
        // Cache the original for future use (store the original, not the clone)
        // Note: tryLoadAudio returns a clone, so we need to get the original from AudioLoader
        // For now, we'll just cache what we get and clone it next time
        this.customAudioCache.set(path, audioToPlay);
      }
    }
    
    if (audioToPlay) {
      try {
        audioToPlay.currentTime = 0;
        audioToPlay.volume = adjustedVolume;
        await audioToPlay.play();
        return;
      } catch (error) {
        // Play failed, fallback to procedural
      }
    }
    
    // Fallback to procedural sound
    if (proceduralFn) {
      proceduralFn();
    }
  }

  /**
   * Play bolt shot sound - tries custom sound first, falls back to procedural
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   * @param {string} characterName - Optional character name for character-specific bolt sound
   */
  async playBoltShot(position = null, characterName = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'boltShot')) return;
    this.notifyAction('bolt', 0.7);
    
    // Try character-specific sound first (in characters folder, consistent with other character sounds)
    if (characterName) {
      // Try characters folder first: /assets/characters/{characterName}/bolt_shot.wav
      const characterSoundPath = `/assets/characters/${characterName}/bolt_shot`;
      
      // Check SoundManager cache first to avoid reloading
      if (!this.customAudioCache.has(characterSoundPath)) {
        const loadedAudio = await tryLoadAudioWithFallback(characterSoundPath);
        if (loadedAudio) {
          // Cache the original (before cloning) for future use
          // Store the path without extension as the key
          this.customAudioCache.set(characterSoundPath, loadedAudio);
        }
      }
      
      let characterAudio = this.customAudioCache.get(characterSoundPath);
      if (characterAudio) {
        // Clone for independent playback
        characterAudio = characterAudio.cloneNode();
      }
      
      if (characterAudio) {
        try {
          characterAudio.currentTime = 0;
          let volumeMultiplier = 1.0;
          // Make Lucy's bolt sound quieter
          if (characterName === 'lucy') {
            volumeMultiplier = 0.6; // 60% volume for Lucy
          }
          const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume * volumeMultiplier, position);
          characterAudio.volume = adjustedVolume;
          await characterAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
      
      // Also try abilities folder: /assets/audio/abilities/{characterName}/bolt_shot.wav
      const characterAbilitiesPath = getAudioPath('abilities', 'bolt', 'bolt_shot', characterName);
      const characterAbilitiesAudio = await tryLoadAudio(characterAbilitiesPath);
      if (characterAbilitiesAudio) {
        try {
          characterAbilitiesAudio.currentTime = 0;
          let volumeMultiplier = 1.0;
          // Make Lucy's bolt sound quieter
          if (characterName === 'lucy') {
            volumeMultiplier = 0.6; // 60% volume for Lucy
          }
          const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume * volumeMultiplier, position);
          characterAbilitiesAudio.volume = adjustedVolume;
          await characterAbilitiesAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
    }
    
    // Fall back to generic bolt sound
    const genericPath = getAudioPath('abilities', 'bolt', 'bolt_shot');
    const genericAudio = await tryLoadAudio(genericPath);
    if (genericAudio) {
      try {
        genericAudio.currentTime = 0;
        // Apply Lucy volume reduction even for generic sound if Lucy is shooting
        let volumeMultiplier = 1.0;
        if (characterName === 'lucy') {
          volumeMultiplier = 0.6; // 60% volume for Lucy
        }
        const adjustedVolume = this._getAdjustedVolume(this.soundEffectsVolume * volumeMultiplier, position);
        genericAudio.volume = adjustedVolume;
        await genericAudio.play();
        return;
      } catch (error) {
        // Play failed, continue to procedural fallback
      }
    }
    
    // Final fallback to procedural sound
    // Pass characterName to procedural sound so it can also apply volume reduction
    this._playBoltShotProcedural(position, characterName);
  }

  /**
   * Procedural bolt shot sound
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   * @param {string} characterName - Optional character name for volume adjustment
   */
  _playBoltShotProcedural(position = null, characterName = null) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    let volumeMultiplier = 1.0;
    // Make Lucy's bolt sound quieter
    if (characterName === 'lucy') {
      volumeMultiplier = 0.6; // 60% volume for Lucy
    }
    const baseVolume = this.soundEffectsVolume * 0.5 * volumeMultiplier;
    const adjustedVolume = this._getAdjustedVolume(baseVolume, position);
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.exponentialRampToValueAtTime(150, now + 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(adjustedVolume, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * Play bolt hit sound - tries custom sound first, falls back to procedural
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   */
  playBoltHit(position = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'boltHit')) return;
    this.notifyAction('boltHit', 0.55);
    const path = getAudioPath('abilities', 'bolt', 'bolt_hit');
    this._playSoundWithFallback(path, () => {
      this._playBoltHitProcedural(position);
    }, position);
  }

  /**
   * Procedural bolt hit sound
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   */
  _playBoltHitProcedural(position = null) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const baseVolume = this.soundEffectsVolume * 0.4;
    const adjustedVolume = this._getAdjustedVolume(baseVolume, position);
    
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(400, now);
    oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.08);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(adjustedVolume, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    oscillator.start(now);
    oscillator.stop(now + 0.08);
  }

  /**
   * Play melee swing sound - tries custom sound first, falls back to procedural
   * @param {string} characterName - Optional character name for character-specific melee swing sound
   */
  async playMeleeSwing(characterName = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'meleeSwing')) return;
    this.notifyAction('meleeSwing', 0.65);
    
    // Try character-specific sound first (in characters folder, consistent with other character sounds)
    if (characterName) {
      // Try characters folder first: /assets/characters/{characterName}/melee_swing.wav
      const characterSoundPath = `/assets/characters/${characterName}/melee_swing`;
      
      // Check SoundManager cache first to avoid reloading
      if (!this.customAudioCache.has(characterSoundPath)) {
        let loadedAudio = await tryLoadAudioWithFallback(characterSoundPath);
        // Also try just "melee" as a fallback
        if (!loadedAudio) {
          const simpleMeleePath = `/assets/characters/${characterName}/melee`;
          loadedAudio = await tryLoadAudioWithFallback(simpleMeleePath);
        }
        if (loadedAudio) {
          this.customAudioCache.set(characterSoundPath, loadedAudio);
        }
      }
      
      let characterAudio = this.customAudioCache.get(characterSoundPath);
      if (characterAudio) {
        // Clone for independent playback
        characterAudio = characterAudio.cloneNode();
      }
      
      if (characterAudio) {
        try {
          characterAudio.currentTime = 0;
          characterAudio.volume = this.soundEffectsVolume;
          await characterAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
      
      // Also try abilities folder: /assets/audio/abilities/{characterName}/melee_swing.wav
      const characterAbilitiesPath = getAudioPath('abilities', 'melee', 'melee_swing', characterName);
      const characterAbilitiesAudio = await tryLoadAudio(characterAbilitiesPath);
      if (characterAbilitiesAudio) {
        try {
          characterAbilitiesAudio.currentTime = 0;
          characterAbilitiesAudio.volume = this.soundEffectsVolume;
          await characterAbilitiesAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
    }
    
    // Fall back to generic melee swing sound
    const genericPath = getAudioPath('abilities', 'melee', 'melee_swing');
    const genericAudio = await tryLoadAudio(genericPath);
    if (genericAudio) {
      try {
        genericAudio.currentTime = 0;
        genericAudio.volume = this.soundEffectsVolume;
        await genericAudio.play();
        return;
      } catch (error) {
        // Play failed, continue to procedural fallback
      }
    }
    
    // Final fallback to procedural sound
    this._playMeleeSwingProcedural();
  }

  /**
   * Procedural melee swing sound
   */
  _playMeleeSwingProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(250, now);
    oscillator.frequency.exponentialRampToValueAtTime(120, now + 0.15);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.6, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }

  /**
   * Play melee hit sound - tries custom sound first, falls back to procedural
   * @param {string} characterName - Optional character name for character-specific melee hit sound
   */
  async playMeleeHit(characterName = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'meleeHit')) return;
    this.notifyAction('meleeHit', 0.8);
    
    // Try character-specific sound first (in characters folder, consistent with other character sounds)
    if (characterName) {
      // Try characters folder first: /assets/characters/{characterName}/melee_hit.wav
      const characterSoundPath = `/assets/characters/${characterName}/melee_hit`;
      
      // Check SoundManager cache first to avoid reloading
      if (!this.customAudioCache.has(characterSoundPath)) {
        let loadedAudio = await tryLoadAudioWithFallback(characterSoundPath);
        // Also try just "melee" as a fallback
        if (!loadedAudio) {
          const simpleMeleePath = `/assets/characters/${characterName}/melee`;
          loadedAudio = await tryLoadAudioWithFallback(simpleMeleePath);
        }
        if (loadedAudio) {
          this.customAudioCache.set(characterSoundPath, loadedAudio);
        }
      }
      
      let characterAudio = this.customAudioCache.get(characterSoundPath);
      if (characterAudio) {
        // Clone for independent playback
        characterAudio = characterAudio.cloneNode();
      }
      
      if (characterAudio) {
        try {
          characterAudio.currentTime = 0;
          characterAudio.volume = this.soundEffectsVolume;
          await characterAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
      
      // Also try abilities folder: /assets/audio/abilities/{characterName}/melee_hit.wav
      const characterAbilitiesPath = getAudioPath('abilities', 'melee', 'melee_hit', characterName);
      const characterAbilitiesAudio = await tryLoadAudio(characterAbilitiesPath);
      if (characterAbilitiesAudio) {
        try {
          characterAbilitiesAudio.currentTime = 0;
          characterAbilitiesAudio.volume = this.soundEffectsVolume;
          await characterAbilitiesAudio.play();
          return;
        } catch (error) {
          // Play failed, continue to fallback
        }
      }
    }
    
    // Fall back to generic melee hit sound
    const genericPath = getAudioPath('abilities', 'melee', 'melee_hit');
    const genericAudio = await tryLoadAudio(genericPath);
    if (genericAudio) {
      try {
        genericAudio.currentTime = 0;
        genericAudio.volume = this.soundEffectsVolume;
        await genericAudio.play();
        return;
      } catch (error) {
        // Play failed, continue to procedural fallback
      }
    }
    
    // Final fallback to procedural sound
    this._playMeleeHitProcedural();
  }

  /**
   * Procedural melee hit sound
   */
  _playMeleeHitProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.5, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }


  /**
   * Play character swap sound - tries custom sound first, falls back to procedural
   */
  playCharacterSwap() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('character', 'characterSwap')) return;
    this.notifyAction('characterSwap', 0.5);
    const path = getAudioPath('core', 'character', 'character_swap');
    this._playSoundWithFallback(path, () => {
      this._playCharacterSwapProcedural();
    });
  }

  /**
   * Procedural character swap sound
   */
  _playCharacterSwapProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(300, now);
    oscillator.frequency.linearRampToValueAtTime(600, now + 0.15);
    oscillator.frequency.linearRampToValueAtTime(400, now + 0.3);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.5, now + 0.05);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.5, now + 0.25);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    oscillator.start(now);
    oscillator.stop(now + 0.3);
  }

  /**
   * Play respawn sound - tries custom sound first, falls back to procedural
   */
  playRespawn() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('character', 'respawn')) return;
    const path = getAudioPath('core', 'character', 'respawn');
    this._playSoundWithFallback(path, () => {
      this._playRespawnProcedural();
    });
  }

  /**
   * Procedural respawn sound
   */
  _playRespawnProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.linearRampToValueAtTime(400, now + 0.2);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.6, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

    oscillator.start(now);
    oscillator.stop(now + 0.2);
  }

  /**
   * Play death sound - tries custom sound first, falls back to procedural
   */
  playDeath() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('character', 'death')) return;
    const path = getAudioPath('core', 'character', 'death');
    this._playSoundWithFallback(path, () => {
      this._playDeathProcedural();
    });
  }

  /**
   * Procedural death sound
   */
  _playDeathProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, now);
    oscillator.frequency.exponentialRampToValueAtTime(50, now + 0.5);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.5, now + 0.1);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    oscillator.start(now);
    oscillator.stop(now + 0.5);
  }

  /**
   * Play take damage sound - tries custom sound first, falls back to procedural
   */
  playTakeDamage() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('character', 'takeDamage')) return;
    const path = getAudioPath('core', 'character', 'take_damage');
    this._playSoundWithFallback(path, () => {
      this._playTakeDamageProcedural();
    });
  }

  /**
   * Play collectible pickup sound.
   * Falls back to a short procedural chime if no asset exists.
   * @param {Object|THREE.Vector3} position - Optional world position
   * @param {boolean} firstPerson - Whether camera is in first-person mode
   */
  playCollectiblePickup(position = null, firstPerson = false) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('character', 'collectiblePickup')) return;
    this.notifyAction('collectiblePickup', 0.4);

    const path = getAudioPath('core', 'character', 'collectible_pickup');
    this._playSoundWithFallback(path, () => {
      this._playCollectiblePickupProcedural(position, firstPerson);
    }, position);
  }

  /**
   * Procedural collectible pickup sound.
   * Tuned to be softer in first-person so it never feels harsh.
   * @param {Object|THREE.Vector3} position - Optional world position
   * @param {boolean} firstPerson - Whether camera is in first-person mode
   */
  _playCollectiblePickupProcedural(position = null, firstPerson = false) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const profileMultiplier = firstPerson ? 0.45 : 0.6;
    const baseVolume = this.soundEffectsVolume * profileMultiplier;
    const adjustedVolume = this._getAdjustedVolume(baseVolume, position);

    // Main bright pickup ping.
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();
    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(firstPerson ? 760 : 700, now);
    oscillator.frequency.exponentialRampToValueAtTime(firstPerson ? 1150 : 980, now + 0.07);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(adjustedVolume, now + 0.006);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.11);

    oscillator.start(now);
    oscillator.stop(now + 0.12);

    // Small sparkle overtone to make the pickup feel magical.
    const sparkleOsc = this.audioContext.createOscillator();
    const sparkleGain = this.audioContext.createGain();
    sparkleOsc.connect(sparkleGain);
    sparkleGain.connect(this.audioContext.destination);

    sparkleOsc.type = 'sine';
    sparkleOsc.frequency.setValueAtTime(firstPerson ? 1460 : 1320, now + 0.01);
    sparkleOsc.frequency.exponentialRampToValueAtTime(firstPerson ? 1120 : 980, now + 0.08);

    sparkleGain.gain.setValueAtTime(0, now);
    sparkleGain.gain.linearRampToValueAtTime(adjustedVolume * 0.55, now + 0.01);
    sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    sparkleOsc.start(now + 0.01);
    sparkleOsc.stop(now + 0.11);
  }

  /**
   * Procedural take damage sound
   */
  _playTakeDamageProcedural() {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(150, now);
    oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.1);

    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.4, now + 0.005);
    gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    oscillator.start(now);
    oscillator.stop(now + 0.1);
  }

  /**
   * Try to play continuous custom audio file, fallback to procedural sound
   * @param {string} path - Path to custom audio file
   * @param {Function} proceduralFn - Function to generate procedural sound if custom file not found
   * @returns {Object|null} Audio context nodes or audio element for continuous playing/stopping
   */
  async _playContinuousSoundWithFallback(path, proceduralFn) {
    if (!this.soundEnabled) return null;
    
    // Check cache first - for continuous sounds, we can reuse the same instance
    let audioToPlay = null;
    if (this.customAudioCache.has(path)) {
      const cachedAudio = this.customAudioCache.get(path);
      if (cachedAudio) {
        // For continuous/looping sounds, we can reuse (no need to clone)
        audioToPlay = cachedAudio;
      }
    }
    
    // If not in cache, try to load it (tryLoadAudio will check AudioLoader's cache)
    if (!audioToPlay) {
      audioToPlay = await tryLoadAudio(path);
      if (audioToPlay) {
        // Cache the audio for future use
        this.customAudioCache.set(path, audioToPlay);
      }
    }
    
    if (audioToPlay) {
      try {
        audioToPlay.currentTime = 0;
        audioToPlay.volume = this.soundEffectsVolume;
        audioToPlay.loop = true;
        await audioToPlay.play();
        return {
          audio: audioToPlay,
          stop: () => {
            audioToPlay.pause();
            audioToPlay.currentTime = 0;
          }
        };
      } catch (error) {
        // Play failed, fallback to procedural
      }
    }
    
    // Fallback to procedural sound
    if (proceduralFn) {
      return proceduralFn();
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Intermittent background music — plays for short segments with silent gaps
  // ---------------------------------------------------------------------------

  _startMusicSegments() {
    if (!this.backgroundMusic) return;
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('music', 'background')) return;
    if (this._musicSegmentEnabled) return;
    this._musicSegmentEnabled = true;
    this._musicActive = false;
    this.backgroundMusic.volume = 0;
    this._runMusicSegment();
  }

  _stopMusicSegments() {
    this._musicSegmentEnabled = false;
    this._musicActive = false;
    if (this._musicSegmentTimer) {
      clearTimeout(this._musicSegmentTimer);
      this._musicSegmentTimer = null;
    }
    if (this._musicFadeTimer) {
      clearInterval(this._musicFadeTimer);
      this._musicFadeTimer = null;
    }
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.backgroundMusicVolume;
    }
  }

  _runMusicSegment() {
    if (!this._musicSegmentEnabled || !this.backgroundMusic) return;
    if (!isSoundEnabled('music', 'background')) {
      this._stopMusicSegments();
      return;
    }

    const playMs = Math.max(2000, getSoundValue('music', 'backgroundPlayMs', 18000));
    const fadeMs = Math.max(0, getSoundValue('music', 'backgroundFadeMs', 1500));

    this._musicActive = true;
    // Rewind so each segment starts at the top of the track.
    try { this.backgroundMusic.currentTime = 0; } catch (_) {}
    this.backgroundMusic.volume = 0;

    const playPromise = this.backgroundMusic.play();
    const onStarted = () => {
      this._backgroundMusicPlaying = true;
      this._startDrumLoop();
      this._startAmbientWood();
      this._fadeMusic(0, this.backgroundMusicVolume, fadeMs);
      // Schedule fade-out near the end of the segment.
      this._musicSegmentTimer = setTimeout(() => this._endMusicSegment(), Math.max(0, playMs - fadeMs));
    };

    if (playPromise && typeof playPromise.then === 'function') {
      playPromise.then(onStarted).catch(() => {
        // Autoplay blocked or playback failed — try again later.
        this._musicActive = false;
        this._scheduleNextSegment();
      });
    } else {
      onStarted();
    }
  }

  _endMusicSegment() {
    if (!this.backgroundMusic) return;
    const fadeMs = Math.max(0, getSoundValue('music', 'backgroundFadeMs', 1500));
    this._fadeMusic(this.backgroundMusic.volume, 0, fadeMs, () => {
      if (this.backgroundMusic) {
        try {
          this.backgroundMusic.pause();
          this.backgroundMusic.currentTime = 0;
        } catch (_) {}
      }
      this._musicActive = false;
      this._stopDrumLoop();
      this._stopAmbientWood();
      this._scheduleNextSegment();
    });
  }

  _scheduleNextSegment() {
    if (!this._musicSegmentEnabled) return;
    const minMs = Math.max(1000, getSoundValue('music', 'backgroundMinSilenceMs', 25000));
    const maxMs = Math.max(minMs + 1000, getSoundValue('music', 'backgroundMaxSilenceMs', 55000));
    const gap = minMs + Math.random() * (maxMs - minMs);
    this._musicSegmentTimer = setTimeout(() => this._runMusicSegment(), gap);
  }

  _fadeMusic(from, to, durationMs, onDone) {
    if (this._musicFadeTimer) {
      clearInterval(this._musicFadeTimer);
      this._musicFadeTimer = null;
    }
    if (!this.backgroundMusic) {
      if (onDone) onDone();
      return;
    }
    if (durationMs <= 0) {
      this.backgroundMusic.volume = Math.max(0, Math.min(1, to));
      if (onDone) onDone();
      return;
    }
    const steps = Math.max(4, Math.floor(durationMs / 50));
    const stepMs = durationMs / steps;
    let i = 0;
    this._musicFadeTimer = setInterval(() => {
      i++;
      const t = i / steps;
      if (!this.backgroundMusic) {
        clearInterval(this._musicFadeTimer);
        this._musicFadeTimer = null;
        return;
      }
      const v = from + (to - from) * t;
      this.backgroundMusic.volume = Math.max(0, Math.min(1, v));
      if (i >= steps) {
        clearInterval(this._musicFadeTimer);
        this._musicFadeTimer = null;
        if (onDone) onDone();
      }
    }, stepMs);
  }

  // ---------------------------------------------------------------------------
  // Procedural drum loop layered over background music
  // ---------------------------------------------------------------------------

  _getDrumNoiseBuffer() {
    if (this._drumNoiseBuffer || !this.audioContext) return this._drumNoiseBuffer;
    const length = Math.floor(this.audioContext.sampleRate * 0.5);
    const buffer = this.audioContext.createBuffer(1, length, this.audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this._drumNoiseBuffer = buffer;
    return buffer;
  }

  _drumVolume() {
    const rel = getSoundValue('music', 'drumsVolume', 0.55);
    // Intensity 0 ducks drums to 35% of base, intensity 1 boosts to 115%.
    const idleFloor = getSoundValue('music', 'drumsIdleFloor', 0.35);
    const peakBoost = getSoundValue('music', 'drumsPeakBoost', 1.15);
    const intensityCurve = idleFloor + (peakBoost - idleFloor) * this._intensity;
    return Math.max(0, Math.min(1, this.backgroundMusicVolume * rel * intensityCurve));
  }

  // ---------------------------------------------------------------------------
  // Live performance — intensity from movement + actions feeds the drums + ambience
  // ---------------------------------------------------------------------------

  /**
   * Bump the action intensity. Called when the local or remote client does
   * something audible (jump, attack, mortar, swap, etc). Intensity decays
   * automatically over ~1.5s.
   * @param {string} kind - identifier (jump|melee|bolt|mortar|landing|swap|...)
   * @param {number} amount - 0-1, how big the bump is
   */
  notifyAction(kind, amount = 0.5) {
    const clamped = Math.max(0, Math.min(1, amount));
    this._actionIntensity = Math.max(this._actionIntensity, clamped);
    this._lastActionTime = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : 0;
    this._recomputeIntensityTarget();
  }

  /**
   * Set the steady-state movement intensity. Called per-frame from movement
   * code with the player's current state (idle / walking / running).
   * @param {Object} state - { isMoving, isRunning, isGrounded }
   */
  notifyMovementState(state = {}) {
    const { isMoving = false, isRunning = false, isGrounded = true } = state;
    let movement = 0;
    if (!isGrounded) movement = 0.55;
    else if (isRunning) movement = 0.75;
    else if (isMoving) movement = 0.4;
    // Smooth a tiny bit so quick toggles don't snap.
    this._movementIntensity = this._movementIntensity * 0.6 + movement * 0.4;
    this._recomputeIntensityTarget();
  }

  _recomputeIntensityTarget() {
    this._intensityTarget = Math.max(this._movementIntensity, this._actionIntensity);
  }

  _ensureIntensityTimer() {
    if (this._intensityTimer) return;
    this._lastIntensityTickMs = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : 0;
    this._intensityTimer = setInterval(() => this._tickIntensity(), 60);
  }

  _stopIntensityTimer() {
    if (this._intensityTimer) {
      clearInterval(this._intensityTimer);
      this._intensityTimer = null;
    }
  }

  _tickIntensity() {
    const nowMs = (typeof performance !== 'undefined' && performance.now)
      ? performance.now()
      : (this._lastIntensityTickMs + 60);
    const dt = Math.max(0, (nowMs - this._lastIntensityTickMs) / 1000);
    this._lastIntensityTickMs = nowMs;

    // Action intensity decays toward 0 with a ~1.5s half-life.
    const decay = Math.exp(-dt / 0.5);
    this._actionIntensity *= decay;
    if (this._actionIntensity < 0.01) this._actionIntensity = 0;
    this._recomputeIntensityTarget();

    // Smooth follower: intensity chases the target with a short time constant.
    const follow = 1 - Math.exp(-dt / 0.18);
    this._intensity += (this._intensityTarget - this._intensity) * follow;
    if (Math.abs(this._intensity - this._intensityTarget) < 0.002) {
      this._intensity = this._intensityTarget;
    }
  }

  _startDrumLoop() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('music', 'background')) return;
    if (!isSoundEnabled('music', 'drums')) return;
    if (this._drumTimer) return;
    if (!this._ensureAudioContext()) return;

    this._drumStepIndex = 0;
    this._drumNextStep = this.audioContext.currentTime + 0.1;
    this._drumScheduledUntil = this._drumNextStep;
    this._scheduleDrumWindow();
    this._drumTimer = setInterval(() => this._scheduleDrumWindow(), 100);
    this._ensureIntensityTimer();
  }

  _stopDrumLoop() {
    if (this._drumTimer) {
      clearInterval(this._drumTimer);
      this._drumTimer = null;
    }
    this._drumStepIndex = 0;
    this._drumScheduledUntil = 0;
    if (!this._ambientWoodTimer) this._stopIntensityTimer();
  }

  _scheduleDrumWindow() {
    if (!this.audioContext) return;
    if (!isSoundEnabled('music', 'drums')) {
      this._stopDrumLoop();
      return;
    }

    const bpm = Math.max(40, getSoundValue('music', 'drumsBpm', 88));
    const swing = Math.max(0, Math.min(0.4, getSoundValue('music', 'drumsSwing', 0.18)));
    const eighth = 60 / bpm / 2;
    const lookahead = 0.25;
    const horizon = this.audioContext.currentTime + lookahead;

    while (this._drumNextStep < horizon) {
      const step = this._drumStepIndex % 8;
      // At the top of each bar, decide whether the whole bar plays.
      if (step === 0) {
        const baseChance = getSoundValue('music', 'drumsBarPlayChance', 0.35);
        // Intensity makes bars more likely to play, but never every bar.
        const chance = Math.min(0.85, baseChance + this._intensity * 0.4);
        this._drumBarActive = Math.random() < chance;
      }

      if (this._drumBarActive) {
        const swingOffset = step % 2 === 1 ? eighth * swing : 0;
        this._playDrumStep(step, this._drumNextStep + swingOffset);
      }
      this._drumNextStep += eighth;
      this._drumStepIndex++;
    }
  }

  _playDrumStep(step, when) {
    const vol = this._drumVolume();
    if (vol <= 0) return;
    const intensity = this._intensity;
    const maxDensity = Math.max(0, Math.min(1, getSoundValue('music', 'drumsMaxDensity', 0.55)));
    // Effective density blends idle quiet with intensity, capped by maxDensity.
    const density = Math.min(maxDensity, 0.2 + intensity * 0.8);

    // Kick: always on the bar-start downbeat (1). Only sometimes on beat 3 (step 4).
    if (step === 0) {
      this._playKick(when, vol);
    } else if (step === 4 && Math.random() < 0.45 + density * 0.4) {
      this._playKick(when, vol * 0.85);
    }

    // Snare: only on backbeat (step 4 in this context = step 4 of 8 eighths). Use
    // step 4 -> downbeat 3, step 6 -> "and of 3". Here we use 4 as snare hit,
    // gated by density so it sometimes drops out.
    if (step === 4 && Math.random() < density + 0.1) {
      this._playSnare(when, vol * (0.6 + 0.4 * intensity));
    }

    // Hi-hat: sparse. Quarter-note hats by default; double up to eighths only
    // at higher density. Idle clients hear only the bar-start hat.
    if (step === 0) {
      this._playHat(when, vol * 0.85);
    } else if (density > 0.35 && step % 2 === 0) {
      this._playHat(when, vol * 0.65);
    } else if (density > 0.7 && step % 2 === 1) {
      this._playHat(when, vol * 0.45);
    }
  }

  _playKick(when, vol) {
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, when);
    osc.frequency.exponentialRampToValueAtTime(45, when + 0.12);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol * 0.9, when + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);

    osc.start(when);
    osc.stop(when + 0.2);
  }

  _playSnare(when, vol) {
    const ctx = this.audioContext;
    const buffer = this._getDrumNoiseBuffer();
    if (!buffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 1500;
    const noiseGain = ctx.createGain();
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(ctx.destination);

    noiseGain.gain.setValueAtTime(0, when);
    noiseGain.gain.linearRampToValueAtTime(vol * 0.7, when + 0.005);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);

    noise.start(when);
    noise.stop(when + 0.2);

    // Tonal body for the snare
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.connect(oscGain);
    oscGain.connect(ctx.destination);

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(220, when);
    osc.frequency.exponentialRampToValueAtTime(140, when + 0.1);

    oscGain.gain.setValueAtTime(0, when);
    oscGain.gain.linearRampToValueAtTime(vol * 0.35, when + 0.005);
    oscGain.gain.exponentialRampToValueAtTime(0.001, when + 0.12);

    osc.start(when);
    osc.stop(when + 0.14);
  }

  _playHat(when, vol) {
    const ctx = this.audioContext;
    const buffer = this._getDrumNoiseBuffer();
    if (!buffer) return;

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 6000;
    const gain = ctx.createGain();
    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.setValueAtTime(0, when);
    gain.gain.linearRampToValueAtTime(vol * 0.25, when + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

    noise.start(when);
    noise.stop(when + 0.06);
  }

  // ---------------------------------------------------------------------------
  // Procedural wood SFX (knock + creak) layered over movement & ambient
  // ---------------------------------------------------------------------------

  /**
   * Procedural wood knock - short, percussive, slight pitch wobble for variation.
   * @param {number} volumeMultiplier - 0-1 multiplier on top of soundEffectsVolume
   */
  _playWoodKnock(volumeMultiplier = 0.5) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const base = this.soundEffectsVolume * Math.max(0, Math.min(1, volumeMultiplier));
    if (base <= 0) return;

    const pitch = 180 + Math.random() * 80; // 180-260 Hz body

    // Hollow body resonance
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.connect(bodyGain);
    bodyGain.connect(ctx.destination);
    body.type = 'triangle';
    body.frequency.setValueAtTime(pitch, now);
    body.frequency.exponentialRampToValueAtTime(pitch * 0.55, now + 0.08);
    bodyGain.gain.setValueAtTime(0, now);
    bodyGain.gain.linearRampToValueAtTime(base * 0.5, now + 0.004);
    bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
    body.start(now);
    body.stop(now + 0.1);

    // Sharp transient click for the impact
    const click = ctx.createOscillator();
    const clickGain = ctx.createGain();
    click.connect(clickGain);
    clickGain.connect(ctx.destination);
    click.type = 'square';
    click.frequency.setValueAtTime(900, now);
    click.frequency.exponentialRampToValueAtTime(450, now + 0.03);
    clickGain.gain.setValueAtTime(0, now);
    clickGain.gain.linearRampToValueAtTime(base * 0.25, now + 0.002);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    click.start(now);
    click.stop(now + 0.05);
  }

  /**
   * Procedural wood creak - longer, pitchy groan for ambient ambience.
   */
  _playWoodCreak(volumeMultiplier = 0.4) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;
    const ctx = this.audioContext;
    const now = ctx.currentTime;
    const base = this.soundEffectsVolume * Math.max(0, Math.min(1, volumeMultiplier));
    if (base <= 0) return;

    const duration = 0.6 + Math.random() * 0.5;
    const startFreq = 130 + Math.random() * 40;
    const endFreq = startFreq * (1.2 + Math.random() * 0.4);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.linearRampToValueAtTime(endFreq, now + duration * 0.7);
    osc.frequency.linearRampToValueAtTime(endFreq * 0.95, now + duration);

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(base * 0.35, now + 0.08);
    gain.gain.linearRampToValueAtTime(base * 0.25, now + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  _startAmbientWood() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('wood', 'ambient')) return;
    if (this._ambientWoodTimer) return;
    this._ensureIntensityTimer();

    const schedule = () => {
      const minMs = Math.max(500, getSoundValue('wood', 'ambientMinIntervalMs', 4000));
      const maxMs = Math.max(minMs + 500, getSoundValue('wood', 'ambientMaxIntervalMs', 11000));
      // Idle clients hear the wood ambience less often — stretch the interval
      // by up to 2.5x when intensity is near zero.
      const idleStretch = 1 + 1.5 * (1 - this._intensity);
      const delay = (minMs + Math.random() * (maxMs - minMs)) * idleStretch;
      this._ambientWoodTimer = setTimeout(() => {
        if (!isSoundEnabled('wood', 'ambient')) {
          this._ambientWoodTimer = null;
          return;
        }
        const baseVol = getSoundValue('wood', 'ambientVolume', 0.35);
        // Quieter when idle, full when the client is doing things.
        const intensityVolMul = 0.45 + 0.55 * this._intensity;
        const vol = baseVol * intensityVolMul;
        if (Math.random() < 0.55) {
          this._playWoodCreak(vol);
        } else {
          this._playWoodKnock(vol * 0.9);
        }
        schedule();
      }, delay);
    };
    schedule();
  }

  _stopAmbientWood() {
    if (this._ambientWoodTimer) {
      clearTimeout(this._ambientWoodTimer);
      this._ambientWoodTimer = null;
    }
    if (!this._drumTimer) this._stopIntensityTimer();
  }
}


