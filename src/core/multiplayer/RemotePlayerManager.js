/**
 * RemotePlayerManager.js
 * 
 * Manages remote players in multiplayer games.
 * Handles spawning, updating, and removing remote player entities.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadCharacterAnimations, setCharacterAnimation, updateCharacterAnimation } from '../character/CharacterAnimation.js';
import { getCharacterMovementStats } from '../character/CharacterStats.js';

export class RemotePlayerManager {
  /**
   * Create a new RemotePlayerManager
   * @param {Object} scene - THREE.js scene
   */
  constructor(scene) {
    this.scene = scene;
    this.remotePlayers = new Map(); // Map<playerId, remotePlayerData>
    this.movementStats = getCharacterMovementStats();
  }

  /**
   * Spawn a remote player
   * @param {string} playerId - Remote player ID
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @param {Object} initialPosition - Initial position {x, y, z}
   */
  async spawnRemotePlayer(playerId, characterName = 'lucy', initialPosition = { x: 0, y: 0, z: 0 }) {
    if (this.remotePlayers.has(playerId)) {
      console.warn(`Remote player ${playerId} already exists`);
      return;
    }

    // Create player sprite
    const playerHeight = this.movementStats.playerHeight;
    const spriteGeo = new THREE.PlaneGeometry(playerHeight * 0.7, playerHeight);
    const spriteMat = new THREE.MeshBasicMaterial({ transparent: true, alphaTest: 0.1 });
    const playerMesh = new THREE.Mesh(spriteGeo, spriteMat);
    
    playerMesh.position.set(
      initialPosition.x || 0,
      initialPosition.y || playerHeight * 0.5,
      initialPosition.z || 0
    );
    
    playerMesh.castShadow = true;
    playerMesh.receiveShadow = false;
    playerMesh.userData = {
      type: 'remote-player',
      playerId: playerId,
      characterName: characterName
    };

    // Load character animations
    const animations = await loadCharacterAnimations(characterName);
    
    // Set initial animation
    setCharacterAnimation(playerMesh, 'idle_front', animations, null, true);

    // Store remote player data
    this.remotePlayers.set(playerId, {
      mesh: playerMesh,
      animations: animations,
      currentAnimKey: 'idle_front',
      lastFacing: 'front',
      position: {
        x: playerMesh.position.x,
        y: playerMesh.position.y,
        z: playerMesh.position.z
      },
      rotation: 0,
      networkRotation: 0, // Store network rotation for reference
      velocityX: 0,
      velocityZ: 0,
      isGrounded: true,
      lastUpdateTime: Date.now()
    });

    this.scene.add(playerMesh);
  }

  /**
   * Update remote player position and state
   * @param {string} playerId - Remote player ID
   * @param {Object} state - Player state {x, y, z, rotation, currentAnimKey, lastFacing, isGrounded}
   */
  updateRemotePlayer(playerId, state) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) {
      return;
    }

    const mesh = remotePlayer.mesh;
    
    // Update position with interpolation for smoother movement
    if (state.x !== undefined) remotePlayer.position.x = state.x;
    if (state.y !== undefined) remotePlayer.position.y = state.y;
    if (state.z !== undefined) remotePlayer.position.z = state.z;
    
    mesh.position.set(
      remotePlayer.position.x,
      remotePlayer.position.y,
      remotePlayer.position.z
    );

    // Update rotation (billboard to camera while respecting network rotation)
    // Note: We'll billboard in updateAnimations, but we can still store network rotation
    if (state.rotation !== undefined) {
      // Store rotation but don't apply it here - billboarding happens in updateAnimations
      remotePlayer.networkRotation = state.rotation;
    }

    // Update animation if changed
    if (state.currentAnimKey && state.currentAnimKey !== remotePlayer.currentAnimKey) {
      setCharacterAnimation(
        mesh,
        state.currentAnimKey,
        remotePlayer.animations,
        remotePlayer.currentAnimKey,
        false
      );
      remotePlayer.currentAnimKey = state.currentAnimKey;
    }

    if (state.lastFacing !== undefined) {
      remotePlayer.lastFacing = state.lastFacing;
    }

    if (state.isGrounded !== undefined) {
      remotePlayer.isGrounded = state.isGrounded;
    }

    remotePlayer.lastUpdateTime = Date.now();
  }

  /**
   * Remove a remote player
   * @param {string} playerId - Remote player ID
   */
  removeRemotePlayer(playerId) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) {
      console.warn(`Remote player ${playerId} not found`);
      return;
    }

    this.scene.remove(remotePlayer.mesh);
    remotePlayer.mesh.geometry.dispose();
    remotePlayer.mesh.material.dispose();
    this.remotePlayers.delete(playerId);
    console.log(`Removed remote player ${playerId}`);
  }

  /**
   * Update remote player animations
   * @param {number} dt - Delta time in seconds
   * @param {THREE.Camera} camera - Camera for billboarding (optional)
   */
  updateAnimations(dt, camera = null) {
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      // Billboard remote players to camera (like local players)
      if (camera) {
        const camYaw = camera.rotation.y;
        remotePlayer.mesh.rotation.y = camYaw;
      }
      
      updateCharacterAnimation(
        remotePlayer.mesh,
        remotePlayer.animations,
        remotePlayer.currentAnimKey,
        remotePlayer.isGrounded,
        () => true, // Assume on base ground for remote players
        null, // No sound manager for remote players
        dt,
        false // Assume not running (could be synced from state)
      );
    }
  }

  /**
   * Get all remote players
   * @returns {Map} Map of remote players
   */
  getRemotePlayers() {
    return this.remotePlayers;
  }

  /**
   * Get a specific remote player
   * @param {string} playerId - Remote player ID
   * @returns {Object|null} Remote player data or null
   */
  getRemotePlayer(playerId) {
    return this.remotePlayers.get(playerId) || null;
  }

  /**
   * Clear all remote players
   */
  clearAll() {
    for (const [playerId] of this.remotePlayers) {
      this.removeRemotePlayer(playerId);
    }
  }

  /**
   * Debug: Get detailed info about all remote players
   * Call this from browser console: remotePlayerManager.debugInfo()
   */
  debugInfo() {
    console.log(`[RemotePlayerManager] === DEBUG INFO ===`);
    console.log(`Remote players count: ${this.remotePlayers.size}`);
    console.log(`Scene children count: ${this.scene.children.length}`);
    
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      const mesh = remotePlayer.mesh;
      console.log(`\n[RemotePlayerManager] Player ${playerId}:`, {
        inScene: this.scene.children.includes(mesh),
        position: { x: mesh.position.x, y: mesh.position.y, z: mesh.position.z },
        rotation: { x: mesh.rotation.x, y: mesh.rotation.y, z: mesh.rotation.z },
        visible: mesh.visible,
        material: {
          type: mesh.material?.type,
          hasMap: !!mesh.material?.map,
          mapLoaded: mesh.material?.map?.image?.complete,
          transparent: mesh.material?.transparent,
          needsUpdate: mesh.material?.needsUpdate
        },
        geometry: {
          type: mesh.geometry?.type,
          vertices: mesh.geometry?.attributes?.position?.count
        },
        currentAnimKey: remotePlayer.currentAnimKey,
        lastUpdateTime: remotePlayer.lastUpdateTime,
        timeSinceUpdate: Date.now() - remotePlayer.lastUpdateTime
      });
    }
    
    console.log(`[RemotePlayerManager] === END DEBUG INFO ===`);
  }
  
  /**
   * Clean up stale remote players (haven't updated in a while)
   * @param {number} timeoutMs - Timeout in milliseconds (default: 5000ms)
   */
  cleanupStalePlayers(timeoutMs = 5000) {
    const now = Date.now();
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      if (now - remotePlayer.lastUpdateTime > timeoutMs) {
        this.removeRemotePlayer(playerId);
      }
    }
  }
}

