/**
 * BoltSpeedCalculation.js
 * 
 * Handles speed calculation for bolt projectiles.
 * Extracted from BoltUpdate.js for better organization.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { BOLT_ATTACK_CONFIG } from '../../../../../config/abilities/base/BoltAttackConfig.js';
import { calculateSpeed2D } from '../utils/VectorUtils.js';
import { getBoltStats } from '../CharacterAbilityStats.js';

/**
 * Update projectile speed based on character type
 * @param {THREE.Mesh} projectile - Projectile mesh
 * @param {Object} camera - THREE.js camera
 * @param {Object} inputManager - Input manager
 * @param {Object} playerPosition - Player position vector
 */
export function updateSpeed(projectile, camera, inputManager, playerPosition) {
  // Skip speed calculation for remote projectiles (they use synced velocity)
  if (projectile.userData.playerId !== 'local') {
    return;
  }
  
  let targetSpeed;
  
  // Get character-specific joystick speed multiplier config
  const characterName = projectile.userData.characterName || 'lucy';
  const boltStats = getBoltStats(characterName);
  const joystickConfig = boltStats?.joystickSpeedMultiplier || {};
  
  // Speed scaling range for joystick control (from config, with fallback defaults)
  const MIN_SPEED_MULTIPLIER = joystickConfig.minSpeedMultiplier ?? 0.7;
  const MAX_SPEED_MULTIPLIER = joystickConfig.maxSpeedMultiplier ?? 1.5;
  
  // Check if using controller with joystick input for all characters
  // Use live joystick magnitude for real-time speed control
  if (inputManager && inputManager.getInputMode() === 'controller') {
    // Use current joystick magnitude for live speed control
    // Speed updates in real-time as you adjust the joystick
    const joystickMagnitude = inputManager.getRightJoystickMagnitude();
    
    if (joystickMagnitude > 0.01) {
      // Controller mode: Speed scales with joystick magnitude
      // Further joystick push = faster bolt
      const speedMultiplier = MIN_SPEED_MULTIPLIER + (joystickMagnitude * (MAX_SPEED_MULTIPLIER - MIN_SPEED_MULTIPLIER));
      
      if (projectile.userData.characterName === 'herald') {
        // Herald: Use existing acceleration pattern which already accounts for joystick
        // The existing system uses minSpeed + (speedRange * joystickMagnitude)
        // So we just use that directly without additional scaling
        targetSpeed = calculateHeraldSpeed(projectile, camera, inputManager, playerPosition);
      } else {
        // Other characters (Lucy, etc.): Scale base speed by joystick magnitude from config
        targetSpeed = projectile.userData.baseSpeed * speedMultiplier;
      }
    } else {
      // Joystick not pushed or too small - use minimum speed from config
      if (projectile.userData.characterName === 'herald') {
        // Herald: Use minimum speed from existing system
        targetSpeed = projectile.userData.startSpeed;
      } else {
        // Other characters: Use minimum speed multiplier from config
        targetSpeed = projectile.userData.baseSpeed * MIN_SPEED_MULTIPLIER;
      }
    }
  } else if (projectile.userData.characterName === 'herald' && inputManager) {
    // Herald: Speed controlled by input method (keyboard/mouse)
    targetSpeed = calculateHeraldSpeed(projectile, camera, inputManager, playerPosition);
  } else {
    // Default: Use base speed (keyboard/mouse for non-Herald characters)
    targetSpeed = projectile.userData.baseSpeed;
  }
  
  // Get current velocity direction (may have been modified by cursor following)
  const currentVelocityX = projectile.userData.velocityX;
  const currentVelocityZ = projectile.userData.velocityZ;
  const currentVelocityLength = calculateSpeed2D(currentVelocityX, currentVelocityZ);
  
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
  
  // Map distance to speed (normalize to 0-1 range)
  const maxDistance = BOLT_ATTACK_CONFIG.cursorFollow.maxCursorDistance;
  const normalizedDistance = Math.min(cursorDistance / maxDistance, 1.0);
  
  // Further cursor = faster speed
  return minSpeed + (speedRange * normalizedDistance);
}

