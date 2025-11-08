/**
 * MultiPlayerManager.js
 * 
 * Manages multiple local players for splitscreen gameplay.
 * Handles creation, updates, and cleanup of multiple character instances.
 */

import { CharacterManager } from '../character/CharacterManager.js';

export class MultiPlayerManager {
  /**
   * Create a new MultiPlayerManager
   * @param {THREE.Scene} scene - Three.js scene
   */
  constructor(scene) {
    this.scene = scene;
    this.players = []; // Array of CharacterManager instances
    this.maxPlayers = 4;
  }

  /**
   * Add a new player
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @param {Object} collisionManager - Collision manager instance
   * @param {Object} particleManager - Particle manager instance
   * @param {string} footstepSoundPath - Optional custom footstep sound path
   * @returns {Promise<CharacterManager>} The created character manager
   */
  async addPlayer(characterName, collisionManager, particleManager, footstepSoundPath = null) {
    if (this.players.length >= this.maxPlayers) {
      console.warn(`Maximum players (${this.maxPlayers}) reached`);
      return null;
    }

    const characterManager = new CharacterManager(this.scene, footstepSoundPath);
    characterManager.setCollisionManager(collisionManager);
    characterManager.setParticleManager(particleManager);
    
    // Initialize player in scene
    characterManager.initializePlayer(this.scene);
    
    // Load character assets
    await characterManager.loadCharacter(characterName);
    
    // Set spawn position based on player index
    const playerIndex = this.players.length;
    const spawnOffset = this._getSpawnOffset(playerIndex);
    const player = characterManager.getPlayer();
    if (player) {
      player.position.set(spawnOffset.x, spawnOffset.y, spawnOffset.z);
    }
    
    this.players.push(characterManager);
    
    return characterManager;
  }

  /**
   * Remove a player
   * @param {number} playerIndex - Player index (0-based)
   */
  removePlayer(playerIndex) {
    if (playerIndex < 0 || playerIndex >= this.players.length) {
      console.warn(`Invalid player index: ${playerIndex}`);
      return;
    }

    const characterManager = this.players[playerIndex];
    const player = characterManager.getPlayer();
    
    if (player && this.scene) {
      this.scene.remove(player);
    }
    
    this.players.splice(playerIndex, 1);
  }

  /**
   * Get a player by index
   * @param {number} playerIndex - Player index (0-based)
   * @returns {CharacterManager|null}
   */
  getPlayer(playerIndex) {
    return this.players[playerIndex] || null;
  }

  /**
   * Get all players
   * @returns {Array<CharacterManager>}
   */
  getAllPlayers() {
    return this.players;
  }

  /**
   * Get player count
   * @returns {number}
   */
  getPlayerCount() {
    return this.players.length;
  }

  /**
   * Clear all players
   */
  clearAll() {
    this.players.forEach((characterManager, index) => {
      const player = characterManager.getPlayer();
      if (player && this.scene) {
        this.scene.remove(player);
      }
    });
    this.players = [];
  }

  /**
   * Update all players
   * @param {number} dt - Delta time
   */
  updateAll(dt) {
    this.players.forEach(characterManager => {
      if (characterManager && typeof characterManager.update === 'function') {
        characterManager.update(dt);
      }
    });
  }

  /**
   * Get spawn offset for a player based on index
   * @private
   * @param {number} playerIndex - Player index (0-based)
   * @returns {Object} Object with x, y, z coordinates
   */
  _getSpawnOffset(playerIndex) {
    // Spawn players in a circle formation
    const angle = (playerIndex / this.maxPlayers) * Math.PI * 2;
    const radius = 2;
    
    return {
      x: Math.cos(angle) * radius,
      y: 0,
      z: Math.sin(angle) * radius
    };
  }

  /**
   * Respawn all players
   */
  respawnAll() {
    this.players.forEach((characterManager, index) => {
      if (characterManager && typeof characterManager.respawn === 'function') {
        characterManager.respawn();
        
        // Set spawn position
        const spawnOffset = this._getSpawnOffset(index);
        const player = characterManager.getPlayer();
        if (player) {
          player.position.set(spawnOffset.x, spawnOffset.y, spawnOffset.z);
        }
      }
    });
  }
}

