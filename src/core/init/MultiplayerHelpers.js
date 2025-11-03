/**
 * MultiplayerHelpers.js
 * 
 * Helper functions for multiplayer state synchronization.
 * Extracts repetitive multiplayer logic from main.js.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { GAME_CONSTANTS } from '../constants/GameConstants.js';

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
  
  // Import here to avoid circular dependencies
  import('../character/CharacterStats.js').then(({ getCharacterHealthStats }) => {
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
 * @returns {Promise} Promise that resolves when player is spawned
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
    const remotePlayer = await remotePlayerManager.spawnRemotePlayer(
      playerId,
      characterName,
      initialPosition
    );
    
    createRemotePlayerHealthBar(healthBarManager, remotePlayer, multiplayerManager, playerId);
    
    return remotePlayer;
  } catch (error) {
    console.error('Error spawning remote player:', error);
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
  if (!remotePlayer) {
    const playerInfo = multiplayerManager.getPlayerInfo(playerId);
    remotePlayerManager.spawnRemotePlayer(
      playerId,
      playerInfo?.characterName || 'lucy',
      { x: data.x || 0, y: data.y || 0, z: data.z || 0 }
    ).then(() => {
      // Create health bar for remote player
      const spawnedPlayer = remotePlayerManager.getRemotePlayer(playerId);
      if (healthBarManager && spawnedPlayer && spawnedPlayer.mesh) {
        const mesh = spawnedPlayer.mesh;
        const playerInfo = multiplayerManager.getPlayerInfo(playerId);
        const characterName = playerInfo?.characterName || 'lucy';
        import('../character/CharacterStats.js').then(({ getCharacterHealthStats }) => {
          const healthStats = getCharacterHealthStats();
          mesh.userData.health = mesh.userData.health || healthStats.defaultHealth;
          mesh.userData.maxHealth = mesh.userData.maxHealth || healthStats.maxHealth;
          healthBarManager.createHealthBar(mesh, false);
        }).catch(() => {
          mesh.userData.health = mesh.userData.health || 100;
          mesh.userData.maxHealth = mesh.userData.maxHealth || 100;
          healthBarManager.createHealthBar(mesh, false);
        });
      }
      
      // Update position after spawning
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
    }).catch(error => {
      console.error('Error spawning remote player:', error);
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

