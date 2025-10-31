export class SoundManager {
  constructor(customFootstepPath = null, customObstacleFootstepPath = null, customJumpPath = null, customObstacleJumpPath = null) {
    this.audioContext = null;
    this.masterVolume = 0.15; // Default volume (0-1)
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
    this.backgroundMusicVolume = 0.2; // Background music volume (0-1), typically lower than sound effects
    this._initAudioContext();
    if (customFootstepPath) {
      this._loadCustomFootstep(customFootstepPath);
    }
    if (customObstacleFootstepPath) {
      this._loadCustomObstacleFootstep(customObstacleFootstepPath);
    }
    if (customJumpPath) {
      this._loadCustomJump(customJumpPath);
    }
    if (customObstacleJumpPath) {
      this._loadCustomObstacleJump(customObstacleJumpPath);
    }
  }

  _loadCustomFootstep(path) {
    // Clear existing audio if loading new one
    this.footstepAudio = null;
    
    if (!path) return;
    
    try {
      this.footstepAudio = new Audio(path);
      this.footstepAudio.volume = this.masterVolume;
      this.footstepAudio.preload = 'auto';
      
      // Handle loading errors gracefully
      this.footstepAudio.addEventListener('error', (e) => {
        console.warn(`Failed to load footstep sound from ${path}:`, e);
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
      
      // Try to load immediately
      this.footstepAudio.load();
    } catch (error) {
      console.warn(`Error creating footstep audio from ${path}:`, error);
      this.footstepAudio = null;
      this._footstepReady = false;
    }
  }

  _loadCustomObstacleFootstep(path) {
    // Clear existing audio if loading new one
    this.obstacleFootstepAudio = null;
    
    if (!path) return;
    
    try {
      this.obstacleFootstepAudio = new Audio(path);
      this.obstacleFootstepAudio.volume = this.masterVolume;
      this.obstacleFootstepAudio.preload = 'auto';
      
      // Handle loading errors gracefully
      this.obstacleFootstepAudio.addEventListener('error', (e) => {
        console.warn(`Failed to load obstacle footstep sound from ${path}:`, e);
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
      
      // Try to load immediately
      this.obstacleFootstepAudio.load();
    } catch (error) {
      console.warn(`Error creating obstacle footstep audio from ${path}:`, error);
      this.obstacleFootstepAudio = null;
    }
  }

  loadFootstepSound(path) {
    this.customFootstepPath = path;
    this._loadCustomFootstep(path);
  }

  loadObstacleFootstepSound(path) {
    this.customObstacleFootstepPath = path;
    this._loadCustomObstacleFootstep(path);
  }

  _loadCustomJump(path) {
    // Clear existing audio if loading new one
    this.jumpAudio = null;
    
    if (!path) return;
    
    try {
      this.jumpAudio = new Audio(path);
      this.jumpAudio.volume = this.masterVolume;
      this.jumpAudio.preload = 'auto';
      
      // Handle loading errors gracefully
      this.jumpAudio.addEventListener('error', (e) => {
        console.warn(`Failed to load jump sound from ${path}:`, e);
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
      
      // Try to load immediately
      this.jumpAudio.load();
    } catch (error) {
      console.warn(`Error creating jump audio from ${path}:`, error);
      this.jumpAudio = null;
      this._jumpReady = false;
    }
  }

  _loadCustomObstacleJump(path) {
    // Clear existing audio if loading new one
    this.obstacleJumpAudio = null;
    
    if (!path) return;
    
    try {
      this.obstacleJumpAudio = new Audio(path);
      this.obstacleJumpAudio.volume = this.masterVolume;
      this.obstacleJumpAudio.preload = 'auto';
      
      // Handle loading errors gracefully
      this.obstacleJumpAudio.addEventListener('error', (e) => {
        console.warn(`Failed to load obstacle jump sound from ${path}:`, e);
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
      
      // Try to load immediately
      this.obstacleJumpAudio.load();
    } catch (error) {
      console.warn(`Error creating obstacle jump audio from ${path}:`, error);
      this.obstacleJumpAudio = null;
    }
  }

  loadJumpSound(path) {
    this.customJumpPath = path;
    this._loadCustomJump(path);
  }

  loadObstacleJumpSound(path) {
    this.customObstacleJumpPath = path;
    this._loadCustomObstacleJump(path);
  }

  _initAudioContext() {
    try {
      // Create audio context - may need user interaction first
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
    } catch (error) {
      console.warn('Audio context initialization failed:', error);
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
        console.warn('Audio context resume failed:', error);
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

    // Always use the same jump audio for all jumps (ground and obstacle)
    if (this.jumpAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA = 2)
        // HAVE_FUTURE_DATA = 2, HAVE_ENOUGH_DATA = 4
        const isReady = this.jumpAudio.readyState >= 2 || this._jumpReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.jumpAudio.cloneNode();
          audioClone.volume = this.masterVolume;
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
                if (err.name !== 'NotAllowedError') {
                  console.warn('Error playing jump sound:', err);
                }
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
        console.warn('Error playing jump sound:', err);
        // Fall through to footstep fallback below
      }
    }

    // Fallback: Use obstacle footstep audio for obstacle jumps (if available)
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        const audioClone = this.obstacleFootstepAudio.cloneNode();
        audioClone.volume = this.masterVolume * 0.6; // 60% of normal volume (quieter)
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.warn('Error playing jump sound:', err);
          }
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
        audioClone.volume = this.masterVolume * 0.6; // 60% of normal volume (quieter)
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.warn('Error playing jump sound:', err);
          }
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.12, now + 0.005); // Reduced volume
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
      ringGain.gain.linearRampToValueAtTime(this.masterVolume * 0.048, now + 0.01); // Reduced volume
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.09, now + 0.01); // Reduced volume
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
      clickGain.gain.linearRampToValueAtTime(this.masterVolume * 0.03, now + 0.005); // Reduced volume
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

    // For landing, we can reuse the footstep sounds but potentially with different volume
    // Or play a slightly different version. For now, we'll use footstep sounds but louder
    // to simulate impact. If custom landing sounds are added later, we can load them separately.
    
    // Use obstacle footstep audio for obstacle landings (if available)
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        const audioClone = this.obstacleFootstepAudio.cloneNode();
        audioClone.volume = this.masterVolume * 1.5; // 50% louder for impact
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.warn('Error playing landing sound:', err);
          }
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
        audioClone.volume = this.masterVolume * 1.5; // 50% louder for impact
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          if (err.name !== 'NotAllowedError') {
            console.warn('Error playing landing sound:', err);
          }
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.3, now + 0.01);
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
      ringGain.gain.linearRampToValueAtTime(this.masterVolume * 0.12, now + 0.015);
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.25, now + 0.015);
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
      rumbleGain.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.01);
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

    // Use obstacle-specific audio if available and on obstacle
    if (isObstacle && this.obstacleFootstepAudio) {
      try {
        // Check if audio is ready to play (readyState >= HAVE_FUTURE_DATA)
        // HAVE_FUTURE_DATA = 2, HAVE_ENOUGH_DATA = 4
        const isReady = this.obstacleFootstepAudio.readyState >= 2 || this._obstacleFootstepReady;
        
        if (isReady) {
          // Clone the audio to allow overlapping playback
          const audioClone = this.obstacleFootstepAudio.cloneNode();
          audioClone.volume = this.masterVolume;
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
                if (err.name !== 'NotAllowedError') {
                  console.warn('Error playing custom obstacle footstep sound:', err);
                }
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
        console.warn('Error playing custom obstacle footstep sound:', err);
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
          audioClone.volume = this.masterVolume;
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
                if (err.name !== 'NotAllowedError') {
                  console.warn('Error playing custom footstep sound:', err);
                }
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
        console.warn('Error playing custom footstep sound:', err);
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.2, now + 0.005);
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
      ringGain.gain.linearRampToValueAtTime(this.masterVolume * 0.08, now + 0.01);
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
      gainNode.gain.linearRampToValueAtTime(this.masterVolume * 0.15, now + 0.01);
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
      clickGain.gain.linearRampToValueAtTime(this.masterVolume * 0.05, now + 0.005);
      clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      clickOsc.start(now);
      clickOsc.stop(now + 0.05);
    }
  }

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.footstepAudio) {
      this.footstepAudio.volume = this.masterVolume;
    }
    if (this.obstacleFootstepAudio) {
      this.obstacleFootstepAudio.volume = this.masterVolume;
    }
    if (this.jumpAudio) {
      this.jumpAudio.volume = this.masterVolume;
    }
    if (this.obstacleJumpAudio) {
      this.obstacleJumpAudio.volume = this.masterVolume;
    }
    // Background music volume is independent, but we can update if needed
    if (this.backgroundMusic) {
      this.backgroundMusic.volume = this.backgroundMusicVolume;
    }
  }

  enable() {
    this.soundEnabled = true;
  }

  disable() {
    this.soundEnabled = false;
  }

  /**
   * Load background music from a file path
   * @param {string} path - Path to background music file
   */
  loadBackgroundMusic(path) {
    if (!path) {
      console.warn('Background music path is null or undefined');
      return;
    }

    this.backgroundMusicPath = path;

    // Stop and remove existing background music if any
    if (this.backgroundMusic) {
      this.stopBackgroundMusic();
      this.backgroundMusic = null;
    }

    try {
      this.backgroundMusic = new Audio(path);
      this.backgroundMusic.volume = this.backgroundMusicVolume;
      this.backgroundMusic.loop = true;
      this.backgroundMusic.preload = 'auto';

      // Handle loading errors gracefully
      this.backgroundMusic.addEventListener('error', (e) => {
        console.warn(`Failed to load background music from ${path}:`, e);
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

      // Try to load immediately
      this.backgroundMusic.load();
    } catch (error) {
      console.warn(`Error creating background music audio from ${path}:`, error);
      this.backgroundMusic = null;
    }
  }

  /**
   * Play background music (loops automatically)
   */
  playBackgroundMusic() {
    if (!this.backgroundMusic) {
      console.warn('Background music not loaded. Cannot play.');
      return;
    }

    if (!this.soundEnabled) {
      console.warn('Sound is disabled. Cannot play background music.');
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
            if (err.name !== 'NotAllowedError') {
              console.warn('Error playing background music:', err);
            }
            // Mark that we need user interaction
            this._backgroundMusicPlaying = false;
          });
      }
    } catch (err) {
      // Silently handle autoplay blocking - it's expected behavior in browsers
      if (err.name !== 'NotAllowedError') {
        console.warn('Error playing background music:', err);
      }
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
      console.warn('Error pausing background music:', err);
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
      console.warn('Error stopping background music:', err);
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
}


