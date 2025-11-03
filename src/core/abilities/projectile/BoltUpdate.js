/**
 * BoltUpdate.js
 * 
 * Handles update logic for bolt projectiles including cursor tracking,
 * speed calculation, and position updates.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getBoltStats } from '../stats/CharacterStats.js';

/**
 * Update bolt position and check lifetime
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @param {Object} camera - THREE.js camera (optional, for cursor tracking)
 * @param {Object} inputManager - Input manager (optional, for cursor tracking)
 * @param {Object} playerPosition - Player position vector (optional, for cursor tracking)
 * @returns {boolean} True if projectile should be removed
 */
export function updateBolt(projectile, dt, collisionManager, camera = null, inputManager = null, playerPosition = null) {
  // Update lifetime
  projectile.userData.lifetime += dt;
  
  // Remove if lifetime exceeded
  if (projectile.userData.lifetime >= projectile.userData.maxLifetime) {
    return true;
  }
  
  // Track cursor/joystick target if enabled
  updateCursorTracking(projectile, camera, inputManager, playerPosition);
  
  // Apply cursor following if target is set
  applyCursorFollowing(projectile, dt);
  
  // Calculate and apply speed based on character type
  updateSpeed(projectile, camera, inputManager, playerPosition);
  
  // Update position and check collisions
  const shouldRemove = updatePosition(projectile, dt, collisionManager, playerPosition);
  
  // Update visual effects
  updateVisualEffects(projectile, dt);
  
  return shouldRemove;
}

/**
 * Track cursor/joystick target position
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 */
function updateCursorTracking(projectile, camera, inputManager, playerPosition) {
  const followStrength = projectile.userData.cursorFollowStrength || 0;
  let targetX = projectile.userData.targetX;
  let targetZ = projectile.userData.targetZ;
  
  if (followStrength <= 0 || !inputManager || !playerPosition) {
    return;
  }
  
  // Check if right joystick is actively pushed for aiming
  const rightJoystickDir = inputManager.getRightJoystickDirection();
  const isRightJoystickPushed = inputManager.isRightJoystickPushed();
  
  // Prioritize right joystick for aiming (smooth 360-degree aiming in world space)
  if (isRightJoystickPushed && (rightJoystickDir.x !== 0 || rightJoystickDir.z !== 0) && camera) {
    const joystickTarget = getJoystickTarget(camera, playerPosition, rightJoystickDir);
    if (joystickTarget) {
      projectile.userData.targetX = joystickTarget.x;
      projectile.userData.targetZ = joystickTarget.z;
      return;
    }
  }
  
  // Fallback to mouse/cursor tracking (only if projectile was created with a target)
  if (camera && targetX !== null && targetZ !== null) {
    const mouseTarget = getMouseTarget(camera, inputManager, playerPosition, projectile);
    if (mouseTarget) {
      projectile.userData.targetX = mouseTarget.x;
      projectile.userData.targetZ = mouseTarget.z;
    }
  }
}

/**
 * Get target position from joystick input
 * @param {Object} camera - THREE.js camera
 * @param {Object} playerPosition - Player position vector
 * @param {Object} rightJoystickDir - Right joystick direction
 * @returns {Object|null} Target position {x, z} or null
 */
function getJoystickTarget(camera, playerPosition, rightJoystickDir) {
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
  if (dirLength <= 0.001) {
    return null;
  }
  
  directionX /= dirLength;
  directionZ /= dirLength;
  
  // Calculate target point continuously based on current joystick position
  const targetDistance = 20; // Distance ahead to aim
  return {
    x: playerPosition.x + directionX * targetDistance,
    z: playerPosition.z + directionZ * targetDistance
  };
}

/**
 * Get target position from mouse cursor
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @returns {Object|null} Target position {x, z} or null
 */
function getMouseTarget(camera, inputManager, playerPosition, projectile) {
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
  
  if (initialDirX === undefined || initialDirZ === undefined) {
    return null;
  }
  
  // Calculate vector from player to cursor
  const toCursorX = intersect.x - playerPosition.x;
  const toCursorZ = intersect.z - playerPosition.z;
  const toCursorLength = Math.sqrt(toCursorX * toCursorX + toCursorZ * toCursorZ);
  
  if (toCursorLength <= 0.01) {
    return null;
  }
  
  // Normalize cursor direction from player
  const cursorDirX = toCursorX / toCursorLength;
  const cursorDirZ = toCursorZ / toCursorLength;
  
  // Calculate dot product to check if cursor is ahead along shooting direction
  const dotProduct = initialDirX * cursorDirX + initialDirZ * cursorDirZ;
  
  // If cursor is ahead (forward) along the shooting direction line, use it as target
  if (dotProduct <= 0) {
    return null;
  }
  
  // Project cursor position onto the shooting direction line
  const cursorProjDist = toCursorLength * dotProduct;
  
  // Calculate distance from player to projectile along shooting direction
  const projectileFromPlayerX = projectile.position.x - playerPosition.x;
  const projectileFromPlayerZ = projectile.position.z - playerPosition.z;
  const projectileDistFromPlayer = Math.sqrt(
    projectileFromPlayerX * projectileFromPlayerX +
    projectileFromPlayerZ * projectileFromPlayerZ
  );
  
  // Project projectile position onto shooting direction line
  if (projectileDistFromPlayer <= 0.01) {
    return null;
  }
  
  const projDirX = projectileFromPlayerX / projectileDistFromPlayer;
  const projDirZ = projectileFromPlayerZ / projectileDistFromPlayer;
  const projDotProduct = initialDirX * projDirX + initialDirZ * projDirZ;
  const projectileProjDist = projectileDistFromPlayer * Math.max(0, projDotProduct);
  
  // If cursor projection is further along the shooting direction line than projectile, follow it
  if (cursorProjDist > projectileProjDist) {
    return {
      x: intersect.x,
      z: intersect.z
    };
  }
  
  return null;
}

/**
 * Apply cursor following to projectile velocity
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 */
function applyCursorFollowing(projectile, dt) {
  const followStrength = projectile.userData.cursorFollowStrength || 0;
  const targetX = projectile.userData.targetX;
  const targetZ = projectile.userData.targetZ;
  
  if (followStrength <= 0 || targetX === null || targetZ === null) {
    return;
  }
  
  // Calculate direction to target
  const toTargetX = targetX - projectile.position.x;
  const toTargetZ = targetZ - projectile.position.z;
  const toTargetLength = Math.sqrt(toTargetX * toTargetX + toTargetZ * toTargetZ);
  
  if (toTargetLength <= 0.01) {
    return;
  }
  
  // Normalize target direction
  const targetDirX = toTargetX / toTargetLength;
  const targetDirZ = toTargetZ / toTargetLength;
  
  // Interpolate between current velocity direction and target direction
  const stats = getBoltStats(projectile.userData.characterName);
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

/**
 * Update projectile speed based on character type
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 */
function updateSpeed(projectile, camera, inputManager, playerPosition) {
  let targetSpeed;
  
  if (projectile.userData.characterName === 'herald' && inputManager) {
    // Herald: Speed controlled by input method (can only increase, never decrease)
    targetSpeed = calculateHeraldSpeed(projectile, camera, inputManager, playerPosition);
  } else {
    // Lucy: Fixed speed or deceleration pattern (no joystick control)
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
}

/**
 * Calculate speed for Herald character based on input method
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 * @returns {number} Target speed
 */
function calculateHeraldSpeed(projectile, camera, inputManager, playerPosition) {
  const minSpeed = projectile.userData.startSpeed;
  const maxSpeed = projectile.userData.endSpeed;
  const speedRange = maxSpeed - minSpeed;
  
  let calculatedSpeed = minSpeed;
  
  // Check if using gamepad (joystick control)
  const joystickMagnitude = inputManager.getRightJoystickMagnitude();
  if (joystickMagnitude > 0.01 && inputManager.getInputMode() === 'controller') {
    // Gamepad: Speed controlled by right joystick magnitude
    calculatedSpeed = minSpeed + (speedRange * joystickMagnitude);
  } else if (camera && playerPosition && inputManager.getInputMode() === 'keyboard') {
    // Keyboard/Mouse: Speed controlled by cursor distance from player
    calculatedSpeed = calculateSpeedFromCursorDistance(camera, inputManager, playerPosition, minSpeed, speedRange);
  }
  
  // Speed can only increase, never decrease
  if (calculatedSpeed > projectile.userData.currentMaxSpeed) {
    projectile.userData.currentMaxSpeed = calculatedSpeed;
  }
  
  return projectile.userData.currentMaxSpeed;
}

/**
 * Calculate speed based on cursor distance from player
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 * @param {number} minSpeed - Minimum speed
 * @param {number} speedRange - Speed range
 * @returns {number} Calculated speed
 */
function calculateSpeedFromCursorDistance(camera, inputManager, playerPosition, minSpeed, speedRange) {
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
  return minSpeed + (speedRange * normalizedDistance);
}

/**
 * Update projectile position and check collisions
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager
 * @param {Object} playerPosition - Player position vector (for fallback Y calculation)
 * @returns {boolean} True if projectile should be removed
 */
function updatePosition(projectile, dt, collisionManager, playerPosition) {
  // Calculate new position
  const newX = projectile.position.x + projectile.userData.velocityX * dt;
  const newZ = projectile.position.z + projectile.userData.velocityZ * dt;
  
  // Update Y position to track shooter's height
  let newY = projectile.position.y;
  if (projectile.userData.shooterY !== undefined) {
    newY = projectile.userData.shooterY;
  } else if (playerPosition) {
    newY = playerPosition.y;
  }
  
  // Check collision with walls
  let shouldRemove = false;
  if (collisionManager) {
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
  
  return shouldRemove;
}

/**
 * Update visual effects (trail light and rotation)
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {number} dt - Delta time in seconds
 */
function updateVisualEffects(projectile, dt) {
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
}

