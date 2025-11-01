/**
 * CharacterSound.js
 * 
 * Handles character-specific sound loading with fallback to generic sounds.
 */

/**
 * Sound file extensions to try
 */
const SOUND_EXTENSIONS = ['mp3', 'ogg', 'wav'];

/**
 * Try to load a sound file
 * @param {string} path - Sound file path (without extension)
 * @returns {Promise<string|null>} Path to sound file if found, null otherwise
 */
async function tryLoadSound(path) {
  for (const ext of SOUND_EXTENSIONS) {
    const testPath = `${path}.${ext}`;
    try {
      const testAudio = new Audio(testPath);
      const canLoad = await new Promise((resolve) => {
        const timeout = setTimeout(() => resolve(false), 500);
        testAudio.addEventListener('canplay', () => {
          clearTimeout(timeout);
          resolve(true);
        }, { once: true });
        testAudio.addEventListener('error', () => {
          clearTimeout(timeout);
          resolve(false);
        }, { once: true });
        testAudio.load();
      });
      if (canLoad) {
        return testPath;
      }
    } catch (e) {
      // Try next format
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
 * @returns {Promise<void>}
 */
export async function loadAllCharacterSounds(characterName, soundManager) {
  // Load footstep sound
  const footstepSound = await loadCharacterSound(characterName, 'footstep');
  if (footstepSound && soundManager) {
    soundManager.loadFootstepSound(footstepSound);
  }
  
  // Load obstacle footstep sound
  const obstacleFootstepSound = await loadCharacterSound(characterName, 'footstep_obstacle');
  if (obstacleFootstepSound && soundManager) {
    soundManager.loadObstacleFootstepSound(obstacleFootstepSound);
  }
  
  // Load jump sound
  const jumpSound = await loadCharacterSound(characterName, 'jump');
  if (jumpSound && soundManager) {
    soundManager.loadJumpSound(jumpSound);
  }
  
  // Load obstacle jump sound
  const obstacleJumpSound = await loadCharacterSound(characterName, 'jump_obstacle');
  if (obstacleJumpSound && soundManager) {
    soundManager.loadObstacleJumpSound(obstacleJumpSound);
  }
}

