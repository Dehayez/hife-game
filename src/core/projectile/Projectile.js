/**
 * Projectile.js
 * 
 * Handles creation, update, and removal of regular firebolt projectiles.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getFireboltStats, getCharacterColor } from './CharacterStats.js';

/**
 * Create a firebolt projectile
 * @param {Object} scene - THREE.js scene
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (character height)
 * @param {number} startZ - Starting Z position
 * @param {number} directionX - Direction X component
 * @param {number} directionZ - Direction Z component
 * @param {string} playerId - Player ID ('local' or player identifier)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {number} targetX - Optional target X position for cursor following
 * @param {number} targetZ - Optional target Z position for cursor following
 * @returns {THREE.Mesh|null} Created projectile mesh or null if on cooldown
 */
export function createProjectile(scene, startX, startY, startZ, directionX, directionZ, playerId, characterName, targetX = null, targetZ = null) {
  // Get character-specific firebolt stats
  const stats = getFireboltStats(characterName);
  const characterColor = getCharacterColor(characterName);
  
  // Normalize direction vector
  const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
  if (dirLength < 0.001) return null;
  
  const normX = directionX / dirLength;
  const normZ = directionZ / dirLength;

  // Create projectile geometry and material
  const geo = new THREE.SphereGeometry(stats.size, 8, 8);
  const mat = new THREE.MeshStandardMaterial({
    color: characterColor,
    emissive: characterColor,
    emissiveIntensity: 0.9,
    metalness: 0.7,
    roughness: 0.2
  });
  
  const projectile = new THREE.Mesh(geo, mat);
  projectile.position.set(startX, startY, startZ);
  projectile.castShadow = true;
  
  // Add trail effect - point light with character color
  const trailLight = new THREE.PointLight(characterColor, 1.0, 3);
  trailLight.position.set(startX, startY, startZ);
  scene.add(trailLight);
  
  // Calculate initial speed based on acceleration/deceleration pattern
  const baseSpeed = stats.projectileSpeed;
  const minSpeed = (stats.minSpeed !== undefined ? stats.minSpeed : 1.0) * baseSpeed;
  const maxSpeed = (stats.maxSpeed !== undefined ? stats.maxSpeed : 1.0) * baseSpeed;
  
  // Herald: start slow (minSpeed) and continuously accelerate (no max cap)
  // Lucy: start fast (maxSpeed) and decelerate to slow (minSpeed)
  const startSpeed = characterName === 'herald' ? minSpeed : maxSpeed;
  // For Herald, endSpeed can exceed maxSpeed to keep accelerating
  const endSpeed = characterName === 'herald' ? maxSpeed * 1.5 : minSpeed; // Herald accelerates 50% beyond maxSpeed
  
  // Store projectile data with character-specific stats
  projectile.userData = {
    type: 'projectile',
    playerId: playerId,
    characterName: characterName,
    characterColor: characterColor, // Store character color for impact effects
    baseSpeed: baseSpeed, // Base speed for reference
    startSpeed: startSpeed, // Starting speed
    endSpeed: endSpeed, // Ending speed
    currentMaxSpeed: startSpeed, // Track maximum speed achieved (can only increase)
    velocityX: normX * startSpeed,
    velocityZ: normZ * startSpeed,
    lifetime: 0,
    maxLifetime: stats.lifetime,
    trailLight: trailLight,
    damage: stats.damage,
    size: stats.size,
    hasHit: false, // Flag to track if projectile has hit something
    targetX: targetX, // Target X position for cursor following
    targetZ: targetZ, // Target Z position for cursor following
    cursorFollowStrength: stats.cursorFollowStrength || 0, // How much to follow cursor
    initialDirX: normX, // Initial shooting direction X
    initialDirZ: normZ // Initial shooting direction Z
  };
  
  scene.add(projectile);
  return projectile;
}

/**
 * Update projectile position and check lifetime
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @param {Object} camera - THREE.js camera (optional, for cursor tracking)
 * @param {Object} inputManager - Input manager (optional, for cursor tracking)
 * @param {Object} playerPosition - Player position vector (optional, for cursor tracking)
 * @returns {boolean} True if projectile should be removed
 */
export function updateProjectile(projectile, dt, collisionManager, camera = null, inputManager = null, playerPosition = null) {
  // Update lifetime
  projectile.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
    return true;
  }
  
  // Apply cursor following if enabled and cursor tracking is available
  const followStrength = projectile.userData.cursorFollowStrength || 0;
  let targetX = projectile.userData.targetX;
  let targetZ = projectile.userData.targetZ;
  
  // Track cursor/joystick if enabled and tracking data is available
  // Allow joystick control even if projectile wasn't created with a target (for post-fire control)
  if (followStrength > 0 && inputManager && playerPosition) {
    let newTargetX = null;
    let newTargetZ = null;
    
    // Check if right joystick is actively pushed for aiming (only when actively pushed)
    const rightJoystickDir = inputManager.getRightJoystickDirection();
    const isRightJoystickPushed = inputManager.isRightJoystickPushed();
    
    // Prioritize right joystick for aiming (smooth 360-degree aiming in world space)
    // This allows continuous curving of projectiles while they're in flight
    // Works even if projectile was fired without a target initially
    if (isRightJoystickPushed && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0) && camera) {
      // Use camera-relative direction: convert joystick input to world space using camera orientation
      // This matches how mouse aiming works and accounts for camera angle
      
      // Get camera forward and right vectors (in world space)
      const cameraDir = new THREE.Vector3();
      camera.getWorldDirection(cameraDir);
      
      // Create a right vector perpendicular to camera direction (in XZ plane)
      const cameraRight = new THREE.Vector3();
      cameraRight.crossVectors(cameraDir, new THREE.Vector3(0, 1, 0)).normalize();
      
      // Create a forward vector in XZ plane (project camera direction onto ground)
      const cameraForward = new THREE.Vector3(cameraDir.x, 0, cameraDir.z).normalize();
      
      // Map joystick input to camera-relative direction
      // Right stick X = right/left relative to camera view
      // Right stick Z (from joystick Y) = up/down relative to camera view
      // Note: Invert Z because gamepad Y is negative when pushed up
      let directionX = (cameraRight.x * rightJoystickDir.x) + (cameraForward.x * -rightJoystickDir.z);
      let directionZ = (cameraRight.z * rightJoystickDir.x) + (cameraForward.z * -rightJoystickDir.z);
      
      // Normalize direction
      const dirLength = Math.sqrt(directionX * directionX + directionZ * directionZ);
      if (dirLength > 0.001) {
        directionX /= dirLength;
        directionZ /= dirLength;
      }
      
      // Calculate target point continuously based on current joystick position
      // This allows projectiles to curve smoothly while in flight
      const targetDistance = 20; // Distance ahead to aim
      newTargetX = playerPosition.x + directionX * targetDistance;
      newTargetZ = playerPosition.z + directionZ * targetDistance;
      
      // Update stored target continuously for smooth curving
      projectile.userData.targetX = newTargetX;
      projectile.userData.targetZ = newTargetZ;
      targetX = newTargetX;
      targetZ = newTargetZ;
    } else if (camera && targetX !== null && targetZ !== null) {
      // Fallback to mouse/cursor tracking (only if projectile was created with a target)
      // This preserves the original behavior for mouse-aimed projectiles
      const mousePos = inputManager.getMousePosition();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      // Intersect with ground plane at y = 0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      
      // Get initial shooting direction from projectile userData
      const initialDirX = projectile.userData.initialDirX;
      const initialDirZ = projectile.userData.initialDirZ;
      
      if (initialDirX !== undefined && initialDirZ !== undefined) {
        // Calculate vector from player to cursor
        const toCursorX = intersect.x - playerPosition.x;
        const toCursorZ = intersect.z - playerPosition.z;
        const toCursorLength = Math.sqrt(toCursorX * toCursorX + toCursorZ * toCursorZ);
        
        if (toCursorLength > 0.01) {
          // Normalize cursor direction from player
          const cursorDirX = toCursorX / toCursorLength;
          const cursorDirZ = toCursorZ / toCursorLength;
          
          // Calculate dot product to check if cursor is ahead along shooting direction
          const dotProduct = initialDirX * cursorDirX + initialDirZ * cursorDirZ;
          
          // If cursor is ahead (forward) along the shooting direction line, use it as target
          // dotProduct > 0 means the cursor is generally in the forward direction
          if (dotProduct > 0) {
            // Project cursor position onto the shooting direction line
            // Calculate distance along the shooting direction line from player to cursor projection
            const cursorProjDist = toCursorLength * dotProduct;
            
            // Calculate distance from player to projectile along shooting direction
            const projectileFromPlayerX = projectile.position.x - playerPosition.x;
            const projectileFromPlayerZ = projectile.position.z - playerPosition.z;
            const projectileDistFromPlayer = Math.sqrt(
              projectileFromPlayerX * projectileFromPlayerX +
              projectileFromPlayerZ * projectileFromPlayerZ
            );
            
            // Project projectile position onto shooting direction line
            if (projectileDistFromPlayer > 0.01) {
              const projDirX = projectileFromPlayerX / projectileDistFromPlayer;
              const projDirZ = projectileFromPlayerZ / projectileDistFromPlayer;
              const projDotProduct = initialDirX * projDirX + initialDirZ * projDirZ;
              const projectileProjDist = projectileDistFromPlayer * Math.max(0, projDotProduct);
              
              // If cursor projection is further along the shooting direction line than projectile, follow it
              if (cursorProjDist > projectileProjDist) {
                targetX = intersect.x;
                targetZ = intersect.z;
                // Update stored target
                projectile.userData.targetX = targetX;
                projectile.userData.targetZ = targetZ;
              }
            }
          }
        }
      }
    }
  }
  
  // Apply cursor following if target is set
  if (followStrength > 0 && targetX !== null && targetZ !== null) {
    // Calculate direction to target
    const toTargetX = targetX - projectile.position.x;
    const toTargetZ = targetZ - projectile.position.z;
    const toTargetLength = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);
    
    if (toTargetLength > 0.01) {
      // Normalize target direction
      const targetDirX = toTargetX / toTargetLength;
      const targetDirZ = toTargetZ / toTargetLength;
      
      // Interpolate between current velocity direction and target direction
      const stats = getFireboltStats(projectile.userData.characterName);
      const currentSpeed = Math.sqrt(
        projectile.userData.velocityX * projectile.userData.velocityX +
        projectile.userData.velocityZ * projectile.userData.velocityZ
      ) || stats.projectileSpeed;
      
      // Get current velocity direction
      const currentDirX = projectile.userData.velocityX / currentSpeed;
      const currentDirZ = projectile.userData.velocityZ / currentSpeed;
      
      // Lerp towards target direction based on follow strength
      const newDirX = currentDirX + (targetDirX - currentDirX) * followStrength * dt * 5;
      const newDirZ = currentDirZ + (targetDirZ - currentDirZ) * followStrength * dt * 5;
      
      // Normalize and update velocity
      const newDirLength = Math.sqrt(newDirX * newDirX + newDirZ * newDirZ);
      if (newDirLength > 0.001) {
        const normNewDirX = newDirX / newDirLength;
        const normNewDirZ = newDirZ / newDirLength;
        projectile.userData.velocityX = normNewDirX * currentSpeed;
        projectile.userData.velocityZ = normNewDirZ * currentSpeed;
      }
    }
  }
  
  // Update speed based on character type
  let targetSpeed;
  if (projectile.userData.characterName === 'herald' && inputManager) {
    // Herald: Speed controlled by input method (can only increase, never decrease)
    const minSpeed = projectile.userData.startSpeed;
    const maxSpeed = projectile.userData.endSpeed;
    const speedRange = maxSpeed - minSpeed;
    
    let calculatedSpeed = minSpeed;
    
    // Check if using gamepad (joystick control)
    const joystickMagnitude = inputManager.getRightJoystickMagnitude();
    if (joystickMagnitude > 0.01 && inputManager.getInputMode() === 'controller') {
      // Gamepad: Speed controlled by right joystick magnitude
      // The further the joystick is pushed, the faster the projectile goes
      calculatedSpeed = minSpeed + (speedRange * joystickMagnitude);
    } else if (camera && playerPosition && inputManager.getInputMode() === 'keyboard') {
      // Keyboard/Mouse: Speed controlled by cursor distance from player
      // Further cursor = faster projectile
      const mousePos = inputManager.getMousePosition();
      const raycaster = new THREE.Raycaster();
      const mouse = new THREE.Vector2();
      mouse.x = (mousePos.x / window.innerWidth) * 2 - 1;
      mouse.y = -(mousePos.y / window.innerHeight) * 2 + 1;
      
      raycaster.setFromCamera(mouse, camera);
      
      // Intersect with ground plane at y = 0
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const intersect = new THREE.Vector3();
      raycaster.ray.intersectPlane(plane, intersect);
      
      // Calculate distance from player to cursor position
      const distanceX = intersect.x - playerPosition.x;
      const distanceZ = intersect.z - playerPosition.z;
      const cursorDistance = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
      
      // Map distance to speed (normalize to 0-1 range, max distance = 20 units)
      const maxDistance = 20; // Maximum distance for full speed
      const normalizedDistance = Math.min(cursorDistance / maxDistance, 1.0);
      
      // Further cursor = faster speed
      calculatedSpeed = minSpeed + (speedRange * normalizedDistance);
    } else {
      // Fallback: use minimum speed
      calculatedSpeed = minSpeed;
    }
    
    // Speed can only increase, never decrease
    // Track the maximum speed achieved and use the higher value
    if (calculatedSpeed > projectile.userData.currentMaxSpeed) {
      projectile.userData.currentMaxSpeed = calculatedSpeed;
    }
    targetSpeed = projectile.userData.currentMaxSpeed;
  } else {
    // Lucy: Fixed speed or deceleration pattern (no joystick control)
    // Use base speed for consistent spraying behavior
    targetSpeed = projectile.userData.baseSpeed;
  }
  
  // Get current velocity direction (may have been modified by cursor following)
  const currentVelocityX = projectile.userData.velocityX;
  const currentVelocityZ = projectile.userData.velocityZ;
  const currentVelocityLength = Math.sqrt(currentVelocityX * currentVelocityX + currentVelocityZ * currentVelocityZ);
  
  // Normalize direction and apply speed based on acceleration/deceleration
  if (currentVelocityLength > 0.001) {
    const dirX = currentVelocityX / currentVelocityLength;
    const dirZ = currentVelocityZ / currentVelocityLength;
    projectile.userData.velocityX = dirX * targetSpeed;
    projectile.userData.velocityZ = dirZ * targetSpeed;
  }
  
  // Calculate new position
  const newX = projectile.position.x + projectile.userData.velocityX * dt;
  const newZ = projectile.position.z + projectile.userData.velocityZ * dt;
  
  // Update Y position to track character height
  // If playerPosition is provided, projectiles should follow character's vertical position
  let newY = projectile.position.y;
  if (playerPosition) {
    // Projectile follows character's Y position (height) during flight
    newY = playerPosition.y;
  }
  
  // Check collision with walls
  let shouldRemove = false;
  if (collisionManager) {
    // Use character-specific size from projectile userData
    const projectileSize = projectile.userData.size || 0.1;
    const nextPos = new THREE.Vector3(newX, newY, newZ);
    
    if (collisionManager.willCollide(nextPos, projectileSize)) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.y = newY;
      projectile.position.z = newZ;
    }
  } else {
    // Simple arena bounds check (fallback)
    const halfArena = 15; // Default arena size / 2
    if (Math.abs(newX) > halfArena || Math.abs(newZ) > halfArena) {
      shouldRemove = true;
    } else {
      projectile.position.x = newX;
      projectile.position.y = newY;
      projectile.position.z = newZ;
    }
  }
  
  // Update trail light position
  if (projectile.userData.trailLight) {
    projectile.userData.trailLight.position.set(
      projectile.position.x,
      projectile.position.y,
      projectile.position.z
    );
  }
  
  // Rotate projectile for visual effect
  projectile.rotation.x += dt * 5;
  projectile.rotation.y += dt * 5;
  
  return shouldRemove;
}

/**
 * Remove projectile from scene and clean up resources
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} scene - THREE.js scene
 * @param {Object} particleManager - Optional particle manager for impact effects
 */
export function removeProjectile(projectile, scene, particleManager = null) {
  // Spawn impact particles if particle manager available
  if (particleManager && projectile.userData) {
    const characterColor = projectile.userData.characterColor || 0xffaa00;
    particleManager.spawnImpactParticles(
      projectile.position.clone(),
      characterColor,
      12,
      0.5
    );
  }
  
  // Remove trail light
  if (projectile.userData.trailLight) {
    scene.remove(projectile.userData.trailLight);
  }
  
  // Remove from scene
  scene.remove(projectile);
  
  // Clean up geometry and material
  projectile.geometry.dispose();
  projectile.material.dispose();
}

/**
 * Check if projectile collides with a player
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {THREE.Vector3} playerPos - Player position
 * @param {number} playerSize - Player size
 * @param {string} playerId - Player ID to check against
 * @returns {Object} Collision result with hit, damage, and projectile info
 */
export function checkProjectileCollision(projectile, playerPos, playerSize, playerId) {
  // Don't hit yourself or if already hit something
  if (projectile.userData.playerId === playerId || projectile.userData.hasHit) {
    return { hit: false };
  }
  
  const halfSize = playerSize / 2;
  const playerBox = new THREE.Box3(
    new THREE.Vector3(playerPos.x - halfSize, playerPos.y - 0.5, playerPos.z - halfSize),
    new THREE.Vector3(playerPos.x + halfSize, playerPos.y + 1.5, playerPos.z + halfSize)
  );
  
  const projectileBox = new THREE.Box3().setFromObject(projectile);
  if (playerBox.intersectsBox(projectileBox)) {
    // Mark as hit to prevent multiple damage applications
    projectile.userData.hasHit = true;
    const damage = projectile.userData.damage;
    return { hit: true, damage: damage, projectile: projectile };
  }
  
  return { hit: false };
}

