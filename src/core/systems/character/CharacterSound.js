/**
 * CharacterSound.js
 * 
 * Handles character-specific sound loading with fallback to generic sounds.
 */

import { getLoadingProgressManager } from '../../../utils/LoadingProgressManager.js';
import { tryLoadAudio, getAudioPath } from '../../../utils/AudioLoader.js';

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
  
  // Preload ability sounds to prevent delay on first use
  await preloadAbilitySounds(characterName, onProgress);
}

/**
 * Preload all ability sounds for a character to prevent delay on first use
 * @param {string} characterName - Character name
 * @param {Function} onProgress - Optional progress callback
 * @returns {Promise<void>}
 */
async function preloadAbilitySounds(characterName, onProgress = null) {
  const normalizedCharacterName = characterName.toLowerCase();
  
  // List of ability sounds to preload
  const abilitySounds = [
    {
      name: 'bolt_shot',
      paths: [
        // Character-specific paths (without extension)
        `/assets/characters/${normalizedCharacterName}/bolt_shot`,
        // Abilities folder paths (getAudioPath returns .wav, so we'll try other extensions too)
        getAudioPath('abilities', 'bolt', 'bolt_shot', normalizedCharacterName),
        // Generic fallback
        getAudioPath('abilities', 'bolt', 'bolt_shot')
      ]
    },
    {
      name: 'mortar_launch',
      paths: [
        `/assets/characters/${normalizedCharacterName}/mortar_launch`,
        getAudioPath('abilities', 'mortar', 'mortar_launch', normalizedCharacterName),
        getAudioPath('abilities', 'mortar', 'mortar_launch')
      ]
    },
    {
      name: 'mortar_explosion',
      paths: [
        `/assets/characters/${normalizedCharacterName}/mortar_explosion`,
        `/assets/characters/${normalizedCharacterName}/mortar_splash`,
        getAudioPath('abilities', 'mortar', 'mortar_explosion', normalizedCharacterName),
        getAudioPath('abilities', 'mortar', 'mortar_explosion')
      ]
    },
    {
      name: 'melee_swing',
      paths: [
        `/assets/characters/${normalizedCharacterName}/melee_swing`,
        `/assets/characters/${normalizedCharacterName}/melee`,
        getAudioPath('abilities', 'melee', 'melee_swing', normalizedCharacterName),
        getAudioPath('abilities', 'melee', 'melee_swing')
      ]
    },
    {
      name: 'melee_hit',
      paths: [
        `/assets/characters/${normalizedCharacterName}/melee_hit`,
        `/assets/characters/${normalizedCharacterName}/melee`,
        getAudioPath('abilities', 'melee', 'melee_hit', normalizedCharacterName),
        getAudioPath('abilities', 'melee', 'melee_hit')
      ]
    }
  ];
  
  // Preload each ability sound (try all paths until one succeeds)
  for (const sound of abilitySounds) {
    let loaded = false;
    
    // Try each path for this sound
    for (const basePath of sound.paths) {
      if (loaded) break;
      
      // If path already has extension, try it directly
      if (basePath.includes('.wav') || basePath.includes('.mp3') || basePath.includes('.ogg')) {
        const audio = await tryLoadAudio(basePath);
        if (audio) {
          loaded = true;
          break;
        }
        // Also try other extensions for paths from getAudioPath (which returns .wav)
        if (basePath.endsWith('.wav')) {
          const mp3Path = basePath.replace('.wav', '.mp3');
          const oggPath = basePath.replace('.wav', '.ogg');
          const mp3Audio = await tryLoadAudio(mp3Path);
          if (mp3Audio) {
            loaded = true;
            break;
          }
          const oggAudio = await tryLoadAudio(oggPath);
          if (oggAudio) {
            loaded = true;
            break;
          }
        }
      } else {
        // Path without extension, try all extensions
        for (const ext of SOUND_EXTENSIONS) {
          const path = `${basePath}.${ext}`;
          const audio = await tryLoadAudio(path);
          if (audio) {
            loaded = true;
            break; // Found the sound, move to next ability sound
          }
        }
      }
    }
  }
}

