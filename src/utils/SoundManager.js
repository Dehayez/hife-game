export class SoundManager {
  constructor(customFootstepPath = null) {
    this.audioContext = null;
    this.masterVolume = 0.3; // Default volume (0-1)
    this.soundEnabled = true;
    this.customFootstepPath = customFootstepPath;
    this.footstepAudio = null;
    this._initAudioContext();
    if (customFootstepPath) {
      this._loadCustomFootstep(customFootstepPath);
    }
  }

  _loadCustomFootstep(path) {
    // Clear existing audio if loading new one
    this.footstepAudio = null;
    
    if (!path) return;
    
    this.footstepAudio = new Audio(path);
    this.footstepAudio.volume = this.masterVolume;
    this.footstepAudio.preload = 'auto';
    
    // Handle loading errors gracefully
    this.footstepAudio.addEventListener('error', () => {
      console.warn(`Failed to load footstep sound from ${path}, falling back to procedural sound`);
      this.footstepAudio = null;
    });
  }

  loadFootstepSound(path) {
    this.customFootstepPath = path;
    this._loadCustomFootstep(path);
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
   * Play footstep sound - uses custom audio file if available, otherwise generates procedural sound
   */
  playFootstep() {
    if (!this.soundEnabled) return;

    // Use custom audio file if available
    if (this.footstepAudio) {
      try {
        // Clone the audio to allow overlapping playback
        const audioClone = this.footstepAudio.cloneNode();
        audioClone.volume = this.masterVolume;
        audioClone.currentTime = 0;
        audioClone.play().catch(err => {
          // Auto-play may be blocked, fall back to procedural
          if (err.name !== 'NotAllowedError') {
            console.warn('Error playing custom footstep sound:', err);
          }
        });
        return;
      } catch (err) {
        console.warn('Error playing custom footstep sound:', err);
        // Fall through to procedural sound
      }
    }

    // Fallback to procedural sound
    if (!this._ensureAudioContext()) return;

    const now = this.audioContext.currentTime;
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

  setVolume(volume) {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    if (this.footstepAudio) {
      this.footstepAudio.volume = this.masterVolume;
    }
  }

  enable() {
    this.soundEnabled = true;
  }

  disable() {
    this.soundEnabled = false;
  }
}

