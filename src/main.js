/**
 * main.js
 * 
 * Main entry point for the game.
 * Orchestrates initialization and starts the game loop.
 */

import { getInitialConfig, initializeGame, setupGameLoopWrapper, initializeBackgroundMusic, handleAutoJoinRoom, setupDebugUtilities } from './core/GameBootstrap.js';
import { initializeManagers } from './core/ManagerInitializer.js';
import { initializeUI } from './core/UIInitializer.js';
import { getLastInputMode, setLastInputMode } from './utils/StorageUtils.js';
import { GAME_CONSTANTS } from './config/global/GameConstants.js';
import { getLoadingProgressManager } from './utils/LoadingProgressManager.js';

// Get canvas element
const canvas = document.getElementById('app-canvas');
if (!canvas) {
  throw new Error('Canvas element not found');
}

// Initialize progress manager
const progressManager = getLoadingProgressManager();
progressManager.setPercentage(0, 'Initializing game managers...');

// Get initial configuration
const config = getInitialConfig();

// Initialize all managers
progressManager.setPercentage(10, 'Setting up game systems...');
const managers = initializeManagers(canvas, config.arenaName);
progressManager.setPercentage(20, 'Managers initialized');

if (managers.inputManager && typeof managers.inputManager.applyCharacterMovementStats === 'function') {
  managers.inputManager.applyCharacterMovementStats(config.characterName);
}

// Initialize input mode from storage
const savedInputMode = getLastInputMode();
const initialInputMode = savedInputMode || GAME_CONSTANTS.DEFAULT_INPUT_MODE;
if (initialInputMode === 'controller' && !managers.inputManager.isGamepadConnected()) {
  managers.inputManager.setInputMode('keyboard');
  setLastInputMode('keyboard');
} else {
  managers.inputManager.setInputMode(initialInputMode);
}

// Set initial game mode
managers.gameModeManager.setMode(config.gameMode);
managers.sceneManager.setMushroomsVisible(config.gameMode === GAME_CONSTANTS.MUSHROOM_VISIBLE_MODE);

// Initialize UI components
const uiComponents = initializeUI(managers, {
  characterName: config.characterName,
  gameMode: config.gameMode,
  arenaName: config.arenaName
});

// Setup game loop wrapper for additional per-frame updates
setupGameLoopWrapper(managers.gameLoop, managers, uiComponents);

// Initialize background music
const backgroundMusicPath = '/assets/music/background.wav';
initializeBackgroundMusic(managers.characterManager, backgroundMusicPath);

// Setup debug utilities
setupDebugUtilities(managers);

// Helper function to get current game state (for room auto-join)
const getCurrentGameState = () => {
  return {
    arena: managers.arenaManager.getCurrentArena(),
    gameMode: managers.gameModeManager.getMode(),
    characterName: managers.characterManager.getCharacterName()
  };
};

// Handle auto-join room from URL
if (config.roomCode) {
  handleAutoJoinRoom(managers.multiplayerManager, uiComponents.roomManager, config.roomCode, getCurrentGameState);
}

// Start the game
initializeGame(managers, uiComponents, config);
