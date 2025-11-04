/**
 * GameInitializer.js
 * 
 * Handles game initialization logic extracted from main.js.
 * Provides structured initialization flow.
 */

import { getParam } from '../../utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter, getLastGameMode, setLastGameMode, getLastInputMode, setLastInputMode } from '../../utils/StorageUtils.js';
import { GAME_CONSTANTS } from '../../config/GameConstants.js';
import { sendPlayerState } from './MultiplayerHelpers.js';

/**
 * Get initial game configuration from URL params and localStorage
 * @returns {Object} Configuration object
 */
export function getInitialConfig() {
  const urlCharacter = getParam('char', null);
  const storedCharacter = getLastCharacter();
  const characterName = urlCharacter || storedCharacter || GAME_CONSTANTS.DEFAULT_CHARACTER;
  
  if (urlCharacter) {
    setLastCharacter(urlCharacter);
  }
  
  const urlGameMode = getParam('mode', null);
  const storedGameMode = getLastGameMode();
  const gameMode = urlGameMode || storedGameMode || GAME_CONSTANTS.DEFAULT_GAME_MODE;
  
  if (urlGameMode) {
    setLastGameMode(urlGameMode);
  }
  
  const urlArena = getParam('arena', GAME_CONSTANTS.DEFAULT_ARENA);
  
  const urlRoom = getParam('room', null);
  
  return {
    characterName,
    gameMode,
    arena: urlArena,
    room: urlRoom
  };
}

/**
 * Validate and correct input mode based on controller availability
 * @param {Object} inputManager - Input manager instance
 * @returns {string} Corrected input mode
 */
export function validateInputMode(inputManager) {
  const savedInputMode = getLastInputMode();
  let initialInputMode = savedInputMode;
  
  if (initialInputMode === 'controller' && !inputManager.isGamepadConnected()) {
    initialInputMode = 'keyboard';
    setLastInputMode('keyboard');
  }
  
  return initialInputMode;
}

/**
 * Setup position synchronization loop
 * @param {Object} gameLoop - Game loop instance
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {Object} characterManager - Character manager instance
 * @param {Object} sceneManager - Scene manager instance
 * @param {Object} inputManager - Input manager instance (optional)
 */
export function setupPositionSync(gameLoop, multiplayerManager, characterManager, sceneManager, inputManager = null) {
  let lastPositionSyncTime = 0;
  const syncInterval = GAME_CONSTANTS.SYNC_INTERVAL;
  
  const originalTick = gameLoop.tick.bind(gameLoop);
  
  gameLoop.tick = function() {
    originalTick();
    
    // Sync local player position with other players
    if (multiplayerManager && multiplayerManager.isInRoom() && characterManager.getPlayer()) {
      const syncNow = Date.now();
      if (syncNow - lastPositionSyncTime >= syncInterval) {
        sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager);
        lastPositionSyncTime = syncNow;
      }
    }
  };
}

/**
 * Get current game state for room creation/joining
 * @param {Object} arenaManager - Arena manager instance
 * @param {Object} gameModeManager - Game mode manager instance
 * @param {Object} characterManager - Character manager instance
 * @returns {Object} Game state object
 */
export function getCurrentGameState(arenaManager, gameModeManager, characterManager) {
  return {
    arena: arenaManager.getCurrentArena(),
    gameMode: gameModeManager.getMode(),
    characterName: characterManager.getCharacterName()
  };
}

