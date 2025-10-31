export class SoundManager {
  constructor(customFootstepPath = null, customObstacleFootstepPath = null) {
    this.audioContext = null;
    this.masterVolume = 0.3; // Default volume (0-1)
    this.soundEnabled = true;
    this.customFootstepPath = customFootstepPath;
    this.customObstacleFootstepPath = customObstacleFootstepPath;
    this.footstepAudio = null;
    this.obstacleFootstepAudio = null;
    this._initAudioContext();
    if (customFootstepPath) {
      this._loadCustomFootstep(customFootstepPath);
    }
    if (customObstacleFootstepPath) {
      this._loadCustomObstacleFootstep(customObstacleFootstepPath);
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
      });
      
      // Log successful load
      this.footstepAudio.addEventListener('canplaythrough', () => {
        console.log(`Footstep sound loaded successfully: ${path}`);
      }, { once: true });
      
      // Try to load immediately
      this.footstepAudio.load();
    } catch (error) {
      console.warn(`Error creating footstep audio from ${path}:`, error);
      this.footstepAudio = null;
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
      });
      
      // Log successful load
      this.obstacleFootstepAudio.addEventListener('canplaythrough', () => {
        console.log(`Obstacle footstep sound loaded successfully: ${path}`);
      }, { once: true });
      
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
   * Play jump sound when jumping - uses footstep sound but quieter
   * @param {boolean} isObstacle - If true, plays obstacle/platform footstep sound
   */
  playJump(isObstacle = false) {
    if (!this.soundEnabled) return;

    // Use obstacle footstep audio for obstacle jumps (if available)
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

    // Use base footstep audio for base ground jumps (if available)
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
        // Clone the audio to allow overlapping playback
        const audioClone = this.obstacleFootstepAudio.cloneNode();
        audioClone.volume = this.masterVolume;
        audioClone.currentTime = 0;
        
        // Try to play - if it fails, fall back to procedural
        const playPromise = audioClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            // Auto-play may be blocked or audio failed to load, fall back to procedural
            if (err.name !== 'NotAllowedError') {
              console.warn('Error playing custom obstacle footstep sound:', err);
            }
          });
        }
        return; // Return immediately, let play() handle loading if needed
      } catch (err) {
        console.warn('Error playing custom obstacle footstep sound:', err);
        // Fall through to procedural sound
      }
    }

    // Use custom audio file if available (for base ground)
    if (!isObstacle && this.footstepAudio) {
      try {
        // Clone the audio to allow overlapping playback
        const audioClone = this.footstepAudio.cloneNode();
        audioClone.volume = this.masterVolume;
        audioClone.currentTime = 0;
        
        // Try to play - if it fails, fall back to procedural
        const playPromise = audioClone.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            // Auto-play may be blocked or audio failed to load, fall back to procedural
            if (err.name !== 'NotAllowedError') {
              console.warn('Error playing custom footstep sound:', err);
            }
          });
        }
        return; // Return immediately, let play() handle loading if needed
      } catch (err) {
        console.warn('Error playing custom footstep sound:', err);
        // Fall through to procedural sound
      }
    }

    // Fallback to procedural sound
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
  }

  enable() {
    this.soundEnabled = true;
  }

  disable() {
    this.soundEnabled = false;
  }
}

