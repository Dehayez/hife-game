// Minimal dependencies via CDN ESM
import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { GameMenu } from './ui/components/GameMenu/index.js';
import { initCharacterSwitcher } from './ui/adapters/reactAdapters.jsx';
import { initControlsLegend } from './ui/adapters/reactAdapters.jsx';
import { initGameModeSwitcher } from './ui/adapters/reactAdapters.jsx';
import { initGameModeDisplay } from './ui/components/GameModeDisplay/index.js';
import { initArenaSwitcher } from './ui/components/ArenaSwitcher/index.js';
import { initRoomManager } from './ui/components/RoomManager/index.js';
import { initBotControl } from './ui/components/BotControl/index.js';
import { initCooldownIndicator } from './ui/components/CooldownIndicator/index.js';
import { initConnectionStatus } from './ui/components/ConnectionStatus/index.js';
import { initInputModeSwitcher } from './ui/adapters/reactAdapters.jsx';
import { RespawnOverlay } from './ui/components/RespawnOverlay/index.js';
import { Scoreboard } from './ui/components/Scoreboard/index.js';
import { getParam } from './utils/UrlUtils.js';
import { getLastCharacter, setLastCharacter, getLastGameMode, setLastGameMode, getLastInputMode, setLastInputMode } from './utils/StorageUtils.js';
import { spawnRemotePlayerWithHealthBar, removeRemotePlayer, sendPlayerState, handleRemotePlayerStateUpdate } from './core/init/MultiplayerHelpers.js';
import { SceneManager } from './core/systems/scene/functions/SceneManager.js';
import { LargeArenaSceneManager } from './core/systems/scene/functions/LargeArenaSceneManager.js';
import { CharacterManager } from './core/systems/character/functions/CharacterManager.js';
import { InputManager } from './core/systems/input/functions/InputManager.js';
import { CollisionManager } from './core/systems/collision/functions/CollisionManager.js';
import { LargeArenaCollisionManager } from './core/systems/collision/functions/LargeArenaCollisionManager.js';
import { GameModeManager } from './core/systems/gamemode/functions/GameModeManager.js';
import { EntityManager } from './core/systems/entity/functions/EntityManager.js';
import { ProjectileManager } from './core/systems/abilities/functions/ProjectileManager.js';
import { MultiplayerManager } from './core/managers/multiplayer/MultiplayerManager.js';
import { RemotePlayerManager } from './core/managers/multiplayer/RemotePlayerManager.js';
import { BotManager } from './core/systems/bot/functions/BotManager.js';
import { HealthBarManager } from './core/systems/healthbar/functions/HealthBarManager.js';
import { GameLoop } from './core/managers/gameloop/GameLoop.js';
import { ParticleManager } from './utils/ParticleManager.js';
import { ArenaManager } from './core/systems/arena/functions/ArenaManager.js';
import { getCharacterHealthStats } from './core/systems/character/config/CharacterStats.js';
import { ScreenShakeManager } from './utils/ScreenShakeManager.js';
import { DamageNumberManager } from './utils/DamageNumberManager.js';
import { SprintTrailManager } from './utils/SprintTrailManager.js';
import { ScreenFlashManager } from './utils/ScreenFlashManager.js';

// Initialize game components
const canvas = document.getElementById('app-canvas');
const respawnOverlay = new RespawnOverlay();
const arenaManager = new ArenaManager();

// Initialize scoreboard (will be configured with managers later)
let scoreboard = null;

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
const remotePlayerManager = new RemotePlayerManager(sceneManager.getScene(), particleManager);

// Initialize projectile manager for shooting mode
const projectileManager = new ProjectileManager(sceneManager.getScene(), collisionManager, particleManager);

// Initialize bot manager for shooting mode
const botManager = new BotManager(sceneManager.getScene(), collisionManager, projectileManager, particleManager);

// Connect bot manager to projectile manager so bot projectiles follow bot height
projectileManager.setBotManager(botManager);

// Initialize health bar manager (camera will be set later)
const healthBarManager = new HealthBarManager(sceneManager.getScene(), null);

// Initialize visual effects managers
const screenShakeManager = new ScreenShakeManager();
const damageNumberManager = new DamageNumberManager(sceneManager.getScene(), sceneManager.getCamera());
const sprintTrailManager = new SprintTrailManager(sceneManager.getScene());
const screenFlashManager = new ScreenFlashManager();
screenFlashManager.init();

// Initialize multiplayer manager
const multiplayerManager = new MultiplayerManager(
  async (playerId, playerInfo) => {
    // Spawn remote player when someone joins
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      // Spawn at origin first, position will be updated when we receive their state
      const initialPosition = { x: 0, y: 0, z: 0 };
      
      try {
        await spawnRemotePlayerWithHealthBar(
          remotePlayerManager,
          healthBarManager,
          multiplayerManager,
          playerId,
          playerInfo,
          initialPosition
        );
        
        // When someone joins, send our current state so they can see us
        if (characterManager.getPlayer()) {
          setTimeout(() => {
            sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
          }, 50);
        }
      } catch (error) {
        console.error('Error spawning remote player:', error);
      }
    }
  },
  (playerId) => {
    // Remove remote player when someone leaves
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      removeRemotePlayer(remotePlayerManager, healthBarManager, playerId);
    }
  },
  (playerId, data) => {
    // Handle multiplayer game data sync
    if (data.type === 'player-state') {
      // Use helper function to handle remote player state update
      handleRemotePlayerStateUpdate(remotePlayerManager, healthBarManager, multiplayerManager, playerId, data);
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
          // Create bolt projectile
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
            console.error('Error updating remote player character:', error);
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

// Connect visual effects managers to game loop
gameLoop.setScreenShakeManager(screenShakeManager);
gameLoop.setDamageNumberManager(damageNumberManager);
gameLoop.setSprintTrailManager(sprintTrailManager);
gameLoop.setScreenFlashManager(screenFlashManager);
gameLoop.setSceneManagerForShake(sceneManager);

// Connect screen shake manager to scene manager for camera shake
sceneManager.setScreenShakeManager(screenShakeManager);

// Update damage number manager camera when scene camera is set
if (sceneManager.getCamera()) {
  damageNumberManager.setCamera(sceneManager.getCamera());
}

// Initialize scoreboard with managers
scoreboard = new Scoreboard({
  multiplayerManager: multiplayerManager,
  gameModeManager: gameModeManager,
  botManager: botManager,
  characterManager: characterManager,
  inputManager: inputManager,
  onScoreboardOpen: () => {
    // Block game inputs when scoreboard is open
    if (inputManager) {
      inputManager.setInputBlocked(true);
    }
  },
  onScoreboardClose: () => {
    // Re-enable game inputs when scoreboard is closed
    if (inputManager) {
      inputManager.setInputBlocked(false);
    }
  }
});

// Character selection: URL param > localStorage > default
// Priority: 1) URL param ?char=lucy, 2) Last played character (localStorage), 3) Default 'lucy'
const urlCharacter = getParam('char', null);
const storedCharacter = getLastCharacter();
const characterName = urlCharacter || storedCharacter || 'lucy';

// If character came from URL param, save it to localStorage
if (urlCharacter) {
  setLastCharacter(urlCharacter);
}

// Initialize all UI components first, then organize into menu
const AVAILABLE_CHARACTERS = ['lucy', 'herald'];

// Helper function to get current game state (needed for character switcher callback)
function getCurrentGameState() {
  return {
    arena: arenaManager.getCurrentArena(),
    gameMode: gameModeManager.getMode(),
    characterName: characterManager.getCharacterName()
  };
}

// Initialize character switcher UI
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

// Get mount points
const arenaMount = document.getElementById('arena-switcher') || document.body;
const roomMount = document.getElementById('room-manager') || document.body;
const botControlMount = document.getElementById('bot-control') || document.body;
const cooldownMount = document.getElementById('cooldown-indicator') || document.body;
const connectionStatusMount = document.getElementById('connection-status') || document.body;
const legendMount = document.getElementById('controls-legend') || document.body;
const inputModeMount = document.getElementById('input-mode-switcher') || document.body;
const modeDisplayMount = document.getElementById('game-mode-display') || document.body;

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

// Initialize Game Menu (must be done early to set up structure)
const gameMenuRoot = document.getElementById('game-menu-root');
let isMenuOpen = false;
const gameMenu = new GameMenu({
  inputManager: inputManager,
  onVisibilityChange: (isVisible) => {
    isMenuOpen = isVisible;
    // Block/unblock gamepad inputs
    if (inputManager) {
      inputManager.setInputBlocked(isVisible);
    }
  },
  onMenuOpen: () => {
    isMenuOpen = true;
    // Block gamepad inputs from reaching the game
    if (inputManager) {
      inputManager.setInputBlocked(true);
    }
  },
  onMenuClose: () => {
    isMenuOpen = false;
    // Re-enable gamepad inputs
    if (inputManager) {
      inputManager.setInputBlocked(false);
    }
  }
});

// Set up menu toggle button
const menuToggleButton = document.getElementById('menu-toggle');
if (menuToggleButton) {
  menuToggleButton.addEventListener('click', () => {
    gameMenu.toggle();
  });
}

// Initialize controls legend wrapper (toggleable) - not shown by default
const controlsLegendWrapper = document.getElementById('controls-legend-wrapper');
let isControlsLegendVisible = false; // Default to hidden

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
    
    // Show/hide cooldown indicator and shooting mode elements based on mode
    if (mode === 'shooting') {
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
      
      // Update menu to show multiplayer section when entering shooting mode
      updateMenuForMode(mode);
    } else {
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
      
      // Update menu to hide multiplayer section when leaving shooting mode
      updateMenuForMode(mode);
    }
  },
  gameModeManager: gameModeManager
});

// Show/hide cooldown indicator based on initial mode
if (gameMode === 'shooting') {
  if (cooldownIndicator) {
    cooldownIndicator.show();
  }
} else {
  if (cooldownIndicator) {
    cooldownIndicator.hide();
  }
}

// Initialize controls legend (will be moved to menu)
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
initGameModeDisplay({
  mount: modeDisplayMount,
  gameModeManager: gameModeManager,
  characterManager: characterManager
});

// Initialize arena switcher UI
initArenaSwitcher({
  mount: arenaMount,
  options: arenaManager.getArenas(),
  value: urlArena,
  onChange: (arena) => {
    // Reload page with new arena to reinitialize everything
    window.location.href = updateURLParam('arena', arena);
  }
});

// Function to update menu sections based on game mode
function updateMenuForMode(mode) {
  const multiplayerPanel = gameMenu.getPanel('multiplayer');
  const botSection = gameMenu.getSection('multiplayer', 'game-menu__section--bot-control');
  
  if (mode === 'shooting') {
    // Show bot control section if it exists
    if (botSection) {
      botSection.style.display = 'block';
    }
  } else {
    // Hide bot control section if it exists
    if (botSection) {
      botSection.style.display = 'none';
    }
  }
}

// Build menu structure with all UI components
// Settings Tab
const settingsPanel = gameMenu.getPanel('settings');

// Game Mode Display Section
const modeDisplaySection = gameMenu.addSection('settings', {
  title: 'Current Game Mode',
  className: 'game-menu__section--mode-display'
});
if (modeDisplaySection) {
  const modeDisplayContent = modeDisplaySection.querySelector('.game-menu__section-content');
  if (modeDisplayContent && modeDisplayMount) {
    // Use the section content as the mount point instead of moving nodes
    modeDisplayContent.appendChild(modeDisplayMount);
    modeDisplayMount.style.display = 'block';
  }
}

// Game Mode Section
const gameModeSection = gameMenu.addSection('settings', {
  title: 'Game Mode',
  className: 'game-menu__section--game-mode'
});
if (gameModeSection) {
  const gameModeContent = gameModeSection.querySelector('.game-menu__section-content');
  if (gameModeContent && gameModeMount) {
    // Use the section content as the mount point instead of moving nodes
    gameModeContent.appendChild(gameModeMount);
    gameModeMount.style.display = 'block';
  }
}

// Arena Selection Section
const arenaSection = gameMenu.addSection('settings', {
  title: 'Arena',
  className: 'game-menu__section--arena'
});
if (arenaSection) {
  const arenaContent = arenaSection.querySelector('.game-menu__section-content');
  if (arenaContent && arenaMount) {
    // Use the section content as the mount point instead of moving nodes
    arenaContent.appendChild(arenaMount);
    arenaMount.style.display = 'block';
  }
}

// Controls Legend Section (in Settings tab)
const legendSection = gameMenu.addSection('settings', {
  title: 'Controls',
  className: 'game-menu__section--controls-legend'
});
if (legendSection) {
  const legendContent = legendSection.querySelector('.game-menu__section-content');
  if (legendContent && legendMount) {
    // Use the section content as the mount point instead of moving nodes
    legendContent.appendChild(legendMount);
    legendMount.style.display = 'block';

    // Controls legend is only in the menu, not shown in-game
  }
}

// Input Mode Section
const inputModeSection = gameMenu.addSection('settings', {
  title: 'Input Mode',
  className: 'game-menu__section--input-mode'
});
if (inputModeSection) {
  const inputModeContent = inputModeSection.querySelector('.game-menu__section-content');
  if (inputModeContent && inputModeMount) {
    // Use the section content as the mount point instead of moving nodes
    inputModeContent.appendChild(inputModeMount);
    inputModeMount.style.display = 'block';
  }
}

// Multiplayer Tab - sections will be populated after room manager and bot control are initialized

// Initialize room manager UI for shooting mode (before bot control)
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
          sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
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
      console.error('Failed to create room:', error);
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
          sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
        }, 100);
      }
      
      // Request existing players' states after joining
      setTimeout(() => {
        multiplayerManager.requestExistingPlayers(() => {
          // Send current player state when requested
          if (characterManager.getPlayer()) {
            sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
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
      console.error('Failed to join room:', error);
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
      console.error('Failed to auto-join room:', error);
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

// Now populate multiplayer tab sections with initialized components
// Room Manager Section
const roomSection = gameMenu.addSection('multiplayer', {
  title: 'Multiplayer Room',
  className: 'game-menu__section--room-manager'
});
if (roomSection && roomMount.firstChild) {
  const roomContent = roomSection.querySelector('.game-menu__section-content');
  if (roomContent) {
    while (roomMount.firstChild) {
      roomContent.appendChild(roomMount.firstChild);
    }
  }
}

// Bot Control Section (only visible in shooting mode)
const botSection = gameMenu.addSection('multiplayer', {
  title: 'Bot Control',
  className: 'game-menu__section--bot-control'
});
if (botSection && botControlMount.firstChild) {
  const botContent = botSection.querySelector('.game-menu__section-content');
  if (botContent) {
    while (botControlMount.firstChild) {
      botContent.appendChild(botControlMount.firstChild);
    }
  }
  // Hide by default if not in shooting mode
  if (gameMode !== 'shooting') {
    botSection.style.display = 'none';
  }
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
  let lastStartButtonState = false;
  let lastScoreboardButtonState = false;

  gameLoop.tick = function() {
    const now = performance.now();
    originalTick();

    // Handle Xbox Start button (button 9) to toggle menu
    // Works regardless of menu state (can open or close)
    const gamepads = navigator.getGamepads();
    if (gamepads && gamepads.length > 0) {
      const gamepad = gamepads[0];
      if (gamepad) {
        const startButtonPressed = gamepad.buttons[9]?.pressed || false;
        if (startButtonPressed && !lastStartButtonState) {
          // Start button just pressed - toggle menu
          gameMenu.toggle();
        }
        lastStartButtonState = startButtonPressed;
      }
    }

    // Handle scoreboard toggle (Tab key or Back/Select button)
    // Hold to show, release to hide (like CS:GO)
    if (!isMenuOpen && scoreboard) {
      const isScoreboardButtonPressed = inputManager.isScoreboardPressed();

      // Open scoreboard when button is pressed
      if (isScoreboardButtonPressed && !scoreboard.isOpen()) {
        scoreboard.show();
      }
      // Close scoreboard when button is released
      else if (!isScoreboardButtonPressed && scoreboard.isOpen()) {
        scoreboard.hide();
      }

      // Update scoreboard data every frame if it's open
      if (scoreboard.isOpen()) {
        scoreboard.refreshData();
      }

      lastScoreboardButtonState = isScoreboardButtonPressed;
    }
    
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
        sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
        lastPositionSyncTime = syncNow;
      }
    }
  };
})();


