/**
 * AudioLoader.js
 * 
 * Utility for loading custom audio files with automatic fallback to procedural sounds.
 * Handles loading sounds from the assets/audio folder structure.
 */

// Audio cache to prevent reloading the same audio files
const audioCache = new Map();

/**
 * Load a custom audio file with fallback
 * @param {string} path - Path to audio file
 * @param {number} volume - Volume level (0-1)
 * @returns {HTMLAudioElement|null} Audio element or null if failed
 */
export function loadCustomAudio(path, volume = 1.0) {
  if (!path) return null;
  
  // Check cache first
  if (audioCache.has(path)) {
    const cachedAudio = audioCache.get(path);
    // Clone the cached audio for independent playback
    const audioClone = cachedAudio.cloneNode();
    audioClone.volume = volume;
    return audioClone;
  }
  
  try {
    const audio = new Audio(path);
    audio.volume = volume;
    audio.preload = 'auto';
    // Cache the original audio element
    audioCache.set(path, audio);
    return audio;
  } catch (error) {
    console.warn(`Failed to load audio: ${path}`, error);
    return null;
  }
}

/**
 * Get audio file path for a sound
 * @param {string} category - Category: 'abilities', 'core', 'characters'
 * @param {string} subcategory - Subcategory (e.g., 'bolt', 'mortar', 'character')
 * @param {string} soundName - Sound name (e.g., 'bolt_shot', 'mortar_explosion')
 * @param {string} characterName - Optional character name for character-specific sounds
 * @returns {string} Path to audio file
 */
export function getAudioPath(category, subcategory, soundName, characterName = null) {
  if (characterName) {
    return `/assets/audio/${category}/${characterName}/${soundName}.wav`;
  }
  return `/assets/audio/${category}/${subcategory}/${soundName}.wav`;
}

/**
 * Try to load custom audio file, returns null if not found
 * @param {string} path - Path to audio file
 * @returns {Promise<HTMLAudioElement|null>} Audio element or null
 */
export async function tryLoadAudio(path) {
  if (!path) return null;
  
  // Check cache first
  if (audioCache.has(path)) {
    const cachedAudio = audioCache.get(path);
    // Return a clone so multiple instances can play simultaneously
    const audioClone = cachedAudio.cloneNode();
    return Promise.resolve(audioClone);
  }
  
  try {
    const audio = new Audio(path);
    audio.preload = 'auto';
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null); // Timeout - file probably doesn't exist
      }, 3000); // Increased timeout to 3 seconds for larger files
      
      // Use loadeddata for faster response (doesn't need full file loaded)
      audio.addEventListener('loadeddata', () => {
        clearTimeout(timeout);
        // Cache the loaded audio
        audioCache.set(path, audio);
        // Return a clone for independent playback
        const audioClone = audio.cloneNode();
        resolve(audioClone);
      }, { once: true });
      
      // Also listen for canplaythrough as backup
      audio.addEventListener('canplaythrough', () => {
        clearTimeout(timeout);
        // Cache the loaded audio
        if (!audioCache.has(path)) {
          audioCache.set(path, audio);
        }
        // Return a clone for independent playback
        const audioClone = audio.cloneNode();
        resolve(audioClone);
      }, { once: true });
      
      audio.addEventListener('error', () => {
        clearTimeout(timeout);
        resolve(null); // File doesn't exist or failed to load
      }, { once: true });
      
      // Try to load
      audio.load();
    });
  } catch (error) {
    return null;
  }
}

/**
 * Clear audio cache (useful for development or memory management)
 */
export function clearAudioCache() {
  audioCache.clear();
}

/**
 * Get audio cache statistics (useful for debugging)
 */
export function getAudioCacheStats() {
  return {
    cachedAudios: audioCache.size
  };
}

