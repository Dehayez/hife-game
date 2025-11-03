/**
 * RemotePlayerManager.js
 * 
 * Manages remote players in multiplayer games.
 * Handles spawning, updating, and removing remote player entities.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadCharacterAnimations, setCharacterAnimation, updateCharacterAnimation } from '../character/CharacterAnimation.js';
import { getCharacterMovementStats } from '../character/CharacterStats.js';
import { createSpriteAtPosition } from '../utils/SpriteUtils.js';

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
      return;
    }

    // Create player sprite
    const playerHeight = this.movementStats.playerHeight;
    const playerMesh = createSpriteAtPosition(
      playerHeight,
      initialPosition.x || 0,
      initialPosition.z || 0,
      { alphaTest: 0.1 }
    );
    
    // Adjust Y position if provided
    if (initialPosition.y !== undefined) {
      playerMesh.position.y = initialPosition.y;
    } else {
      playerMesh.position.y = playerHeight * 0.5;
    }
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
    
    // Return remote player data for health bar creation
    return this.remotePlayers.get(playerId);
  }

  /**
   * Update remote player character (reload animations)
   * @param {string} playerId - Remote player ID
   * @param {string} characterName - New character name
   */
  async updateRemotePlayerCharacter(playerId, characterName) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) {
      return;
    }

    const mesh = remotePlayer.mesh;
    
    // Update character name in userData
    mesh.userData.characterName = characterName;
    
    // Clear current texture from material first
    if (mesh.material && mesh.material.map) {
      mesh.material.map = null;
      mesh.material.needsUpdate = true;
    }
    
    // Dispose old textures to free memory
    if (remotePlayer.animations) {
      Object.values(remotePlayer.animations).forEach(anim => {
        if (anim.mode === 'frames' && anim.textures) {
          anim.textures.forEach(tex => {
            if (tex && tex.dispose) tex.dispose();
          });
        } else if (anim.texture && anim.texture.dispose) {
          anim.texture.dispose();
        }
      });
    }
    
    // Reload animations for new character
    const newAnimations = await loadCharacterAnimations(characterName);
    
    // Wait for textures to be fully loaded
    const waitForTextures = async (animations) => {
      const promises = [];
      Object.values(animations).forEach(anim => {
        if (anim.mode === 'frames' && anim.textures) {
          anim.textures.forEach(tex => {
            if (tex && tex.image) {
              if (tex.image.complete && tex.image.naturalWidth > 0) {
                return; // Already loaded
              }
              promises.push(new Promise(resolve => {
                if (tex.image.complete) {
                  resolve();
                  return;
                }
                tex.image.onload = () => resolve();
                tex.image.onerror = () => resolve(); // Resolve even on error to avoid hanging
              }));
            } else if (tex) {
              // Texture might not have image property yet, wait a bit
              promises.push(new Promise(resolve => {
                const checkInterval = setInterval(() => {
                  if (tex.image) {
                    if (tex.image.complete) {
                      clearInterval(checkInterval);
                      resolve();
                    } else {
                      tex.image.onload = () => {
                        clearInterval(checkInterval);
                        resolve();
                      };
                      tex.image.onerror = () => {
                        clearInterval(checkInterval);
                        resolve();
                      };
                    }
                  }
                }, 50);
                // Timeout after 2 seconds
                setTimeout(() => {
                  clearInterval(checkInterval);
                  resolve();
                }, 2000);
              }));
            }
          });
        } else if (anim.texture) {
          if (anim.texture.image) {
            if (anim.texture.image.complete && anim.texture.image.naturalWidth > 0) {
              return; // Already loaded
            }
            promises.push(new Promise(resolve => {
              if (anim.texture.image.complete) {
                resolve();
                return;
              }
              anim.texture.image.onload = () => resolve();
              anim.texture.image.onerror = () => resolve();
            }));
          } else {
            // Texture might not have image property yet, wait a bit
            promises.push(new Promise(resolve => {
              const checkInterval = setInterval(() => {
                if (anim.texture.image) {
                  if (anim.texture.image.complete) {
                    clearInterval(checkInterval);
                    resolve();
                  } else {
                    anim.texture.image.onload = () => {
                      clearInterval(checkInterval);
                      resolve();
                    };
                    anim.texture.image.onerror = () => {
                      clearInterval(checkInterval);
                      resolve();
                    };
                  }
                }
              }, 50);
              // Timeout after 2 seconds
              setTimeout(() => {
                clearInterval(checkInterval);
                resolve();
              }, 2000);
            }));
          }
        }
      });
      
      if (promises.length > 0) {
        await Promise.all(promises);
      }
    };
    
    await waitForTextures(newAnimations);
    
    remotePlayer.animations = newAnimations;
    
    // Set current animation with new animations
    const currentAnimKey = remotePlayer.currentAnimKey || 'idle_front';
    const previousAnimKey = remotePlayer.currentAnimKey;
    setCharacterAnimation(
      mesh,
      currentAnimKey,
      newAnimations,
      previousAnimKey,
      true
    );
    
    // Force material update and ensure texture is set
    if (mesh.material) {
      const currentAnim = newAnimations[currentAnimKey];
      if (currentAnim) {
        const texture = currentAnim.mode === 'frames' ? currentAnim.textures[0] : currentAnim.texture;
        if (texture) {
          // Explicitly set the texture
          mesh.material.map = texture;
          mesh.material.needsUpdate = true;
          
          // Also update the texture itself
          if (texture.needsUpdate !== undefined) {
            texture.needsUpdate = true;
          }
          
          // Force a render update by marking the mesh as needing update
          mesh.visible = false;
          mesh.visible = true;
        }
      }
    }
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
      return;
    }

    this.scene.remove(remotePlayer.mesh);
    remotePlayer.mesh.geometry.dispose();
    remotePlayer.mesh.material.dispose();
    this.remotePlayers.delete(playerId);
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
    // Debug info available via browser console
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

