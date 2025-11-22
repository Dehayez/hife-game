/**
 * AudioLoader.js
 * 
 * Utility for loading custom audio files with automatic fallback to procedural sounds.
 * Handles loading sounds from the assets/audio folder structure.
 * Uses Web Workers for parallel file existence checks to optimize loading.
 */

import { checkFilesExist } from './workers/WorkerManager.js';

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
 * @param {number} timeoutMs - Timeout in milliseconds (default: 2000 for quick failure, 10000 for large files)
 * @returns {Promise<HTMLAudioElement|null>} Audio element or null
 */
export async function tryLoadAudio(path, timeoutMs = 2000) {
  if (!path) return null;
  
  // Check cache first
  if (audioCache.has(path)) {
    const cachedAudio = audioCache.get(path);
    // Return a clone so multiple instances can play simultaneously
    const audioClone = cachedAudio.cloneNode();
    return Promise.resolve(audioClone);
  }
  
  try {
    // Create audio element with cache-friendly settings
    const audio = new Audio(path);
    audio.preload = 'auto';
    // Ensure browser respects cache by not adding cache-busting
    // The browser will use cached version if available
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null); // Timeout - file probably doesn't exist
      }, timeoutMs);
      
      // Use loadeddata for faster response (doesn't need full file loaded)
      audio.addEventListener('loadeddata', () => {
        clearTimeout(timeout);
        // Cache the loaded audio
        audioCache.set(path, audio);
        // Return a clone for independent playback
        const audioClone = audio.cloneNode();
        resolve(audioClone);
      }, { once: true });
      
      // Also listen for canplaythrough as backup (ensures enough data for playback)
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
      
      // Only call load() if the audio element hasn't started loading yet
      // This prevents unnecessary network requests for cached files
      if (audio.readyState === 0) {
        audio.load();
      } else {
        // Already loading or loaded, resolve immediately with a clone
        const audioClone = audio.cloneNode();
        audioCache.set(path, audio);
        resolve(audioClone);
      }
    });
  } catch (error) {
    return null;
  }
}

/**
 * Try to load audio with format fallback (wav, mp3, ogg)
 * Stops at the first successful format to avoid unnecessary requests
 * Uses Web Worker for parallel file existence checks to optimize performance
 * @param {string} basePath - Base path without extension (e.g., '/assets/audio/sound')
 * @param {number} timeoutMs - Timeout per format in milliseconds (default: 200 for fast failure)
 * @returns {Promise<HTMLAudioElement|null>} Audio element or null if all formats fail
 */
export async function tryLoadAudioWithFallback(basePath, timeoutMs = 200) {
  if (!basePath) return null;
  
  // Try formats in order: wav (most common), mp3, ogg
  // Stop at first success to avoid loading multiple formats
  const formats = ['wav', 'mp3', 'ogg'];
  const paths = formats.map(format => `${basePath}.${format}`);
  
  // Check in-memory cache first for all formats
  for (const path of paths) {
    if (audioCache.has(path)) {
      const cachedAudio = audioCache.get(path);
      const audioClone = cachedAudio.cloneNode();
      return Promise.resolve(audioClone);
    }
  }
  
  // Use Web Worker to check all formats in parallel
  try {
    const fileExists = await checkFilesExist(paths);
    
    // Try formats in order, but skip ones we know don't exist
    for (const format of formats) {
      const path = `${basePath}.${format}`;
      
      // Skip if worker confirmed file doesn't exist
      if (fileExists[path] === false) {
        continue;
      }
      
      // File exists (or worker check was inconclusive), try loading it
      const audio = await tryLoadAudio(path, timeoutMs * 3);
      if (audio) {
        // Success! Return immediately without trying other formats
        return audio;
      }
    }
  } catch (error) {
    // Worker failed or unavailable, fallback to sequential checking
    for (const format of formats) {
      const path = `${basePath}.${format}`;
      
      // Check in-memory cache first
      if (audioCache.has(path)) {
        const cachedAudio = audioCache.get(path);
        const audioClone = cachedAudio.cloneNode();
        return Promise.resolve(audioClone);
      }
      
      // Quick check if file exists using HEAD request
      try {
        const headResponse = await Promise.race([
          fetch(path, { method: 'HEAD', cache: 'default' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), timeoutMs))
        ]);
        
        if (!headResponse.ok) {
          continue;
        }
      } catch {
        continue;
      }
      
      // File exists, now load it
      const audio = await tryLoadAudio(path, timeoutMs * 3);
      if (audio) {
        return audio;
      }
    }
  }
  
  // All formats failed
  return null;
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

