/**
 * BoltCursorTracking.js
 * 
 * Handles cursor/joystick tracking for bolt projectiles.
 * Extracted from BoltUpdate.js for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';
import { GENERAL_ABILITY_CONFIG } from '../../../../../config/abilities/base/MeleeAttackConfig.js';
import { normalize2D, distance2D, dot2D } from '../utils/VectorUtils.js';

/**
 * Track cursor/joystick target position
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 */
export function updateCursorTracking(projectile, camera, inputManager, playerPosition) {
  const followStrength = projectile.userData.cursorFollowStrength || 0;
  
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
  const targetX = projectile.userData.targetX;
  const targetZ = projectile.userData.targetZ;
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
  const normalized = normalize2D(directionX, directionZ, GENERAL_ABILITY_CONFIG.minDistance.directionLength);
  if (!normalized) {
    return null;
  }
  
  // Calculate target point continuously based on current joystick position
  const targetDistance = BOLT_ATTACK_CONFIG.cursorFollow.targetDistance;
  return {
    x: playerPosition.x + normalized.x * targetDistance,
    z: playerPosition.z + normalized.z * targetDistance
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
  const toCursorLength = distance2D(playerPosition.x, playerPosition.z, intersect.x, intersect.z);
  
  if (toCursorLength <= GENERAL_ABILITY_CONFIG.minDistance.targetDistance) {
    return null;
  }
  
  // Normalize cursor direction from player
  const cursorDirX = toCursorX / toCursorLength;
  const cursorDirZ = toCursorZ / toCursorLength;
  
  // Calculate dot product to check if cursor is ahead along shooting direction
  const dotProduct = dot2D(initialDirX, initialDirZ, cursorDirX, cursorDirZ);
  
  // If cursor is ahead (forward) along the shooting direction line, use it as target
  if (dotProduct <= 0) {
    return null;
  }
  
  // Project cursor position onto the shooting direction line
  const cursorProjDist = toCursorLength * dotProduct;
  
  // Calculate distance from player to projectile along shooting direction
  const projectileFromPlayerX = projectile.position.x - playerPosition.x;
  const projectileFromPlayerZ = projectile.position.z - playerPosition.z;
  const projectileDistFromPlayer = distance2D(
    playerPosition.x,
    playerPosition.z,
    projectile.position.x,
    projectile.position.z
  );
  
  // Project projectile position onto shooting direction line
  if (projectileDistFromPlayer <= GENERAL_ABILITY_CONFIG.minDistance.projectileDistance) {
    return null;
  }
  
  const projDirX = projectileFromPlayerX / projectileDistFromPlayer;
  const projDirZ = projectileFromPlayerZ / projectileDistFromPlayer;
  const projDotProduct = dot2D(initialDirX, initialDirZ, projDirX, projDirZ);
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

