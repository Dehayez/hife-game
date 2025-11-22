/**
 * MultiplayerHelpers.js
 * 
 * Helper functions for multiplayer state synchronization.
 * Extracts repetitive multiplayer logic from main.js.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { GAME_CONSTANTS } from '../config/global/GameConstants.js';

/**
 * Get current player state for synchronization
 * @param {Object} characterManager - Character manager instance
 * @param {Object} sceneManager - Scene manager instance
 * @param {Object} inputManager - Input manager instance (optional, for isRunning)
 * @returns {Object} Player state object
 */
export function getPlayerState(characterManager, sceneManager, inputManager = null) {
  const player = characterManager.getPlayer();
  if (!player) return null;
  
  const camera = sceneManager.getCamera();
  const cameraDir = new THREE.Vector3();
  camera.getWorldDirection(cameraDir);
  const rotation = Math.atan2(cameraDir.x, cameraDir.z);
  
  // Get isRunning from inputManager if available
  const isRunning = inputManager ? inputManager.isRunning() : false;
  
  return {
    x: player.position.x,
    y: player.position.y,
    z: player.position.z,
    rotation: rotation,
    currentAnimKey: characterManager.currentAnimKey || 'idle_front',
    lastFacing: characterManager.lastFacing || 'front',
    isGrounded: characterManager.characterData?.isGrounded ?? true,
    isRunning: isRunning
  };
}

/**
 * Send current player state to multiplayer manager
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {Object} characterManager - Character manager instance
 * @param {Object} sceneManager - Scene manager instance
 * @param {Object} inputManager - Input manager instance (optional)
 * @param {number} delay - Optional delay in milliseconds
 */
export function sendPlayerState(multiplayerManager, characterManager, sceneManager, inputManager = null, delay = 0) {
  if (!multiplayerManager || !multiplayerManager.isInRoom() || !multiplayerManager.isConnected()) {
    return;
  }
  
  const sendState = () => {
    const state = getPlayerState(characterManager, sceneManager, inputManager);
    if (state) {
      multiplayerManager.sendPlayerState(state);
    }
  };
  
  if (delay > 0) {
    setTimeout(sendState, delay);
  } else {
    sendState();
  }
}

/**
 * Create health bar for remote player
 * @param {Object} healthBarManager - Health bar manager instance
 * @param {Object} remotePlayer - Remote player object
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {string} playerId - Player ID
 */
export function createRemotePlayerHealthBar(healthBarManager, remotePlayer, multiplayerManager, playerId) {
  if (!healthBarManager || !remotePlayer || !remotePlayer.mesh) return;
  
  const mesh = remotePlayer.mesh;
  const playerInfo = multiplayerManager.getPlayerInfo(playerId);
  const characterName = playerInfo?.characterName || 'lucy';
  
  // Note: createHealthBar now checks for duplicates internally, so this is safe to call multiple times
  
  // Import here to avoid circular dependencies
  import('../config/character/CharacterStats.js').then(({ getCharacterHealthStats }) => {
    const healthStats = getCharacterHealthStats();
    mesh.userData.health = mesh.userData.health || healthStats.defaultHealth;
    mesh.userData.maxHealth = mesh.userData.maxHealth || healthStats.maxHealth;
    healthBarManager.createHealthBar(mesh, false);
  }).catch(() => {
    // Fallback if import fails
    mesh.userData.health = mesh.userData.health || 100;
    mesh.userData.maxHealth = mesh.userData.maxHealth || 100;
    healthBarManager.createHealthBar(mesh, false);
  });
}

/**
 * Handle remote player spawn with health bar creation
 * @param {Object} remotePlayerManager - Remote player manager instance
 * @param {Object} healthBarManager - Health bar manager instance
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {string} playerId - Player ID
 * @param {Object} playerInfo - Player info object
 * @param {Object} initialPosition - Initial position object
 * @returns {Promise} Promise that resolves when player is spawned and healthbar is created
 */
export async function spawnRemotePlayerWithHealthBar(
  remotePlayerManager,
  healthBarManager,
  multiplayerManager,
  playerId,
  playerInfo,
  initialPosition
) {
  try {
    const characterName = playerInfo?.characterName || 'lucy';
    
    // Spawn remote player (this waits for textures to be fully loaded and sets them)
    const remotePlayer = await remotePlayerManager.spawnRemotePlayer(
      playerId,
      characterName,
      initialPosition
    );
    
    if (!remotePlayer || !remotePlayer.mesh) {
      console.error(`Failed to spawn remote player ${playerId}: mesh not created`);
      return null;
    }
    
    // Ensure mesh is visible (should already be set in spawnRemotePlayer)
    const mesh = remotePlayer.mesh;
    mesh.visible = true;
    
    // Verify texture is set and ready
    if (!mesh.material || !mesh.material.map) {
      console.warn(`Remote player ${playerId} has no texture set`);
    }
    
    // Create health bar after player is spawned
    createRemotePlayerHealthBar(healthBarManager, remotePlayer, multiplayerManager, playerId);
    
    return remotePlayer;
  } catch (error) {
    console.error(`Error spawning remote player ${playerId}:`, error);
    return null;
  }
}

/**
 * Remove remote player and its health bar
 * @param {Object} remotePlayerManager - Remote player manager instance
 * @param {Object} healthBarManager - Health bar manager instance
 * @param {string} playerId - Player ID
 */
export function removeRemotePlayer(remotePlayerManager, healthBarManager, playerId) {
  const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
  if (remotePlayer && remotePlayer.mesh && healthBarManager) {
    healthBarManager.removeHealthBar(remotePlayer.mesh);
  }
  remotePlayerManager.removeRemotePlayer(playerId);
}

/**
 * Handle remote player state update
 * @param {Object} remotePlayerManager - Remote player manager instance
 * @param {Object} healthBarManager - Health bar manager instance
 * @param {Object} multiplayerManager - Multiplayer manager instance
 * @param {string} playerId - Player ID
 * @param {Object} data - State data
 */
export function handleRemotePlayerStateUpdate(remotePlayerManager, healthBarManager, multiplayerManager, playerId, data) {
  if (playerId === multiplayerManager.getLocalPlayerId()) {
    return; // Don't update local player
  }
  
  const remotePlayer = remotePlayerManager.getRemotePlayer(playerId);
  
  // If remote player doesn't exist yet, spawn them
  // Note: spawnRemotePlayer has duplicate prevention, so this is safe
  if (!remotePlayer) {
    console.log(`[handleRemotePlayerStateUpdate] Remote player ${playerId} doesn't exist, spawning from state update. Position:`, { x: data.x, y: data.y, z: data.z });
    
    const playerInfo = multiplayerManager.getPlayerInfo(playerId);
    const initialPosition = { x: data.x || 0, y: data.y || 0, z: data.z || 0 };
    
    // Spawn player with proper initialization
    spawnRemotePlayerWithHealthBar(
      remotePlayerManager,
      healthBarManager,
      multiplayerManager,
      playerId,
      playerInfo,
      initialPosition
    ).then((spawnedPlayer) => {
      if (spawnedPlayer && spawnedPlayer.mesh) {
        console.log(`[handleRemotePlayerStateUpdate] Successfully spawned remote player ${playerId} from state update. Mesh visible: ${spawnedPlayer.mesh.visible}`);
        
        // Update position and state after spawning
        remotePlayerManager.updateRemotePlayer(playerId, {
          x: data.x,
          y: data.y,
          z: data.z,
          rotation: data.rotation,
          currentAnimKey: data.currentAnimKey,
          lastFacing: data.lastFacing,
          isGrounded: data.isGrounded,
          isRunning: data.isRunning
        });
      } else {
        console.error(`[handleRemotePlayerStateUpdate] Failed to spawn remote player ${playerId} from state update`);
      }
    }).catch(error => {
      console.error(`[handleRemotePlayerStateUpdate] Error spawning remote player ${playerId}:`, error);
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
      isGrounded: data.isGrounded,
      isRunning: data.isRunning
    });
  }
}

