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
import { BotLearningManager } from './systems/bot/BotLearningManager.js';
import { HealthBarManager } from './systems/healthbar/HealthBarManager.js';
import { GameLoop } from './systems/gameloop/GameLoop.js';
import { ParticleManager } from '../utils/ParticleManager.js';
import { ArenaManager } from './systems/arena/ArenaManager.js';
import { ScreenShakeManager } from '../utils/ScreenShakeManager.js';
import { DamageNumberManager } from '../utils/DamageNumberManager.js';
import { ScreenFlashManager } from '../utils/ScreenFlashManager.js';
import { KillStreakManager } from '../utils/KillStreakManager.js';
import { Scoreboard } from '../ui/components/Scoreboard/index.js';
import { spawnRemotePlayerWithHealthBar, removeRemotePlayer, sendPlayerState, handleRemotePlayerStateUpdate } from './MultiplayerHelpers.js';
import { getLastBotDifficulty } from '../utils/StorageUtils.js';

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
  
  // Initialize bot learning manager
  const savedDifficulty = getLastBotDifficulty();
  const learningManager = new BotLearningManager(savedDifficulty);
  
  // Initialize bot manager with learning manager
  const botManager = new BotManager(sceneManager.getScene(), collisionManager, projectileManager, particleManager, learningManager);
  
  // Connect bot manager to projectile manager
  projectileManager.setBotManager(botManager);
  
  // Set character manager and player for bot abilities
  botManager.setCharacterManager(characterManager);
  botManager.setPlayer(characterManager.getPlayer());
  
  // Connect sound manager to projectile manager (for mortar explosion sounds)
  const soundManager = characterManager.getSoundManager();
  if (soundManager) {
    projectileManager.setSoundManager(soundManager);
  }
  
  // Connect learning manager to bot manager
  botManager.setLearningManager(learningManager);
  
  // Initialize health bar manager
  const healthBarManager = new HealthBarManager(sceneManager.getScene(), null);
  
  // Initialize visual effects managers
  const screenShakeManager = new ScreenShakeManager();
  const damageNumberManager = new DamageNumberManager(sceneManager.getScene(), sceneManager.getCamera());
  const screenFlashManager = new ScreenFlashManager();
  screenFlashManager.init();
  const killStreakManager = new KillStreakManager();
  
  // Initialize multiplayer manager with callbacks
  // Note: Callbacks are created inline to capture managers in closure
  // The multiplayerManager instance will be available after construction
  let multiplayerManager;
  
  const onPlayerJoined = multiplayerCallbacks.onPlayerJoined || ((playerId, playerInfo) => {
    // Access multiplayerManager from closure
    if (playerId !== multiplayerManager.getLocalPlayerId()) {
      // Check if player already exists before spawning (prevent duplicates)
      const existingPlayer = remotePlayerManager.getRemotePlayer(playerId);
      if (existingPlayer && existingPlayer.mesh) {
        // Player already exists, skip spawn
        console.log(`Player ${playerId} already exists, skipping spawn`);
        return;
      }
      
      // Use initial position (0,0,0) - will be updated when first player-state is received
      const initialPosition = { x: 0, y: 0, z: 0 };
      
      // Spawn player with proper initialization
      // Note: spawnRemotePlayerWithHealthBar has duplicate prevention built-in
      spawnRemotePlayerWithHealthBar(
        remotePlayerManager,
        healthBarManager,
        multiplayerManager,
        playerId,
        playerInfo,
        initialPosition
      ).then((spawnedPlayer) => {
        if (spawnedPlayer && spawnedPlayer.mesh) {
          // Send local player state so others can see us
          if (characterManager.getPlayer()) {
            setTimeout(() => {
              sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager, 0);
            }, 100);
          }
        }
      }).catch(error => {
        console.error(`Error spawning remote player ${playerId}:`, error);
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
          const projectile = projectileManager.createProjectile(
            data.startX,
            data.startY,
            data.startZ,
            data.directionX,
            data.directionZ,
            playerId,
            characterName,
            data.targetX || null,
            data.targetZ || null,
            { forceCreate: true }
          );
          
          // Set projectile ID from network data if provided
          if (projectile && data.projectileId) {
            projectile.userData.projectileId = data.projectileId;
            // Re-register with correct ID
            if (projectileManager.projectilesById) {
              projectileManager.projectilesById.set(data.projectileId, projectile);
            }
          }
        }
      }
    } else if (data.type === 'projectile-update') {
      if (playerId !== multiplayerManager.getLocalPlayerId() && projectileManager) {
        // Update remote projectile position from owner's position
        projectileManager.updateRemoteProjectilePosition(
          data.projectileId,
          data.x,
          data.y,
          data.z,
          data.velocityX,
          data.velocityZ
        );
      }
    } else if (data.type === 'player-damage') {
      if (playerId !== multiplayerManager.getLocalPlayerId()) {
        const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
        if (remotePlayer && remotePlayer.mesh && healthBarManager) {
          // Update health immediately - don't let anything override this
          const previousHealth = remotePlayer.mesh.userData.health || 0;
          remotePlayer.mesh.userData.health = data.health;
          remotePlayer.mesh.userData.maxHealth = data.maxHealth;
          
          // Immediately update healthbar instead of waiting for next frame
          const healthBars = healthBarManager.getHealthBars();
          const healthBarContainer = healthBars.get(remotePlayer.mesh);
          if (healthBarContainer) {
            healthBarManager.updateHealthBar(healthBarContainer, data.health, data.maxHealth);
          }
          
          // If player died (health went from >0 to 0), trigger death state
          if (previousHealth > 0 && data.health <= 0) {
            // Mark player as dead in userData
            remotePlayer.mesh.userData.isDead = true;
          } else if (data.health > 0) {
            // Player is alive, clear death flag
            remotePlayer.mesh.userData.isDead = false;
          }
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
  
  // Connect multiplayer manager to projectile manager for position syncing
  projectileManager.setMultiplayerManager(multiplayerManager);
  
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
    remotePlayerManager,
    learningManager
  );
  
  // Connect visual effects managers to game loop
  gameLoop.setScreenShakeManager(screenShakeManager);
  gameLoop.setDamageNumberManager(damageNumberManager);
  gameLoop.setScreenFlashManager(screenFlashManager);
  gameLoop.setKillStreakManager(killStreakManager);
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
    learningManager,
    healthBarManager,
    screenShakeManager,
    damageNumberManager,
    screenFlashManager,
    killStreakManager,
    multiplayerManager,
    gameLoop,
    scoreboard
  };
}


