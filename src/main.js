// Minimal dependencies via CDN ESM
import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { initCharacterSwitcher } from './ui/CharacterSwitcher.js';
import { initControlsLegend } from './ui/ControlsLegend.js';
import { initGameModeSwitcher } from './ui/GameModeSwitcher.js';
import { initGameModeDisplay } from './ui/GameModeDisplay.js';
import { initArenaSwitcher } from './ui/ArenaSwitcher.js';
import { initRoomManager } from './ui/RoomManager.js';
import { initBotControl } from './ui/BotControl.js';
import { initCooldownIndicator } from './ui/CooldownIndicator.js';
import { initConnectionStatus } from './ui/ConnectionStatus.js';
import { initInputModeSwitcher } from './ui/InputModeSwitcher.js';
import { RespawnOverlay } from './ui/RespawnOverlay.js';
import { getParam } from './utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter, getLastGameMode, setLastGameMode, getLastInputMode, setLastInputMode } from './utils/StorageUtils.js';
import { SceneManager } from './core/scene/SceneManager.js';
import { LargeArenaSceneManager } from './core/scene/LargeArenaSceneManager.js';
import { CharacterManager } from './core/character/CharacterManager.js';
import { InputManager } from './core/input/InputManager.js';
import { CollisionManager } from './core/collision/CollisionManager.js';
import { LargeArenaCollisionManager } from './core/collision/LargeArenaCollisionManager.js';
import { GameModeManager } from './core/gamemode/GameModeManager.js';
import { EntityManager } from './core/entity/EntityManager.js';
import { ProjectileManager } from './core/projectile/ProjectileManager.js';
import { MultiplayerManager } from './core/multiplayer/MultiplayerManager.js';
import { RemotePlayerManager } from './core/multiplayer/RemotePlayerManager.js';
import { BotManager } from './core/bot/BotManager.js';
import { HealthBarManager } from './core/healthbar/HealthBarManager.js';
import { GameLoop } from './core/gameloop/GameLoop.js';
import { ParticleManager } from './core/particle/ParticleManager.js';
import { ArenaManager } from './core/arena/ArenaManager.js';
import { getCharacterHealthStats } from './core/character/CharacterStats.js';

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

// Initialize input mode from storage (before other components use it)
const savedInputMode = getLastInputMode();
inputManager.setInputMode(savedInputMode);

const entityManager = new EntityManager(sceneManager.getScene(), sceneManager.getArenaSize(), collisionManager);
const gameModeManager = new GameModeManager(entityManager, urlArena);

// Connect game mode manager to collision manager
collisionManager.setGameModeManager(gameModeManager);

// Initialize character manager with the scene
characterManager.initializePlayer(sceneManager.getScene());

// Connect collision manager to character manager
characterManager.setCollisionManager(collisionManager);

// Initialize particle manager for smoke effects
const particleManager = new ParticleManager(sceneManager.getScene(), collisionManager);
characterManager.setParticleManager(particleManager);

// Initialize remote player manager for multiplayer
const remotePlayerManager = new RemotePlayerManager(sceneManager.getScene());

// Initialize projectile manager for shooting mode
const projectileManager = new ProjectileManager(sceneManager.getScene(), collisionManager, particleManager);

// Initialize bot manager for shooting mode
const botManager = new BotManager(sceneManager.getScene(), collisionManager, projectileManager, particleManager);

// Initialize health bar manager (camera will be set later)
const healthBarManager = new HealthBarManager(sceneManager.getScene(), null);

// Initialize multiplayer manager
const multiplayerManager = new MultiplayerManager(
  async (playerId, playerInfo) => {
    // Spawn remote player when someone joins
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      // Spawn at origin first, position will be updated when we receive their state
      const initialPosition = { x: 0, y: 0, z: 0 };
      
      try {
        const remotePlayer = await remotePlayerManager.spawnRemotePlayer(
          playerId,
          playerInfo?.characterName || 'lucy',
          initialPosition
        );
        
        // Create health bar for remote player
        if (healthBarManager && remotePlayer && remotePlayer.mesh) {
          const mesh = remotePlayer.mesh;
          const characterName = playerInfo?.characterName || 'lucy';
          const healthStats = getCharacterHealthStats();
          mesh.userData.health = mesh.userData.health || healthStats.defaultHealth;
          mesh.userData.maxHealth = mesh.userData.maxHealth || healthStats.maxHealth;
          healthBarManager.createHealthBar(mesh, false);
        }
        
        // When someone joins, send our current state so they can see us
        if (characterManager.getPlayer()) {
          setTimeout(() => {
            const player = characterManager.getPlayer();
            const camera = sceneManager.getCamera();
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);
            const rotation = Math.atan2(cameraDir.x, cameraDir.z);
            
            multiplayerManager.sendPlayerState({
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotation: rotation,
              currentAnimKey: characterManager.currentAnimKey || 'idle_front',
              lastFacing: characterManager.lastFacing || 'front',
              isGrounded: characterManager.characterData.isGrounded || true
            });
          }, 50);
        }
      } catch (error) {
        // Error spawning remote player
      }
    }
  },
  (playerId) => {
    // Remove remote player when someone leaves
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      // Remove health bar first
      const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
      if (remotePlayer && remotePlayer.mesh && healthBarManager) {
        healthBarManager.removeHealthBar(remotePlayer.mesh);
      }
      
      // Then remove remote player
      remotePlayerManager.removeRemotePlayer(playerId);
    }
  },
  (playerId, data) => {
    // Handle multiplayer game data sync
    if (data.type === 'player-state') {
      // Update remote player position/state
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        
        // If remote player doesn't exist yet, spawn them
        if (!remotePlayer) {
          const playerInfo = multiplayerManager.getPlayerInfo(playerId);
          remotePlayerManager.spawnRemotePlayer(
            playerId,
            playerInfo?.characterName || 'lucy',
            { x: data.x || 0, y: data.y || 0, z: data.z || 0 }
          ).then(() => {
            // Create health bar for remote player
            const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
            if (healthBarManager && remotePlayer && remotePlayer.mesh) {
              const mesh = remotePlayer.mesh;
              const playerInfo = multiplayerManager.getPlayerInfo(playerId);
              const characterName = playerInfo?.characterName || 'lucy';
              const healthStats = getCharacterHealthStats();
              mesh.userData.health = mesh.userData.health || healthStats.defaultHealth;
              mesh.userData.maxHealth = mesh.userData.maxHealth || healthStats.maxHealth;
              healthBarManager.createHealthBar(mesh, false);
            }
            
            // Update position after spawning
            remotePlayerManager.updateRemotePlayer(playerId, {
              x: data.x,
              y: data.y,
              z: data.z,
              rotation: data.rotation,
              currentAnimKey: data.currentAnimKey,
              lastFacing: data.lastFacing,
              isGrounded: data.isGrounded
            });
          }).catch(error => {
            // Error spawning remote player
          });
        } else {
          // Update existing remote player
          remotePlayerManager.updateRemotePlayer(playerId, {
            x: data.x,
            y: data.y,
            z: data.z,
            rotation: data.rotation,
            currentAnimKey: data.currentAnimKey,
            lastFacing: data.lastFacing,
            isGrounded: data.isGrounded
          });
        }
      }
    } else if (data.type === 'projectile-create') {
      // Create projectile from remote player
      if (playerId !== multiplayerManager.getLocalPlayerId() && projectileManager) {
        const characterName = data.characterName || 'lucy';
        
        if (data.projectileType === 'mortar') {
          // Create mortar projectile
          projectileManager.createMortar(
            data.startX,
            data.startY,
            data.startZ,
            data.targetX,
            data.targetZ,
            playerId,
            characterName
          );
        } else {
          // Create firebolt projectile
          projectileManager.createProjectile(
            data.startX,
            data.startY,
            data.startZ,
            data.directionX,
            data.directionZ,
            playerId,
            characterName,
            data.targetX || null,
            data.targetZ || null
          );
        }
      }
    } else if (data.type === 'player-damage') {
      // Handle remote player damage (update health bar if visible)
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        if (remotePlayer && remotePlayer.mesh && healthBarManager) {
          remotePlayer.mesh.userData.health = data.health;
          remotePlayer.mesh.userData.maxHealth = data.maxHealth;
          // Health bar will update automatically on next frame
        }
      }
    } else if (data.type === 'room-state') {
      // Sync room state (arena, game mode) when joining
      // Note: Could update arena/mode here if needed, but might require page reload
    } else if (data.type === 'character-change') {
      // Handle remote player character change
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        if (remotePlayer) {
          // Update character for remote player (async)
          remotePlayerManager.updateRemotePlayerCharacter(playerId, data.characterName).catch(error => {
            // Error updating remote player character
          });
          
          // Update player info
          const playerInfo = multiplayerManager.getPlayerInfo(playerId);
          if (playerInfo) {
            playerInfo.characterName = data.characterName;
          }
        }
      }
    }
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
  
  // Clear bots when leaving shooting mode
  if (currentMode !== 'shooting' && botManager) {
    botManager.clearAll();
    if (healthBarManager) {
      healthBarManager.clearAll();
    }
  }
});

const gameLoop = new GameLoop(sceneManager, characterManager, inputManager, collisionManager, gameModeManager, entityManager, projectileManager, botManager, healthBarManager, multiplayerManager, remotePlayerManager);

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
const characterSwitcher = initCharacterSwitcher({
  mount: switcherMount,
  options: AVAILABLE_CHARACTERS,
  value: characterName,
  onChange: async (val) => { 
    await characterManager.loadCharacter(val);
    // Save to localStorage when character changes
    setLastCharacter(val);
    
    // Send character change to other players if in a multiplayer room
    if (multiplayerManager && multiplayerManager.isInRoom()) {
      // Update game state with new character name
      const gameState = getCurrentGameState();
      gameState.characterName = val;
      
      // Send character change event
      multiplayerManager.sendCharacterChange(val);
      
      // Also update player info in connected players
      const localPlayerId = multiplayerManager.getLocalPlayerId();
      const playerInfo = multiplayerManager.getPlayerInfo(localPlayerId);
      if (playerInfo) {
        playerInfo.characterName = val;
      }
    }
  }
});

// Connect character switcher UI to game loop so UI updates when controller changes character
gameLoop.setCharacterUIUpdateCallback((characterName) => {
  characterSwitcher.setValue(characterName);
});


// Game mode selection: URL param > localStorage > default
// Priority: 1) URL param ?mode=free-play, 2) Last played game mode (localStorage), 3) Default 'free-play'
const urlGameMode = getParam('mode', null);
const storedGameMode = getLastGameMode();
const gameMode = urlGameMode || storedGameMode || 'free-play';

// If game mode came from URL param, save it to localStorage
if (urlGameMode) {
  setLastGameMode(urlGameMode);
}

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
const botControlMount = document.getElementById('bot-control') || document.body;
const botControlPanel = document.getElementById('bot-control-panel');
const cooldownMount = document.getElementById('cooldown-indicator') || document.body;
const connectionStatusMount = document.getElementById('connection-status') || document.body;

// Initialize cooldown indicator UI early (before it's referenced in callbacks)
let cooldownIndicator = initCooldownIndicator({
  mount: cooldownMount,
  projectileManager: projectileManager,
  characterManager: characterManager
});

// Initialize connection status indicator
initConnectionStatus({
  mount: connectionStatusMount,
  multiplayerManager: multiplayerManager
});

// Initialize game mode switcher UI
const gameModeMount = document.getElementById('game-mode-switcher') || document.body;
initGameModeSwitcher({
  mount: gameModeMount,
  options: gameModeManager.getAllModes(),
  value: gameMode,
  onChange: (mode) => { 
    gameModeManager.setMode(mode);
    
    // Save to localStorage when game mode changes
    setLastGameMode(mode);
    
    // Update legend when game mode changes
    if (controlsLegend) {
      controlsLegend.update();
    }
    
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
    
    // Show/hide room manager and bot control based on mode
    if (mode === 'shooting') {
      if (roomPanel) roomPanel.style.display = 'block';
      if (botControlPanel) botControlPanel.style.display = 'block';
      
      // Show cooldown indicator
      if (cooldownIndicator) {
        cooldownIndicator.show();
      }
      
      // Create health bar for player when entering shooting mode
      if (healthBarManager && characterManager.getPlayer()) {
        const player = characterManager.getPlayer();
        // Check if health bar already exists
        const existingBar = healthBarManager.healthBars.get(player);
        if (!existingBar) {
          player.userData.health = characterManager.getHealth();
          player.userData.maxHealth = characterManager.getMaxHealth();
          healthBarManager.createHealthBar(player, true);
        }
      }
      
      // Restore saved bot count when entering shooting mode
      if (botControl && typeof botControl.restoreSavedBots === 'function') {
        // Delay slightly to ensure everything is initialized
        setTimeout(() => {
          botControl.restoreSavedBots();
        }, 100);
      }
    } else {
      if (roomPanel) roomPanel.style.display = 'none';
      if (botControlPanel) botControlPanel.style.display = 'none';
      
      // Hide cooldown indicator
      if (cooldownIndicator) {
        cooldownIndicator.hide();
      }
      
      // Clear bots and health bars when leaving shooting mode
      if (botManager) {
        botManager.clearAll();
      }
      if (healthBarManager) {
        healthBarManager.clearAll();
      }
    }
  },
  gameModeManager: gameModeManager
});

// Show/hide room manager and cooldown indicator based on initial mode
if (gameMode === 'shooting') {
  if (roomPanel) roomPanel.style.display = 'block';
  if (cooldownIndicator) {
    cooldownIndicator.show();
  }
} else {
  if (roomPanel) roomPanel.style.display = 'none';
  if (cooldownIndicator) {
    cooldownIndicator.hide();
  }
}

// Initialize controls legend
const legendMount = document.getElementById('controls-legend') || document.body;
const controlsLegend = initControlsLegend({
  mount: legendMount,
  inputManager: inputManager,
  gameModeManager: gameModeManager
});

// Update legend when game mode changes
gameModeManager.setOnModeChangeCallback(() => {
  if (controlsLegend) {
    controlsLegend.update();
  }
});

// Initialize input mode switcher UI
const inputModeMount = document.getElementById('input-mode-switcher') || document.body;

// Check if controller is available before setting mode
// If saved mode is controller but no controller is available, default to keyboard
let initialInputMode = savedInputMode;
if (initialInputMode === 'controller' && !inputManager.isGamepadConnected()) {
  initialInputMode = 'keyboard';
  // Save the corrected mode
  setLastInputMode('keyboard');
}

inputManager.setInputMode(initialInputMode);

const inputModeSwitcher = initInputModeSwitcher({
  mount: inputModeMount,
  options: ['keyboard', 'controller'],
  value: initialInputMode,
  onChange: (mode) => {
    const success = inputManager.setInputMode(mode);
    if (success) {
      setLastInputMode(mode);
      // Update legend when input mode changes
      if (controlsLegend) {
        controlsLegend.update();
      }
    }
  }
});

// Set initial controller availability status
inputModeSwitcher.setControllerAvailable(inputManager.isGamepadConnected());

// Set up callback for controller connection status changes
inputManager.setOnControllerStatusChange((isConnected) => {
  inputModeSwitcher.setControllerAvailable(isConnected);
  
  if (isConnected) {
    // Auto-switch to controller mode when controller is detected
    const success = inputManager.setInputMode('controller');
    if (success) {
      inputModeSwitcher.setValue('controller');
      setLastInputMode('controller');
      // Update legend when switching to controller mode
      if (controlsLegend) {
        controlsLegend.update();
      }
    }
  } else {
    // If controller disconnects, InputManager will auto-switch to keyboard mode
    // Update the UI switcher to reflect this change
    const currentMode = inputManager.getInputMode();
    if (currentMode === 'keyboard') {
      inputModeSwitcher.setValue('keyboard');
      setLastInputMode('keyboard');
      // Update legend when switching to keyboard mode
      if (controlsLegend) {
        controlsLegend.update();
      }
    }
  }
});

// Initialize game mode display
const modeDisplayMount = document.getElementById('game-mode-display') || document.body;
initGameModeDisplay({
  mount: modeDisplayMount,
  gameModeManager: gameModeManager,
  characterManager: characterManager
});

// Helper function to get current game state
function getCurrentGameState() {
  return {
    arena: arenaManager.getCurrentArena(),
    gameMode: gameModeManager.getMode(),
    characterName: characterManager.getCharacterName()
  };
}

// Initialize room manager UI for shooting mode
const roomManager = initRoomManager({
  mount: roomMount,
  multiplayerManager: multiplayerManager,
  onRoomCreated: async (roomCode) => {
    // Pass game state when creating room
    const gameState = getCurrentGameState();
    try {
      const actualRoomCode = await multiplayerManager.createRoom(gameState);
      
      // Update URL with actual room code (in case it differs)
      const url = new URL(window.location);
      url.searchParams.set('room', actualRoomCode);
      window.history.pushState({}, '', url);
      
      // Update UI to show room display (player is now in the room)
      roomManager.update();
      
      // Send our initial position when creating room
      if (characterManager.getPlayer()) {
        setTimeout(() => {
          const player = characterManager.getPlayer();
          const camera = sceneManager.getCamera();
          const cameraDir = new THREE.Vector3();
          camera.getWorldDirection(cameraDir);
          const rotation = Math.atan2(cameraDir.x, cameraDir.z);
          
          multiplayerManager.sendPlayerState({
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            rotation: rotation,
            currentAnimKey: characterManager.currentAnimKey || 'idle_front',
            lastFacing: characterManager.lastFacing || 'front',
            isGrounded: characterManager.characterData.isGrounded || true
          });
        }, 100);
      }
      
      // Start shooting mode if not already
      if (gameModeManager.getMode() !== 'shooting') {
        gameModeManager.setMode('shooting');
        // Save to localStorage when game mode changes
        setLastGameMode('shooting');
      }
      gameModeManager.startMode();
    } catch (error) {
      // Failed to create room
    }
  },
  onRoomJoined: async (roomCode) => {
    // Pass game state when joining room
    const gameState = getCurrentGameState();
    try {
      const joinResult = await multiplayerManager.joinRoom(roomCode, gameState);
      
      // Immediately send our current state so others can see us
      if (characterManager.getPlayer()) {
        setTimeout(() => {
          const player = characterManager.getPlayer();
          const camera = sceneManager.getCamera();
          const cameraDir = new THREE.Vector3();
          camera.getWorldDirection(cameraDir);
          const rotation = Math.atan2(cameraDir.x, cameraDir.z);
          
          multiplayerManager.sendPlayerState({
            x: player.position.x,
            y: player.position.y,
            z: player.position.z,
            rotation: rotation,
            currentAnimKey: characterManager.currentAnimKey || 'idle_front',
            lastFacing: characterManager.lastFacing || 'front',
            isGrounded: characterManager.characterData.isGrounded || true
          });
        }, 100);
      }
      
      // Request existing players' states after joining
      setTimeout(() => {
        multiplayerManager.requestExistingPlayers(() => {
          // Send current player state when requested
          if (characterManager.getPlayer()) {
            const player = characterManager.getPlayer();
            const camera = sceneManager.getCamera();
            const cameraDir = new THREE.Vector3();
            camera.getWorldDirection(cameraDir);
            const rotation = Math.atan2(cameraDir.x, cameraDir.z);
            
            multiplayerManager.sendPlayerState({
              x: player.position.x,
              y: player.position.y,
              z: player.position.z,
              rotation: rotation,
              currentAnimKey: characterManager.currentAnimKey || 'idle_front',
              lastFacing: characterManager.lastFacing || 'front',
              isGrounded: characterManager.characterData.isGrounded || true
            });
          }
        });
      }, 200);
      
      // Start shooting mode if not already
      if (gameModeManager.getMode() !== 'shooting') {
        gameModeManager.setMode('shooting');
        // Save to localStorage when game mode changes
        setLastGameMode('shooting');
      }
      gameModeManager.startMode();
    } catch (error) {
      // Failed to join room
    }
  }
});

// Check URL for room code and auto-join (wait for connection first)
const urlRoom = getParam('room', null);
if (urlRoom) {
  // Wait for connection before auto-joining
  const attemptAutoJoin = async () => {
    try {
      // Wait for connection if not connected
      if (!multiplayerManager.isConnected()) {
        await multiplayerManager.waitForConnection();
      }
      
      const gameState = getCurrentGameState();
      await multiplayerManager.joinRoom(urlRoom.toUpperCase(), gameState);
      roomManager.update();
    } catch (error) {
      // Failed to auto-join room
      // Retry after a delay
      setTimeout(() => {
        attemptAutoJoin();
      }, 1000);
    }
  };
  
  // Start attempt after a short delay to let socket initialize
  setTimeout(attemptAutoJoin, 100);
}

// Initialize bot control UI for shooting mode
const botControl = initBotControl({
  mount: botControlMount,
  botManager: botManager,
  healthBarManager: healthBarManager,
  arenaManager: arenaManager,
  sceneManager: sceneManager
});

// Show/hide bot control based on mode
if (gameMode === 'shooting') {
  if (botControlPanel) botControlPanel.style.display = 'block';
} else {
  if (botControlPanel) botControlPanel.style.display = 'none';
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

// Expose remotePlayerManager to window for debugging
window.debugRemotePlayers = () => {
  if (remotePlayerManager) {
    remotePlayerManager.debugInfo();
  }
};

// Expose inputManager for gamepad debugging/activation
if (typeof inputManager !== 'undefined') {
  window.activateGamepad = () => {
    if (inputManager) {
      return inputManager.forceGamepadActivation();
    }
    return false;
  };
  
  window.toggleGamepadLogging = (enabled) => {
    if (inputManager) {
      inputManager.setLoggingEnabled(enabled !== undefined ? enabled : !inputManager._loggingEnabled);
    }
  };
}

// Start the game
(async () => {
  // Get loading screen element
  const loadingScreen = document.getElementById('loading-screen');
  
  try {
    await characterManager.loadCharacter(characterName);
    
    // Set camera for health bar manager
    if (healthBarManager) {
      healthBarManager.setCamera(sceneManager.getCamera());
    }
    
    // Only create health bar for player if in shooting mode
    const initialMode = gameModeManager ? gameModeManager.getMode() : 'free-play';
    if (initialMode === 'shooting' && healthBarManager && characterManager.getPlayer()) {
      const player = characterManager.getPlayer();
      player.userData.health = characterManager.getHealth();
      player.userData.maxHealth = characterManager.getMaxHealth();
      healthBarManager.createHealthBar(player, true);
      
      // Restore saved bot count when starting in shooting mode
      if (botControl && typeof botControl.restoreSavedBots === 'function') {
        // Delay slightly to ensure everything is initialized
        setTimeout(() => {
          botControl.restoreSavedBots();
        }, 200);
      }
    }
    
    gameLoop.start();
  } finally {
    // Hide loading screen when initialization is complete
    if (loadingScreen) {
      loadingScreen.classList.add('is-hidden');
      // Remove from DOM after transition completes
      setTimeout(() => {
        if (loadingScreen.parentNode) {
          loadingScreen.parentNode.removeChild(loadingScreen);
        }
      }, 300);
    }
  }

  // Position sync interval (sync every ~100ms = ~10 times per second)
  let lastPositionSyncTime = 0;
  let lastAnimationUpdateTime = performance.now();
  const syncInterval = 100; // milliseconds

  // Wrap gameLoop.tick to update cooldown indicator and sync positions
  const originalTick = gameLoop.tick.bind(gameLoop);
  gameLoop.tick = function() {
    const now = performance.now();
    originalTick();
    
    // Update cooldown indicator each frame (only if in shooting mode)
    if (cooldownIndicator && gameModeManager && gameModeManager.getMode() === 'shooting') {
      cooldownIndicator.update();
    }
    
    // Update remote player animations
    if (remotePlayerManager) {
      const dt = (now - lastAnimationUpdateTime) / 1000;
      if (dt > 0) {
        remotePlayerManager.updateAnimations(dt, sceneManager.getCamera());
        lastAnimationUpdateTime = now;
      }
      
      // Cleanup stale players periodically (every 5 seconds)
      if (Math.floor(now / 5000) !== Math.floor((now - 16) / 5000)) {
        remotePlayerManager.cleanupStalePlayers(5000);
      }
    }
    
    // Sync local player position with other players
    if (multiplayerManager && multiplayerManager.isInRoom() && characterManager.getPlayer()) {
      const syncNow = Date.now();
      if (syncNow - lastPositionSyncTime >= syncInterval) {
        const player = characterManager.getPlayer();
        const camera = sceneManager.getCamera();
        
        // Calculate rotation from camera and player facing
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const rotation = Math.atan2(cameraDir.x, cameraDir.z);
        
        // Get current animation state from character manager
        const currentAnimKey = characterManager.currentAnimKey || 'idle_front';
        const lastFacing = characterManager.lastFacing || 'front';
        
        multiplayerManager.sendPlayerState({
          x: player.position.x,
          y: player.position.y,
          z: player.position.z,
          rotation: rotation,
          currentAnimKey: currentAnimKey,
          lastFacing: lastFacing,
          isGrounded: characterManager.characterData.isGrounded || true
        });
        
        lastPositionSyncTime = syncNow;
      }
    }
  };
})();


