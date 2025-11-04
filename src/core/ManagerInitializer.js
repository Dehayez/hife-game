/**
 * ManagerInitializer.js
 * 
 * Handles creation and wiring of all game managers.
 * Separates manager initialization from main.js for better organization.
 */

import { RespawnOverlay } from '../ui/components/RespawnOverlay/index.js';
import { SceneManager } from './systems/scene/SceneManager.js';
import { LargeArenaSceneManager } from './systems/scene/LargeArenaSceneManager.js';
import { CharacterManager } from './systems/character/CharacterManager.js';
import { InputManager } from './systems/input/InputManager.js';
import { CollisionManager } from './systems/collision/CollisionManager.js';
import { LargeArenaCollisionManager } from './systems/collision/LargeArenaCollisionManager.js';
import { GameModeManager } from './systems/gamemode/GameModeManager.js';
import { EntityManager } from './systems/entity/EntityManager.js';
import { ProjectileManager } from './systems/abilities/functions/ProjectileManager.js';
import { MultiplayerManager } from './systems/multiplayer/MultiplayerManager.js';
import { RemotePlayerManager } from './systems/multiplayer/RemotePlayerManager.js';
import { BotManager } from './systems/bot/BotManager.js';
import { HealthBarManager } from './systems/healthbar/HealthBarManager.js';
import { GameLoop } from './systems/gameloop/GameLoop.js';
import { ParticleManager } from '../utils/ParticleManager.js';
import { ArenaManager } from './systems/arena/ArenaManager.js';
import { ScreenShakeManager } from '../utils/ScreenShakeManager.js';
import { DamageNumberManager } from '../utils/DamageNumberManager.js';
import { ScreenFlashManager } from '../utils/ScreenFlashManager.js';
import { Scoreboard } from '../ui/components/Scoreboard/index.js';
import { spawnRemotePlayerWithHealthBar, removeRemotePlayer, sendPlayerState, handleRemotePlayerStateUpdate } from './MultiplayerHelpers.js';

/**
 * Initialize all game managers
 * @param {HTMLCanvasElement} canvas - Game canvas element
 * @param {string} arenaName - Arena name ('standard' or 'large')
 * @param {Object} multiplayerCallbacks - Callbacks for multiplayer events
 * @returns {Object} Object containing all initialized managers
 */
export function initializeManagers(canvas, arenaName, multiplayerCallbacks = {}) {
  // Initialize overlay
  const respawnOverlay = new RespawnOverlay();
  
  // Initialize arena manager
  const arenaManager = new ArenaManager();
  arenaManager.setArena(arenaName);
  
  // Initialize arena-specific managers
  const isLargeArena = arenaManager.isLargeArena();
  let sceneManager, collisionManager;
  
  if (isLargeArena) {
    sceneManager = new LargeArenaSceneManager();
    sceneManager.init(canvas);
    collisionManager = new LargeArenaCollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);
  } else {
    sceneManager = new SceneManager();
    sceneManager.init(canvas);
    collisionManager = new CollisionManager(sceneManager.getScene(), sceneManager.getArenaSize(), respawnOverlay);
  }
  
  // Initialize core managers
  const customFootstepPath = null;
  const characterManager = new CharacterManager(null, customFootstepPath);
  const inputManager = new InputManager();
  
  const entityManager = new EntityManager(sceneManager.getScene(), sceneManager.getArenaSize(), collisionManager);
  const gameModeManager = new GameModeManager(entityManager, arenaName);
  
  // Connect managers
  collisionManager.setGameModeManager(gameModeManager);
  characterManager.initializePlayer(sceneManager.getScene());
  characterManager.setCollisionManager(collisionManager);
  
  // Initialize particle manager
  const particleManager = new ParticleManager(sceneManager.getScene(), collisionManager);
  characterManager.setParticleManager(particleManager);
  
  // Initialize multiplayer-related managers
  const remotePlayerManager = new RemotePlayerManager(sceneManager.getScene(), particleManager);
  const projectileManager = new ProjectileManager(sceneManager.getScene(), collisionManager, particleManager);
  const botManager = new BotManager(sceneManager.getScene(), collisionManager, projectileManager, particleManager);
  
  // Connect bot manager to projectile manager
  projectileManager.setBotManager(botManager);
  
  // Initialize health bar manager
  const healthBarManager = new HealthBarManager(sceneManager.getScene(), null);
  
  // Initialize visual effects managers
  const screenShakeManager = new ScreenShakeManager();
  const damageNumberManager = new DamageNumberManager(sceneManager.getScene(), sceneManager.getCamera());
  const screenFlashManager = new ScreenFlashManager();
  screenFlashManager.init();
  
  // Initialize multiplayer manager with callbacks
  // Note: Callbacks are created inline to capture managers in closure
  // The multiplayerManager instance will be available after construction
  let multiplayerManager;
  
  const onPlayerJoined = multiplayerCallbacks.onPlayerJoined || ((playerId, playerInfo) => {
    // Access multiplayerManager from closure
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      const initialPosition = { x: 0, y: 0, z: 0 };
      spawnRemotePlayerWithHealthBar(
        remotePlayerManager,
        healthBarManager,
        multiplayerManager,
        playerId,
        playerInfo,
        initialPosition
      ).then(() => {
        if (characterManager.getPlayer()) {
          setTimeout(() => {
            sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
          }, 50);
        }
      }).catch(error => {
        console.error('Error spawning remote player:', error);
      });
    }
  });
  
  const onPlayerLeft = multiplayerCallbacks.onPlayerLeft || ((playerId) => {
    // Access multiplayerManager from closure
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      removeRemotePlayer(remotePlayerManager, healthBarManager, playerId);
    }
  });
  
  const onDataReceived = multiplayerCallbacks.onGameData || ((playerId, data) => {
    // Access multiplayerManager from closure
    if (data.type === 'player-state') {
      handleRemotePlayerStateUpdate(remotePlayerManager, healthBarManager, multiplayerManager, playerId, data);
    } else if (data.type === 'projectile-create') {
      if (playerId !== multiplayerManager.getLocalPlayerId() && projectileManager) {
        const characterName = data.characterName || 'lucy';
        
        if (data.projectileType === 'mortar') {
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
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        if (remotePlayer && remotePlayer.mesh && healthBarManager) {
          remotePlayer.mesh.userData.health = data.health;
          remotePlayer.mesh.userData.maxHealth = data.maxHealth;
        }
      }
    } else if (data.type === 'character-change') {
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        if (remotePlayer) {
          remotePlayerManager.updateRemotePlayerCharacter(playerId, data.characterName).catch(error => {
            console.error('Error updating remote player character:', error);
          });
          
          const playerInfo = multiplayerManager.getPlayerInfo(playerId);
          if (playerInfo) {
            playerInfo.characterName = data.characterName;
          }
        }
      }
    }
  });
  
  // Create multiplayer manager (will be assigned to variable above)
  multiplayerManager = new MultiplayerManager(onPlayerJoined, onPlayerLeft, onDataReceived);
  
  // Set respawn callback for mode changes
  gameModeManager.setOnModeChangeCallback(() => {
    characterManager.respawn();
    collisionManager.updateWallsForMode();
    const currentMode = gameModeManager.getMode();
    sceneManager.setMushroomsVisible(currentMode === 'free-play');
    
    if (projectileManager) {
      projectileManager.clearAll();
    }
    
    if (currentMode !== 'shooting' && botManager) {
      botManager.clearAll();
      if (healthBarManager) {
        healthBarManager.clearAll();
      }
    }
  });
  
  // Initialize game loop
  const gameLoop = new GameLoop(
    sceneManager,
    characterManager,
    inputManager,
    collisionManager,
    gameModeManager,
    entityManager,
    projectileManager,
    botManager,
    healthBarManager,
    multiplayerManager,
    remotePlayerManager
  );
  
  // Connect visual effects managers to game loop
  gameLoop.setScreenShakeManager(screenShakeManager);
  gameLoop.setDamageNumberManager(damageNumberManager);
  gameLoop.setScreenFlashManager(screenFlashManager);
  gameLoop.setSceneManagerForShake(sceneManager);
  
  // Connect screen shake manager to scene manager
  sceneManager.setScreenShakeManager(screenShakeManager);
  
  // Update damage number manager camera
  if (sceneManager.getCamera()) {
    damageNumberManager.setCamera(sceneManager.getCamera());
  }
  
  // Initialize scoreboard
  const scoreboard = new Scoreboard({
    multiplayerManager: multiplayerManager,
    gameModeManager: gameModeManager,
    botManager: botManager,
    characterManager: characterManager,
    inputManager: inputManager,
    onScoreboardOpen: () => {
      if (inputManager) {
        inputManager.setInputBlocked(true);
      }
    },
    onScoreboardClose: () => {
      if (inputManager) {
        inputManager.setInputBlocked(false);
      }
    }
  });
  
  return {
    respawnOverlay,
    arenaManager,
    sceneManager,
    collisionManager,
    characterManager,
    inputManager,
    entityManager,
    gameModeManager,
    particleManager,
    remotePlayerManager,
    projectileManager,
    botManager,
    healthBarManager,
    screenShakeManager,
    damageNumberManager,
    screenFlashManager,
    multiplayerManager,
    gameLoop,
    scoreboard
  };
}


