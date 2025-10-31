// Minimal dependencies via CDN ESM
import { initCharacterSwitcher } from './ui/CharacterSwitcher.js';
import { initControlsLegend } from './ui/ControlsLegend.js';
import { initGameModeSwitcher } from './ui/GameModeSwitcher.js';
import { initGameModeDisplay } from './ui/GameModeDisplay.js';
import { initArenaSwitcher } from './ui/ArenaSwitcher.js';
import { initRoomManager } from './ui/RoomManager.js';
import { RespawnOverlay } from './ui/RespawnOverlay.js';
import { getParam } from './utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter } from './utils/StorageUtils.js';
import { SceneManager } from './core/SceneManager.js';
import { LargeArenaSceneManager } from './core/LargeArenaSceneManager.js';
import { CharacterManager } from './core/CharacterManager.js';
import { InputManager } from './core/InputManager.js';
import { CollisionManager } from './core/CollisionManager.js';
import { LargeArenaCollisionManager } from './core/LargeArenaCollisionManager.js';
import { GameModeManager } from './core/GameModeManager.js';
import { EntityManager } from './core/EntityManager.js';
import { ProjectileManager } from './core/ProjectileManager.js';
import { MultiplayerManager } from './core/MultiplayerManager.js';
import { GameLoop } from './core/GameLoop.js';
import { ParticleManager } from './core/ParticleManager.js';
import { ArenaManager } from './core/ArenaManager.js';

// Initialize game components
const canvas = document.getElementById('app-canvas');
const respawnOverlay = new RespawnOverlay();
const arenaManager = new ArenaManager();

// Get arena from URL param or default to standard
const urlArena = getParam('arena', 'standard');
arenaManager.setArena(urlArena);

// Initialize arena-specific managers based on selection
let sceneManager, collisionManager;
const isLargeArena = arenaManager.isLargeArena();

if (isLargeArena) {
  sceneManager = new LargeArenaSceneManager();
  sceneManager.init(canvas);
  collisionManager = new LargeArenaCollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);
} else {
  sceneManager = new SceneManager();
  sceneManager.init(canvas);
  collisionManager = new CollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);
}

// Now create other components that depend on the scene
const customFootstepPath = null;
const characterManager = new CharacterManager(null, customFootstepPath);
const inputManager = new InputManager();
const entityManager = new EntityManager(sceneManager.getScene(), sceneManager.getArenaSize(), collisionManager);
const gameModeManager = new GameModeManager(entityManager, urlArena);

// Connect game mode manager to collision manager
collisionManager.setGameModeManager(gameModeManager);

// Initialize character manager with the scene
characterManager.initializePlayer(sceneManager.getScene());

// Connect collision manager to character manager
characterManager.setCollisionManager(collisionManager);

// Initialize particle manager for smoke effects
const particleManager = new ParticleManager(sceneManager.getScene());
characterManager.setParticleManager(particleManager);

// Initialize projectile manager for shooting mode
const projectileManager = new ProjectileManager(sceneManager.getScene(), collisionManager);

// Initialize multiplayer manager
const multiplayerManager = new MultiplayerManager(
  (playerId) => {
    console.log('Player joined:', playerId);
  },
  (playerId) => {
    console.log('Player left:', playerId);
  },
  (playerId, data) => {
    console.log('Game data received from', playerId, data);
    // Handle multiplayer game data sync
  }
);

// Set respawn callback for mode changes
gameModeManager.setOnModeChangeCallback(() => {
  characterManager.respawn();
  collisionManager.updateWallsForMode();
  const currentMode = gameModeManager.getMode();
  sceneManager.setMushroomsVisible(currentMode === 'free-play');
  
  // Clear projectiles when mode changes
  if (projectileManager) {
    projectileManager.clearAll();
  }
});

const gameLoop = new GameLoop(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, projectileManager);

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


// Game mode selection via URL param ?mode=free-play (defaults to 'free-play')
const gameMode = getParam('mode', 'free-play');
gameModeManager.setMode(gameMode);
// Set initial mushroom visibility based on starting mode
sceneManager.setMushroomsVisible(gameMode === 'free-play');

// Helper function to update URL parameter
function updateURLParam(paramName, paramValue) {
  const url = new URL(window.location);
  url.searchParams.set(paramName, paramValue);
  return url.toString();
}

// Initialize arena switcher UI
const arenaMount = document.getElementById('arena-switcher') || document.body;
initArenaSwitcher({
  mount: arenaMount,
  options: arenaManager.getArenas(),
  value: urlArena,
  onChange: (arena) => {
    // Reload page with new arena to reinitialize everything
    window.location.href = updateURLParam('arena', arena);
  }
});

// Get room manager elements (defined early so they can be referenced in callbacks)
const roomMount = document.getElementById('room-manager') || document.body;
const roomPanel = document.getElementById('room-manager-panel');

// Initialize game mode switcher UI
const gameModeMount = document.getElementById('game-mode-switcher') || document.body;
initGameModeSwitcher({
  mount: gameModeMount,
  options: gameModeManager.getAllModes(),
  value: gameMode,
  onChange: (mode) => { 
    gameModeManager.setMode(mode);
    
    // Clear projectiles when leaving shooting mode
    if (mode !== 'shooting' && projectileManager) {
      projectileManager.clearAll();
    }
    
    // Leave room when leaving shooting mode
    if (mode !== 'shooting' && multiplayerManager.isInRoom()) {
      multiplayerManager.leaveRoom();
      if (typeof roomManager !== 'undefined' && roomManager) {
        roomManager.update();
      }
      
      // Remove room from URL
      const url = new URL(window.location);
      url.searchParams.delete('room');
      window.history.pushState({}, '', url);
    }
    
    // Show/hide room manager based on mode
    if (mode === 'shooting') {
      if (roomPanel) roomPanel.style.display = 'block';
    } else {
      if (roomPanel) roomPanel.style.display = 'none';
    }
  },
  gameModeManager: gameModeManager
});

// Show/hide room manager based on initial mode
if (gameMode === 'shooting') {
  if (roomPanel) roomPanel.style.display = 'block';
} else {
  if (roomPanel) roomPanel.style.display = 'none';
}

// Initialize controls legend
const legendMount = document.getElementById('controls-legend') || document.body;
initControlsLegend({
  mount: legendMount
});

// Initialize game mode display
const modeDisplayMount = document.getElementById('game-mode-display') || document.body;
initGameModeDisplay({
  mount: modeDisplayMount,
  gameModeManager: gameModeManager,
  characterManager: characterManager
});

// Initialize room manager UI for shooting mode
const roomManager = initRoomManager({
  mount: roomMount,
  multiplayerManager: multiplayerManager,
  onRoomCreated: (roomCode) => {
    console.log('Room created:', roomCode);
    // Start shooting mode if not already
    if (gameModeManager.getMode() !== 'shooting') {
      gameModeManager.setMode('shooting');
    }
    gameModeManager.startMode();
  },
  onRoomJoined: (roomCode) => {
    console.log('Joined room:', roomCode);
    // Start shooting mode if not already
    if (gameModeManager.getMode() !== 'shooting') {
      gameModeManager.setMode('shooting');
    }
    gameModeManager.startMode();
  }
});

// Check URL for room code and auto-join
const urlRoom = getParam('room', null);
if (urlRoom) {
  multiplayerManager.joinRoom(urlRoom.toUpperCase());
  roomManager.update();
}

// Background music setup
// To use background music, provide the path here:
// Example: '/assets/music/background.mp3' or '/assets/music/background.ogg'
// Leave as null to disable background music
const backgroundMusicPath = '/assets/music/background.wav'; // Set to your music file path to use background music

// Initialize background music if path is provided
if (backgroundMusicPath) {
  const soundManager = characterManager.getSoundManager();
  if (soundManager) {
    // Load and auto-play when ready (will attempt to play automatically when loaded)
    soundManager.loadBackgroundMusic(backgroundMusicPath);
    
    // Fallback: If autoplay is blocked, try again on first user interaction
    let interactionHandled = false;
    const tryPlayOnInteraction = () => {
      if (interactionHandled) return;
      interactionHandled = true;
      
      // Check if music is already playing
      if (!soundManager.isBackgroundMusicPlaying()) {
        // Try to play one more time
        soundManager.playBackgroundMusic();
      }
      
      // Remove all listeners after first interaction
      document.removeEventListener('click', tryPlayOnInteraction);
      document.removeEventListener('keydown', tryPlayOnInteraction);
      document.removeEventListener('touchstart', tryPlayOnInteraction);
      document.removeEventListener('pointerdown', tryPlayOnInteraction);
    };
    
    // Set up listeners for user interaction as fallback
    document.addEventListener('click', tryPlayOnInteraction, { once: true });
    document.addEventListener('keydown', tryPlayOnInteraction, { once: true });
    document.addEventListener('touchstart', tryPlayOnInteraction, { once: true });
    document.addEventListener('pointerdown', tryPlayOnInteraction, { once: true });
  }
}

// Start the game
(async () => {
  await characterManager.loadCharacter(characterName);
  gameLoop.start();
})();


