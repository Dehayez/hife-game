import { getSoundEffectsVolume, getBackgroundCinematicVolume } from './StorageUtils.js';
import { tryLoadAudio, getAudioPath, loadCustomAudio } from './AudioLoader.js';
import { isSoundEnabled } from '../config/global/SoundConfig.js';

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
    this.backgroundMusic = null;
    this.backgroundMusicPath = null;
    this.backgroundMusicVolume = 0.2; // Background music volume (0-1), typically lower than sound effects - will be loaded from storage via initFromStorage
    this.soundEffectsVolume = 0.15; // Sound effects volume (0-1) - will be loaded from storage via initFromStorage
    
    // Cache for loaded custom audio files
    this.customAudioCache = new Map();
    
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
      this.backgroundMusicVolume = 0.2;
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
   * Play landing sound when jumping and landing
   * @param {boolean} isObstacle - If true, plays obstacle/platform landing sound
   */
  playLanding(isObstacle = false) {
    if (!this.soundEnabled) return;
    if (isObstacle && !isSoundEnabled('movement', 'landingObstacle')) return;
    if (!isObstacle && !isSoundEnabled('movement', 'landingGround')) return;

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
  playFootstep(isObstacle = false) {
    if (!this.soundEnabled) return;
    if (isObstacle && !isSoundEnabled('movement', 'footstepObstacle')) return;
    if (!isObstacle && !isSoundEnabled('movement', 'footstepGround')) return;

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
      // Use AudioLoader which handles caching
      this.backgroundMusic = await tryLoadAudio(path);
      if (!this.backgroundMusic) {
        // Fallback to loadCustomAudio if tryLoadAudio fails
        this.backgroundMusic = loadCustomAudio(path, this.backgroundMusicVolume);
      } else {
        this.backgroundMusic.volume = this.backgroundMusicVolume;
      }
      
      if (this.backgroundMusic) {
        this.backgroundMusic.loop = true;

        // Handle loading errors gracefully
        this.backgroundMusic.addEventListener('error', (e) => {
          this.backgroundMusic = null;
        });

        // Auto-play when loaded
        this.backgroundMusic.addEventListener('canplaythrough', () => {
          // Attempt to play automatically when ready
          // Check after a short delay if it actually started
          this.playBackgroundMusic();
          setTimeout(() => {
            if (!this.isBackgroundMusicPlaying()) {
              // Music didn't start, will need user interaction
              this._backgroundMusicPlaying = false;
            }
          }, 100);
        }, { once: true });

        // Try to load immediately if not already loaded
        if (this.backgroundMusic.readyState === 0) {
          this.backgroundMusic.load();
        } else {
          // Already loaded from cache, try to play
          this.playBackgroundMusic();
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
            // Mark that we successfully started playing
            this._backgroundMusicPlaying = true;
          })
          .catch(err => {
            // Silently handle autoplay blocking - it's expected behavior in browsers
            // Mark that we need user interaction
            this._backgroundMusicPlaying = false;
          });
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
  }

  /**
   * Set background music volume (separate from sound effects)
   * @param {number} volume - Volume level (0-1)
   */
  setBackgroundMusicVolume(volume) {
    this.backgroundMusicVolume = Math.max(0, Math.min(1, volume));
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.backgroundMusicVolume;
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
   * Play mortar explosion sound - procedural deep explosion sound
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   */
  playMortarExplosion(position = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'mortarExplosion')) return;
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
   * Play mortar launch sound - whoosh when mortar is fired
   */
  playMortarLaunch() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'mortarLaunch')) return;
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
   * @returns {Object} Audio context nodes for continuous playing/stopping
   */
  playMortarArc() {
    if (!this.soundEnabled) return null;
    if (!isSoundEnabled('abilities', 'mortarArc')) return null;
    if (!this._ensureAudioContext()) return null;

    const now = this.audioContext.currentTime;

    // Continuous whoosh during flight
    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(this.audioContext.destination);

    // Medium frequency whoosh
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(150, now);

    // Start volume
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(this.soundEffectsVolume * 0.3, now + 0.05);

    oscillator.start(now);

    return {
      oscillator: oscillator,
      gainNode: gainNode,
      stop: () => {
        const stopTime = this.audioContext.currentTime;
        gainNode.gain.cancelScheduledValues(stopTime);
        gainNode.gain.setValueAtTime(gainNode.gain.value, stopTime);
        gainNode.gain.linearRampToValueAtTime(0, stopTime + 0.1);
        setTimeout(() => {
          oscillator.stop();
        }, 100);
      }
    };
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
   */
  playBoltShot(position = null) {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'boltShot')) return;
    const path = getAudioPath('abilities', 'bolt', 'bolt_shot');
    this._playSoundWithFallback(path, () => {
      this._playBoltShotProcedural(position);
    }, position);
  }

  /**
   * Procedural bolt shot sound
   * @param {Object|THREE.Vector3} position - Optional sound position for distance-based volume
   */
  _playBoltShotProcedural(position = null) {
    if (!this.soundEnabled) return;
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
    const baseVolume = this.soundEffectsVolume * 0.5;
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
   */
  playMeleeSwing() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'meleeSwing')) return;
    const path = getAudioPath('abilities', 'melee', 'melee_swing');
    this._playSoundWithFallback(path, () => {
      this._playMeleeSwingProcedural();
    });
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
   */
  playMeleeHit() {
    if (!this.soundEnabled) return;
    if (!isSoundEnabled('abilities', 'meleeHit')) return;
    const path = getAudioPath('abilities', 'melee', 'melee_hit');
    this._playSoundWithFallback(path, () => {
      this._playMeleeHitProcedural();
    });
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
}


