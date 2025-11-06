/**
 * RemotePlayerManager.js
 * 
 * Manages remote players in multiplayer games.
 * Handles spawning, updating, and removing remote player entities.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { loadCharacterAnimations, setCharacterAnimation, updateCharacterAnimation } from '../character/CharacterAnimation.js';
import { getCharacterMovementStats } from '../../../config/character/CharacterStats.js';
import { getRunningSmokeConfig } from '../../../config/abilities/base/SmokeParticleConfig.js';
import { createSpriteAtPosition } from '../../../utils/SpriteUtils.js';
import { HERALD_BLAST_ATTACK_CONFIG } from '../../../config/abilities/characters/herald/blast/AttackConfig.js';
import { waitForAllAnimationsLoaded } from '../../../utils/TextureLoader.js';

export class RemotePlayerManager {
  /**
   * Create a new RemotePlayerManager
   * @param {Object} scene - THREE.js scene
   * @param {Object} particleManager - Particle manager for smoke effects (optional)
   */
  constructor(scene, particleManager = null) {
    this.scene = scene;
    this.particleManager = particleManager;
    this.remotePlayers = new Map(); // Map<playerId, remotePlayerData>
    this.spawningPlayers = new Set(); // Set<playerId> - Track players currently being spawned to prevent duplicates
    this.movementStats = getCharacterMovementStats();
  }

  /**
   * Spawn a remote player
   * @param {string} playerId - Remote player ID
   * @param {string} characterName - Character name ('lucy' or 'herald')
   * @param {Object} initialPosition - Initial position {x, y, z}
   */
  async spawnRemotePlayer(playerId, characterName = 'lucy', initialPosition = { x: 0, y: 0, z: 0 }) {
    // Check if player already exists or is currently being spawned
    if (this.remotePlayers.has(playerId)) {
      return this.remotePlayers.get(playerId);
    }
    
    // Check if player is currently being spawned (prevent duplicate spawns)
    if (this.spawningPlayers.has(playerId)) {
      // Wait for the existing spawn to complete
      // Poll until player is added or timeout
      const maxWaitTime = 5000; // 5 seconds max wait
      const startTime = Date.now();
      while (this.spawningPlayers.has(playerId) && !this.remotePlayers.has(playerId)) {
        if (Date.now() - startTime > maxWaitTime) {
          console.warn(`Timeout waiting for player ${playerId} to spawn`);
          this.spawningPlayers.delete(playerId);
          return null;
        }
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
      // Return the player if it was successfully spawned
      if (this.remotePlayers.has(playerId)) {
        return this.remotePlayers.get(playerId);
      }
      
      // If spawn failed, continue with our own spawn
    }

    // Mark player as spawning to prevent concurrent spawns
    this.spawningPlayers.add(playerId);

    let playerMesh = null;
    try {
      // Create player sprite
    const playerHeight = this.movementStats.playerHeight;
    playerMesh = createSpriteAtPosition(
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
    
    if (!animations || !animations.idle_front) {
      throw new Error(`Failed to load animations for character ${characterName}`);
    }
    
    // Wait for all textures to be fully loaded before proceeding
    await waitForAllAnimationsLoaded(animations);
    
    // Set initial animation - this sets the texture on the material
    setCharacterAnimation(playerMesh, 'idle_front', animations, null, true);
    
    // Verify texture is set and image is loaded
    if (!playerMesh.material || !playerMesh.material.map) {
      throw new Error(`Failed to set texture for player ${playerId}`);
    }
    
    const texture = playerMesh.material.map;
    
    // Wait for texture image to be fully loaded if not already
    if (texture.image) {
      if (!texture.image.complete || texture.image.naturalWidth === 0) {
        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            texture.image.removeEventListener('load', onLoad);
            texture.image.removeEventListener('error', onError);
            reject(new Error(`Texture load timeout for player ${playerId}`));
          }, 5000); // 5 second timeout
          
          const onLoad = () => {
            clearTimeout(timeout);
            texture.image.removeEventListener('load', onLoad);
            texture.image.removeEventListener('error', onError);
            resolve();
          };
          
          const onError = () => {
            clearTimeout(timeout);
            texture.image.removeEventListener('load', onLoad);
            texture.image.removeEventListener('error', onError);
            reject(new Error(`Texture load error for player ${playerId}`));
          };
          
          texture.image.addEventListener('load', onLoad);
          texture.image.addEventListener('error', onError);
        });
      }
      
      // Verify image is actually loaded
      if (!texture.image.complete || texture.image.naturalWidth === 0) {
        throw new Error(`Texture image not loaded for player ${playerId}`);
      }
    } else {
      throw new Error(`Texture has no image for player ${playerId}`);
    }
    
    // Ensure material and texture are marked for update
    playerMesh.material.needsUpdate = true;
    if (texture.needsUpdate !== undefined) {
      texture.needsUpdate = true;
    }
    
    // Ensure mesh is visible
    playerMesh.visible = true;
    
    // Add to scene AFTER textures are loaded and mesh is configured
    this.scene.add(playerMesh);

    // Store remote player data
    const initialX = playerMesh.position.x;
    const initialY = playerMesh.position.y;
    const initialZ = playerMesh.position.z;
    
    this.remotePlayers.set(playerId, {
      mesh: playerMesh,
      animations: animations,
      currentAnimKey: 'idle_front',
      lastFacing: 'front',
      position: {
        x: initialX,
        y: initialY,
        z: initialZ
      },
      // Interpolation state
      targetPosition: {
        x: initialX,
        y: initialY,
        z: initialZ
      },
      previousPosition: {
        x: initialX,
        y: initialY,
        z: initialZ
      },
      interpolationTime: 0,
      interpolationDuration: 0.2, // 200ms - 3x sync interval (66ms * 3) for ultra-smooth interpolation
      smoothedVelocityX: 0,
      smoothedVelocityZ: 0,
      rotation: 0,
      networkRotation: 0, // Store network rotation for reference
      targetRotation: 0, // For smooth rotation interpolation
      velocityX: 0,
      velocityZ: 0,
      isGrounded: true,
      isRunning: false,
      smokeSpawnTimer: 0,
      lastUpdateTime: Date.now()
    });

      // Remove from spawning set now that spawn is complete
      this.spawningPlayers.delete(playerId);
      
      // Return remote player data for health bar creation
      return this.remotePlayers.get(playerId);
    } catch (error) {
      // Clean up mesh if it was created but spawn failed
      if (playerMesh) {
        // Remove from scene if it was added
        if (playerMesh.parent) {
          this.scene.remove(playerMesh);
        }
        // Dispose geometry and material if they exist
        if (playerMesh.geometry) {
          playerMesh.geometry.dispose();
        }
        if (playerMesh.material) {
          if (playerMesh.material.map) {
            playerMesh.material.map.dispose();
          }
          playerMesh.material.dispose();
        }
      }
      
      // Remove from remotePlayers map if it was added
      if (this.remotePlayers.has(playerId)) {
        this.remotePlayers.delete(playerId);
      }
      
      // Remove from spawning set on error
      this.spawningPlayers.delete(playerId);
      console.error(`Error spawning remote player ${playerId}:`, error);
      
      // Return null instead of throwing to prevent crashes
      return null;
    }
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
    
    // Store old texture and animations reference to keep it visible during swap
    const oldTexture = mesh.material && mesh.material.map ? mesh.material.map : null;
    const oldAnimations = remotePlayer.animations;
    const lastFacing = remotePlayer.lastFacing || 'front';
    
    // Load new animations FIRST (before clearing anything)
    // This uses the texture cache, so it should be instant if already loaded
    const newAnimations = await loadCharacterAnimations(characterName);
    
    // Update animations object immediately
    remotePlayer.animations = newAnimations;
    
    // Check if textures are already loaded (cached) - don't wait unnecessarily
    // For cached textures, the image should already be complete
    let texturesReady = true;
    for (const key in newAnimations) {
      if (newAnimations.hasOwnProperty(key)) {
        const anim = newAnimations[key];
        if (anim.mode === 'frames' && anim.textures) {
          for (const tex of anim.textures) {
            if (tex && tex.image && (!tex.image.complete || tex.image.naturalWidth === 0)) {
              texturesReady = false;
              break;
            }
          }
        } else if (anim.texture && anim.texture.image && (!anim.texture.image.complete || anim.texture.image.naturalWidth === 0)) {
          texturesReady = false;
        }
      }
      if (!texturesReady) break;
    }
    
    // Only wait if textures aren't ready (not cached yet)
    if (!texturesReady) {
      await waitForAllAnimationsLoaded(newAnimations);
    }
    
    // Spawn smoke particles for swap animation (like local player does)
    if (this.particleManager) {
      // Spawn lots of smoke particles quickly that follow the character
      for (let i = 0; i < 20; i++) {
        setTimeout(() => {
          const pos = new THREE.Vector3(
            mesh.position.x + (Math.random() - 0.5) * 0.5,
            mesh.position.y,
            mesh.position.z + (Math.random() - 0.5) * 0.5
          );
          this.particleManager.spawnSmokeParticle(pos, true); // true = follow character
        }, i * 10); // Spread over 200ms
      }
    }
    
    // NOW set new texture and play spawn animation (seamless swap)
    // Play spawn animation first (like local player does)
    const spawnAnimKey = lastFacing === 'back' ? 'spawn_back' : 'spawn_front';
    const idleAnimKey = lastFacing === 'back' ? 'idle_back' : 'idle_front';
    
    // Check if spawn animation exists (not a fallback to idle)
    const spawnAnim = newAnimations[spawnAnimKey];
    const idleAnim = newAnimations[idleAnimKey];
    const hasSpawnAnim = spawnAnim && spawnAnim !== idleAnim;
    
    if (hasSpawnAnim) {
      // Play spawn animation first
      const previousAnimKey = remotePlayer.currentAnimKey;
      setCharacterAnimation(
        mesh,
        spawnAnimKey,
        newAnimations,
        previousAnimKey,
        true,
        () => {
          // When spawn animation completes, return to idle
          remotePlayer.currentAnimKey = idleAnimKey;
          setCharacterAnimation(
            mesh,
            idleAnimKey,
            newAnimations,
            spawnAnimKey,
            true
          );
        }
      );
      remotePlayer.currentAnimKey = spawnAnimKey;
    } else {
      // No spawn animation, just set to idle immediately
      const currentAnimKey = idleAnimKey;
      const previousAnimKey = remotePlayer.currentAnimKey;
      setCharacterAnimation(
        mesh,
        currentAnimKey,
        newAnimations,
        previousAnimKey,
        true
      );
      remotePlayer.currentAnimKey = currentAnimKey;
    }
    
    // Force render update
    mesh.visible = false;
    mesh.visible = true;
    
    // Note: We don't dispose old textures here because:
    // 1. The texture cache is shared and manages texture lifecycle
    // 2. Textures might be reused (e.g., if switching back to the same character)
    // 3. Disposing textures that are in the cache would affect other uses
    // The cache will handle texture cleanup when appropriate
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
    const now = Date.now();
    
    // Store current position as previous position for interpolation
    remotePlayer.previousPosition.x = remotePlayer.position.x;
    remotePlayer.previousPosition.y = remotePlayer.position.y;
    remotePlayer.previousPosition.z = remotePlayer.position.z;
    
    // Calculate velocity before updating target position
    const timeSinceLastUpdate = (now - remotePlayer.lastUpdateTime) / 1000; // Convert to seconds
    if (timeSinceLastUpdate > 0 && timeSinceLastUpdate < 1) {
      // Calculate velocity from current position to new target position
      const oldTargetX = remotePlayer.targetPosition.x;
      const oldTargetZ = remotePlayer.targetPosition.z;
      
      // Update target position (where we want to interpolate to)
      if (state.x !== undefined) remotePlayer.targetPosition.x = state.x;
      if (state.y !== undefined) remotePlayer.targetPosition.y = state.y;
      if (state.z !== undefined) remotePlayer.targetPosition.z = state.z;
      
      // Calculate velocity based on movement from old target to new target
      const dx = remotePlayer.targetPosition.x - oldTargetX;
      const dz = remotePlayer.targetPosition.z - oldTargetZ;
      const newVelocityX = dx / timeSinceLastUpdate;
      const newVelocityZ = dz / timeSinceLastUpdate;
      
      // Smooth velocity changes using exponential smoothing (0.7 = 70% old, 30% new for ultra-smooth movement)
      remotePlayer.velocityX = newVelocityX;
      remotePlayer.velocityZ = newVelocityZ;
      remotePlayer.smoothedVelocityX = remotePlayer.smoothedVelocityX * 0.7 + newVelocityX * 0.3;
      remotePlayer.smoothedVelocityZ = remotePlayer.smoothedVelocityZ * 0.7 + newVelocityZ * 0.3;
    } else {
      // Update target position
      if (state.x !== undefined) remotePlayer.targetPosition.x = state.x;
      if (state.y !== undefined) remotePlayer.targetPosition.y = state.y;
      if (state.z !== undefined) remotePlayer.targetPosition.z = state.z;
    }
    
    // Reset interpolation timer - start interpolating from current position to target
    // Don't reset if we're very close to target (smooth transition)
    const distanceToTarget = Math.sqrt(
      Math.pow(remotePlayer.position.x - remotePlayer.targetPosition.x, 2) +
      Math.pow(remotePlayer.position.z - remotePlayer.targetPosition.z, 2)
    );

    // If we're far from target, reset interpolation for more responsive movement
    // Higher threshold (0.1) to reduce resets and maintain smoothness
    if (distanceToTarget > 0.1) {
      remotePlayer.interpolationTime = 0;
    }

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

    if (state.isRunning !== undefined) {
      remotePlayer.isRunning = state.isRunning;
    }

    remotePlayer.lastUpdateTime = now;
  }

  /**
   * Remove a remote player
   * @param {string} playerId - Remote player ID
   */
  removeRemotePlayer(playerId) {
    const remotePlayer = this.remotePlayers.get(playerId);
    if (!remotePlayer) {
      // Also clear from spawning set if it's there
      this.spawningPlayers.delete(playerId);
      return;
    }

    this.scene.remove(remotePlayer.mesh);
    remotePlayer.mesh.geometry.dispose();
    remotePlayer.mesh.material.dispose();
    this.remotePlayers.delete(playerId);
    this.spawningPlayers.delete(playerId);
  }

  /**
   * Update remote player animations and interpolate positions
   * @param {number} dt - Delta time in seconds
   * @param {THREE.Camera} camera - Camera for billboarding (optional)
   */
  updateAnimations(dt, camera = null) {
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      const mesh = remotePlayer.mesh;
      const now = Date.now();
      const timeSinceUpdate = (now - remotePlayer.lastUpdateTime) / 1000; // Convert to seconds
      
      // Apply horizontal velocity from blast (if set)
      if (remotePlayer.velocityX !== undefined && remotePlayer.velocityZ !== undefined) {
        const velocityDecay = HERALD_BLAST_ATTACK_CONFIG.velocityDecay;
        const velX = remotePlayer.velocityX * dt;
        const velZ = remotePlayer.velocityZ * dt;
        
        // Apply velocity
        remotePlayer.position.x += velX;
        remotePlayer.position.z += velZ;
        mesh.position.x += velX;
        mesh.position.z += velZ;
        
        // Decay velocity
        remotePlayer.velocityX *= velocityDecay;
        remotePlayer.velocityZ *= velocityDecay;
        
        // Stop velocity if very small
        if (Math.abs(remotePlayer.velocityX) < 0.1) remotePlayer.velocityX = 0;
        if (Math.abs(remotePlayer.velocityZ) < 0.1) remotePlayer.velocityZ = 0;
        
        // Clear knockback flag if velocity is too low (bouncing complete)
        if (mesh.userData && mesh.userData.characterData && mesh.userData.characterData.isKnockedBack) {
          if ((Math.abs(remotePlayer.velocityX) < 0.1 && Math.abs(remotePlayer.velocityZ) < 0.1) &&
              Math.abs(mesh.userData.characterData.velocityY || 0) < 0.1) {
            mesh.userData.characterData.isKnockedBack = false;
          }
        }
      }
      
      // Apply vertical velocity from blast (if set) with bounce physics
      if (mesh.userData && mesh.userData.characterData && mesh.userData.characterData.velocityY !== undefined) {
        const velY = mesh.userData.characterData.velocityY;
        const isKnockedBack = mesh.userData.characterData.isKnockedBack || false;
        const minBounceVelocity = HERALD_BLAST_ATTACK_CONFIG.minBounceVelocity;
        const bounceRestitution = HERALD_BLAST_ATTACK_CONFIG.bounceRestitution;
        
        if (Math.abs(velY) > 0.01) {
          // Apply gravity (simplified - would need access to physics stats)
          const gravity = -25.0; // Approximate gravity
          mesh.userData.characterData.velocityY += gravity * dt;
          
          // Apply vertical velocity
          const newY = mesh.position.y + mesh.userData.characterData.velocityY * dt;
          
          // Check for bounce (ground collision)
          const groundY = remotePlayer.targetPosition.y; // Use target position as ground reference
          const characterBottom = newY - 0.5; // Approximate character height
          
          if (characterBottom <= groundY && velY < 0) {
            // Hit ground - check if should bounce
            if (isKnockedBack && velY < -minBounceVelocity) {
              // Bounce! Apply restitution (invert and reduce velocity)
              mesh.userData.characterData.velocityY = -velY * bounceRestitution;
              mesh.position.y = groundY + 0.5;
              remotePlayer.position.y = groundY + 0.5;
            } else {
              // Normal landing - stop bouncing
              mesh.userData.characterData.velocityY = 0;
              mesh.position.y = groundY + 0.5;
              remotePlayer.position.y = groundY + 0.5;
              
              // Clear knockback flag if velocity too low
              if (isKnockedBack && Math.abs(velY) < minBounceVelocity) {
                mesh.userData.characterData.isKnockedBack = false;
              }
            }
          } else {
            // In air - continue movement
            mesh.position.y = newY;
            remotePlayer.position.y = newY;
          }
        }
      }
      
      // Calculate distance to target
      const dx = remotePlayer.targetPosition.x - remotePlayer.position.x;
      const dy = remotePlayer.targetPosition.y - remotePlayer.position.y;
      const dz = remotePlayer.targetPosition.z - remotePlayer.position.z;
      const distanceToTarget = Math.sqrt(dx * dx + dz * dz);
      
      // Snap threshold - if very close, snap directly to avoid jitter
      const snapThreshold = 0.005; // Tighter threshold for cleaner snapping

      if (distanceToTarget < snapThreshold && Math.abs(dy) < snapThreshold) {
        // Very close to target - snap directly
        mesh.position.set(
          remotePlayer.targetPosition.x,
          remotePlayer.targetPosition.y,
          remotePlayer.targetPosition.z
        );
        remotePlayer.position.x = remotePlayer.targetPosition.x;
        remotePlayer.position.y = remotePlayer.targetPosition.y;
        remotePlayer.position.z = remotePlayer.targetPosition.z;
      } else if (timeSinceUpdate < 0.3) { // Increased window before extrapolation
        // Use frame-based lerp for ultra-smooth movement
        // Lerp factor adapts based on distance - closer targets move faster
        const maxDistance = 5.0; // Maximum expected distance
        const normalizedDistance = Math.min(distanceToTarget / maxDistance, 1.0);

        // Smoother lerp factor: 0.15 to 0.25 based on distance for butter-smooth movement
        // Much gentler than before, prevents jerky motion
        const baseLerpFactor = 0.15;
        const adaptiveLerpFactor = baseLerpFactor + (normalizedDistance * 0.1);

        // Apply lerp directly - this gives smooth, frame-by-frame movement
        const currentX = remotePlayer.position.x +
          (remotePlayer.targetPosition.x - remotePlayer.position.x) * adaptiveLerpFactor;
        const currentY = remotePlayer.position.y +
          (remotePlayer.targetPosition.y - remotePlayer.position.y) * adaptiveLerpFactor;
        const currentZ = remotePlayer.position.z +
          (remotePlayer.targetPosition.z - remotePlayer.position.z) * adaptiveLerpFactor;

        mesh.position.set(currentX, currentY, currentZ);
        remotePlayer.position.x = currentX;
        remotePlayer.position.y = currentY;
        remotePlayer.position.z = currentZ;

        // Update interpolation time for tracking
        remotePlayer.interpolationTime += dt;
      } else {
        // Extrapolation: predict position based on smoothed velocity when updates are delayed
        // Only extrapolate horizontal movement (X and Z), keep Y as-is
        // Higher threshold (0.3s) to avoid premature extrapolation that causes overshoots
        const extrapolationTime = Math.min(timeSinceUpdate - 0.15, 0.15); // Cap extrapolation at 150ms
        
        // Use smoothed velocity for more stable extrapolation
        const extrapolatedX = remotePlayer.targetPosition.x + remotePlayer.smoothedVelocityX * extrapolationTime;
        const extrapolatedZ = remotePlayer.targetPosition.z + remotePlayer.smoothedVelocityZ * extrapolationTime;
        
        mesh.position.set(
          extrapolatedX,
          remotePlayer.targetPosition.y, // Don't extrapolate Y
          extrapolatedZ
        );
        remotePlayer.position.x = extrapolatedX;
        remotePlayer.position.z = extrapolatedZ;
      }
      
      // Billboard remote players to camera (like local players) with smooth rotation
      if (camera) {
        const camYaw = camera.rotation.y;

        // Smooth rotation interpolation to avoid instant snapping
        // Use a gentler lerp factor for rotation (0.1 = 10% per frame)
        const rotationLerpFactor = 0.1;

        // Handle angle wrapping (shortest path between angles)
        let angleDiff = camYaw - remotePlayer.rotation;
        // Normalize angle difference to [-PI, PI]
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        // Apply smooth interpolation
        remotePlayer.rotation += angleDiff * rotationLerpFactor;
        mesh.rotation.y = remotePlayer.rotation;
      }
      
      updateCharacterAnimation(
        mesh,
        remotePlayer.animations,
        remotePlayer.currentAnimKey,
        remotePlayer.isGrounded,
        () => true, // Assume on base ground for remote players
        null, // No sound manager for remote players
        dt,
        remotePlayer.isRunning || false // Use synced running state
      );
      
      // Spawn smoke particles when running and grounded
      if (remotePlayer.isRunning && remotePlayer.isGrounded && this.particleManager) {
        remotePlayer.smokeSpawnTimer -= dt;
        if (remotePlayer.smokeSpawnTimer <= 0) {
          const smokeConfig = getRunningSmokeConfig();
          const smokeSpawnInterval = smokeConfig.spawnInterval;
          this.particleManager.spawnSmokeParticle(mesh.position);
          remotePlayer.smokeSpawnTimer = smokeSpawnInterval;
        }
      } else {
        // Reset timer when not running
        remotePlayer.smokeSpawnTimer = 0;
      }
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
    this.spawningPlayers.clear();
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

  /**
   * Find and remove orphaned player meshes from the scene
   * This helps clean up any meshes that were created but not properly tracked
   * @returns {number} Number of orphaned meshes removed
   */
  cleanupOrphanedMeshes() {
    if (!this.scene) return 0;
    
    let removedCount = 0;
    const trackedMeshes = new Set();
    
    // Collect all tracked remote player meshes
    for (const [playerId, remotePlayer] of this.remotePlayers) {
      if (remotePlayer && remotePlayer.mesh) {
        trackedMeshes.add(remotePlayer.mesh);
      }
    }
    
    // Find all meshes in the scene that look like player meshes but aren't tracked
    const sceneChildren = [...this.scene.children];
    for (const child of sceneChildren) {
      // Check if this looks like a player mesh (has userData with type)
      if (child.userData && 
          (child.userData.type === 'remote-player' || child.userData.type === 'player')) {
        // If it's not in our tracked meshes, it's orphaned
        if (!trackedMeshes.has(child)) {
          // Check if mesh has no texture or invalid texture (might indicate failed spawn)
          const hasNoTexture = !child.material || !child.material.map;
          const hasInvalidTexture = child.material && child.material.map && 
                                    (!child.material.map.image || 
                                     !child.material.map.image.complete || 
                                     child.material.map.image.naturalWidth === 0);
          
          // Remove orphaned remote player mesh (especially if it has no texture or invalid texture)
          if (hasNoTexture || hasInvalidTexture || child.userData.type === 'remote-player') {
            console.warn(`Removing orphaned player mesh ${child.userData.playerId || 'unknown'} - hasTexture: ${!hasNoTexture}, validTexture: ${!hasInvalidTexture}`);
            this.scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
            removedCount++;
          }
        } else {
          // Check if tracked mesh has no texture (shouldn't happen, but clean up if it does)
          const hasNoTexture = !child.material || !child.material.map;
          const hasInvalidTexture = child.material && child.material.map && 
                                    (!child.material.map.image || 
                                     !child.material.map.image.complete || 
                                     child.material.map.image.naturalWidth === 0);
          
          if (hasNoTexture || hasInvalidTexture) {
            console.warn(`Removing tracked player mesh ${child.userData.playerId || 'unknown'} with invalid texture`);
            // Find and remove from remotePlayers
            for (const [playerId, remotePlayer] of this.remotePlayers) {
              if (remotePlayer && remotePlayer.mesh === child) {
                this.remotePlayers.delete(playerId);
                break;
              }
            }
            this.scene.remove(child);
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (child.material.map) child.material.map.dispose();
              child.material.dispose();
            }
            removedCount++;
          }
        }
      }
    }
    
    return removedCount;
  }
}

