/**
 * CharacterSound.js
 * 
 * Handles character-specific sound loading with fallback to generic sounds.
 */

import { getLoadingProgressManager } from '../../../utils/LoadingProgressManager.js';
import { tryLoadAudio } from '../../../utils/AudioLoader.js';

/**
 * Sound file extensions to try
 */
const SOUND_EXTENSIONS = ['mp3', 'ogg', 'wav'];

/**
 * Try to load a sound file (uses AudioLoader cache)
 * @param {string} path - Sound file path (without extension)
 * @returns {Promise<string|null>} Path to sound file if found, null otherwise
 */
async function tryLoadSound(path) {
  for (const ext of SOUND_EXTENSIONS) {
    const testPath = `${path}.${ext}`;
    // Use AudioLoader's tryLoadAudio which checks cache first
    const audio = await tryLoadAudio(testPath);
    if (audio) {
      return testPath;
    }
  }
  return null;
}

/**
 * Load character-specific sound with fallback to generic sound
 * @param {string} characterName - Character name
 * @param {string} soundName - Sound name (e.g., 'footstep', 'jump')
 * @returns {Promise<string|null>} Path to sound file if found, null otherwise
 */
export async function loadCharacterSound(characterName, soundName) {
  const baseSpritePath = `/assets/characters/${characterName}/`;
  const genericSoundPath = '/assets/sounds';
  
  // Try character-specific sound first
  const characterSoundPath = `${baseSpritePath}${soundName}`;
  const characterSound = await tryLoadSound(characterSoundPath);
  
  if (characterSound) {
    return characterSound;
  }
  
  // Fall back to generic sound
  const genericSoundPathFull = `${genericSoundPath}/${soundName}`;
  return await tryLoadSound(genericSoundPathFull);
}

/**
 * Load all character sounds
 * @param {string} characterName - Character name
 * @param {Object} soundManager - Sound manager instance
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<void>}
 */
export async function loadAllCharacterSounds(characterName, soundManager, onProgress = null) {
  const progressManager = getLoadingProgressManager();
  
  // Total sounds to load
  const totalSounds = 5;
  let loadedCount = 0;
  
  const updateProgress = (soundName) => {
    loadedCount++;
    const task = `Loading ${characterName} sound: ${soundName}...`;
    if (onProgress) {
      onProgress(loadedCount, totalSounds, task);
    } else {
      progressManager.increment(task);
    }
  };
  
  // Load footstep sound
  const footstepSound = await loadCharacterSound(characterName, 'footstep');
  if (footstepSound && soundManager) {
    await soundManager.loadFootstepSound(footstepSound);
  }
  updateProgress('footstep');
  
  // Load obstacle footstep sound
  const obstacleFootstepSound = await loadCharacterSound(characterName, 'footstep_obstacle');
  if (obstacleFootstepSound && soundManager) {
    await soundManager.loadObstacleFootstepSound(obstacleFootstepSound);
  }
  updateProgress('footstep_obstacle');
  
  // Load jump sound
  const jumpSound = await loadCharacterSound(characterName, 'jump');
  if (jumpSound && soundManager) {
    await soundManager.loadJumpSound(jumpSound);
  }
  updateProgress('jump');
  
  // Load obstacle jump sound
  const obstacleJumpSound = await loadCharacterSound(characterName, 'jump_obstacle');
  if (obstacleJumpSound && soundManager) {
    await soundManager.loadObstacleJumpSound(obstacleJumpSound);
  }
  updateProgress('jump_obstacle');
  
  // Load fly sound
  const flySound = await loadCharacterSound(characterName, 'fly');
  if (flySound && soundManager) {
    await soundManager.loadFlySound(flySound);
  }
  updateProgress('fly');
}

