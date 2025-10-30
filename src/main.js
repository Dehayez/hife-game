// Minimal dependencies via CDN ESM
import { initCharacterSwitcher } from './ui/CharacterSwitcher.js';
import { initControlsLegend } from './ui/ControlsLegend.js';
import { RespawnOverlay } from './ui/RespawnOverlay.js';
import { getParam } from './utils/UrlUtils.js';
import { SceneManager } from './core/SceneManager.js';
import { CharacterManager } from './core/CharacterManager.js';
import { InputManager } from './core/InputManager.js';
import { CollisionManager } from './core/CollisionManager.js';
import { GameLoop } from './core/GameLoop.js';

// Initialize game components
const canvas = document.getElementById('app-canvas');
const sceneManager = new SceneManager();

// Initialize scene first
sceneManager.init(canvas);

// Create respawn overlay
const respawnOverlay = new RespawnOverlay();

// Now create other components that depend on the scene
const characterManager = new CharacterManager(null); // Initialize without scene first
const inputManager = new InputManager();
const collisionManager = new CollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);

// Initialize character manager with the scene
characterManager.initializePlayer(sceneManager.getScene());

const gameLoop = new GameLoop(sceneManager, characterManager, inputManager, collisionManager);

// Character selection via URL param ?char=lucy (defaults to 'lucy')
const characterName = getParam('char', 'lucy');

// Initialize character switcher UI
const AVAILABLE_CHARACTERS = ['lucy', 'herald'];
const switcherMount = document.getElementById('char-switcher') || document.body;
initCharacterSwitcher({
  mount: switcherMount,
  options: AVAILABLE_CHARACTERS,
  value: characterName,
  onChange: (val) => { characterManager.loadCharacter(val); }
});

// Initialize controls legend
const legendMount = document.getElementById('controls-legend') || document.body;
initControlsLegend({
  mount: legendMount
});

// Start the game
(async () => {
  await characterManager.loadCharacter(characterName);
  gameLoop.start();
})();


