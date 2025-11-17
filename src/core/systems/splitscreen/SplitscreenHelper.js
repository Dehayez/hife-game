/**
 * SplitscreenHelper.js
 * 
 * Helper functions for managing splitscreen mode.
 * Provides easy-to-use functions to enable/disable splitscreen.
 */

/**
 * Enable splitscreen mode
 * @param {Object} managers - Game managers object
 * @param {number} playerCount - Number of players (2-4)
 * @param {string} layout - 'horizontal' or 'vertical'
 * @param {Array<string>} characterNames - Array of character names for each player
 * @returns {Promise<boolean>} True if successful, false otherwise
 */
export async function enableSplitscreen(managers, playerCount = 2, layout = 'horizontal', characterNames = ['lucy', 'herald']) {
  const {
    splitscreenManager,
    multiPlayerManager,
    sceneManager,
    collisionManager,
    particleManager,
    inputManager
  } = managers;

  if (!splitscreenManager || !multiPlayerManager || !sceneManager) {
    console.error('Splitscreen managers not initialized');
    return false;
  }

  try {
    // Enable splitscreen manager
    splitscreenManager.enable(playerCount, layout);

    // Create cameras for each player
    for (let i = 0; i < playerCount; i++) {
      const camera = sceneManager.createCamera(i);
      splitscreenManager.addCamera(camera, i);
    }

    // Create players
    for (let i = 0; i < playerCount; i++) {
      const characterName = characterNames[i] || characterNames[0];
      await multiPlayerManager.addPlayer(characterName, collisionManager, particleManager);
    }

    // Update camera aspect ratios
    splitscreenManager.handleResize();

    return true;
  } catch (error) {
    console.error('Error enabling splitscreen:', error);
    return false;
  }
}

/**
 * Disable splitscreen mode
 * @param {Object} managers - Game managers object
 */
export function disableSplitscreen(managers) {
  const {
    splitscreenManager,
    multiPlayerManager,
    sceneManager
  } = managers;

  if (!splitscreenManager || !multiPlayerManager || !sceneManager) {
    return;
  }

  // Disable splitscreen manager
  splitscreenManager.disable();

  // Remove all players
  multiPlayerManager.clearAll();

  // Remove extra cameras (keep camera 0)
  for (let i = 1; i < sceneManager.cameras.length; i++) {
    sceneManager.removeCamera(i);
  }
}

/**
 * Check if splitscreen is enabled
 * @param {Object} managers - Game managers object
 * @returns {boolean} True if splitscreen is enabled
 */
export function isSplitscreenEnabled(managers) {
  const { splitscreenManager } = managers;
  return splitscreenManager && splitscreenManager.isSplitscreenEnabled();
}












