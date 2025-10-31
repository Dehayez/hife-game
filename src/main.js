// Minimal dependencies via CDN ESM
import { initCharacterSwitcher } from './ui/CharacterSwitcher.js';
import { initControlsLegend } from './ui/ControlsLegend.js';
import { initGameModeSwitcher } from './ui/GameModeSwitcher.js';
import { initGameModeDisplay } from './ui/GameModeDisplay.js';
import { StartButton } from './ui/StartButton.js';
import { RespawnOverlay } from './ui/RespawnOverlay.js';
import { getParam } from './utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter } from './utils/StorageUtils.js';
import { SceneManager } from './core/SceneManager.js';
import { CharacterManager } from './core/CharacterManager.js';
import { InputManager } from './core/InputManager.js';
import { CollisionManager } from './core/CollisionManager.js';
import { GameModeManager } from './core/GameModeManager.js';
import { EntityManager } from './core/EntityManager.js';
import { GameLoop } from './core/GameLoop.js';

// Initialize game components
const canvas = document.getElementById('app-canvas');
const sceneManager = new SceneManager();

// Initialize scene first
sceneManager.init(canvas);

// Create respawn overlay
const respawnOverlay = new RespawnOverlay();

// Now create other components that depend on the scene
// To use a custom footstep sound, provide the path here:
// Example: '/assets/sounds/footstep.mp3' or '/assets/sounds/footstep.ogg'
// Leave as null to use the default procedural sound
const customFootstepPath = null; // Set to your sound file path to use custom sound
const characterManager = new CharacterManager(null, customFootstepPath); // Initialize without scene first
const inputManager = new InputManager();
const collisionManager = new CollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);
const entityManager = new EntityManager(sceneManager.getScene(), sceneManager.getArenaSize(), collisionManager);
const gameModeManager = new GameModeManager(entityManager);

// Connect game mode manager to collision manager
collisionManager.setGameModeManager(gameModeManager);

// Initialize character manager with the scene
characterManager.initializePlayer(sceneManager.getScene());

// Connect collision manager to character manager (for ground type checking)
characterManager.setCollisionManager(collisionManager);

// Set respawn callback for mode changes
gameModeManager.setOnModeChangeCallback(() => {
  characterManager.respawn();
  collisionManager.updateWallsForMode();
  // Show mushrooms only in Forest Wander (free-play) mode
  const currentMode = gameModeManager.getMode();
  sceneManager.setMushroomsVisible(currentMode === 'free-play');
});

// Set restart callback to show start button
gameModeManager.setOnRestartCallback(() => {
  checkStartButton();
});

// Create start button before game loop
const startButton = new StartButton(() => {
  // On start
  gameModeManager.startMode();
  startButton.hide();
});

const gameLoop = new GameLoop(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, startButton);

// Show start button when mode changes or when mode is not started
const checkStartButton = () => {
  const mode = gameModeManager.getMode();
  const modeState = gameModeManager.modeState;
  
  // Show start button for time-trial and survival modes when not started
  if ((mode === 'time-trial' || mode === 'survival') && !modeState.isStarted) {
    startButton.show();
  } else {
    startButton.hide();
  }
};

// Show start button initially if needed
setTimeout(checkStartButton, 100);

// Character selection: URL param > localStorage > default
// Priority: 1) URL param ?char=lucy, 2) Last played character (localStorage), 3) Default 'lucy'
const urlCharacter = getParam('char', null);
const storedCharacter = getLastCharacter();
const characterName = urlCharacter || storedCharacter || 'lucy';

// If character came from URL param, save it to localStorage
if (urlCharacter) {
  setLastCharacter(urlCharacter);
}

// Initialize character switcher UI
const AVAILABLE_CHARACTERS = ['lucy', 'herald'];
const switcherMount = document.getElementById('char-switcher') || document.body;
initCharacterSwitcher({
  mount: switcherMount,
  options: AVAILABLE_CHARACTERS,
  value: characterName,
  onChange: (val) => { 
    characterManager.loadCharacter(val);
    // Save to localStorage when character changes
    setLastCharacter(val);
  }
});

// Mount start button below character switcher
const charSwitcherPanel = switcherMount.closest('.ui__panel');
if (charSwitcherPanel) {
  charSwitcherPanel.appendChild(startButton.getElement());
  startButton.hide(); // Initially hidden, shown by checkStartButton
}

// Game mode selection via URL param ?mode=free-play (defaults to 'free-play')
const gameMode = getParam('mode', 'free-play');
gameModeManager.setMode(gameMode);
// Set initial mushroom visibility based on starting mode
sceneManager.setMushroomsVisible(gameMode === 'free-play');

// Initialize game mode switcher UI
const gameModeMount = document.getElementById('game-mode-switcher') || document.body;
initGameModeSwitcher({
  mount: gameModeMount,
  options: gameModeManager.getAllModes(),
  value: gameMode,
  onChange: (mode) => { 
    gameModeManager.setMode(mode);
    checkStartButton();
  },
  gameModeManager: gameModeManager
});

// Initialize controls legend
const legendMount = document.getElementById('controls-legend') || document.body;
initControlsLegend({
  mount: legendMount
});

// Initialize game mode display
const modeDisplayMount = document.getElementById('game-mode-display') || document.body;
initGameModeDisplay({
  mount: modeDisplayMount,
  gameModeManager: gameModeManager
});

// Start the game
(async () => {
  await characterManager.loadCharacter(characterName);
  gameLoop.start();
})();


