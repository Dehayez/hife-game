/**
 * MortarArcPreview.js
 * 
 * Handles visual preview of mortar trajectory arc.
 * Shows predicted path when aiming with right joystick.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getMortarStats, getCharacterColor } from './CharacterStats.js';

// Use same physics constants as Mortar.js
const MORTAR_GRAVITY = -20; // Gravity for arc trajectory

/**
 * Calculate trajectory points for arc preview
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position (character height)
 * @param {number} startZ - Starting Z position
 * @param {number} targetX - Target X position
 * @param {number} targetZ - Target Z position
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {number} numPoints - Number of points to generate for the arc (default: 50)
 * @returns {Array<THREE.Vector3>} Array of points along the trajectory
 */
function calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, numPoints = 50) {
  const stats = getMortarStats(characterName);
  
  // Calculate horizontal distance
  const dx = targetX - startX;
  const dz = targetZ - startZ;
  const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
  
  if (horizontalDistance < 0.1) {
    // Too close, return single point
    return [new THREE.Vector3(startX, startY, startZ)];
  }
  
  // Calculate trajectory physics (same as Mortar.js)
  const gravity = Math.abs(MORTAR_GRAVITY);
  const timeToPeak = Math.sqrt(2 * stats.arcHeight / gravity);
  const totalTime = timeToPeak * 2; // Time to go up and down
  const horizontalSpeed = horizontalDistance / totalTime;
  const verticalSpeed = gravity * timeToPeak; // Initial vertical velocity
  
  const launchVelocityX = (dx / horizontalDistance) * horizontalSpeed;
  const launchVelocityZ = (dz / horizontalDistance) * horizontalSpeed;
  const launchVelocityY = verticalSpeed;
  
  // Generate points along trajectory
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = (i / numPoints) * totalTime;
    
    // Calculate position at time t
    const x = startX + launchVelocityX * t;
    const y = startY + launchVelocityY * t + 0.5 * MORTAR_GRAVITY * t * t;
    const z = startZ + launchVelocityZ * t;
    
    points.push(new THREE.Vector3(x, y, z));
  }
  
  return points;
}

/**
 * Create mortar arc preview visualization
 * @param {Object} scene - THREE.js scene
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} startZ - Starting Z position
 * @param {number} targetX - Target X position
 * @param {number} targetZ - Target Z position
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {THREE.Line} Line object representing the arc preview
 */
export function createMortarArcPreview(scene, startX, startY, startZ, targetX, targetZ, characterName, collisionManager = null) {
  // Get character color
  const characterColor = getCharacterColor(characterName);
  
  // Calculate trajectory points
  const points = calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, 50);
  
  // Adjust points to ground height if collision manager available
  if (collisionManager) {
    for (const point of points) {
      const groundHeight = collisionManager.getGroundHeight(point.x, point.z, 0.1);
      // Don't go below ground
      if (point.y < groundHeight) {
        point.y = groundHeight;
      }
    }
  }
  
  // Create geometry from points
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Create material with character color
  const material = new THREE.LineBasicMaterial({
    color: characterColor,
    linewidth: 2,
    transparent: true,
    opacity: 0.7
  });
  
  // Create line
  const arcLine = new THREE.Line(geometry, material);
  
  // Store metadata
  arcLine.userData = {
    type: 'mortarArcPreview',
    characterName: characterName,
    characterColor: characterColor
  };
  
  return arcLine;
}

/**
 * Update mortar arc preview position
 * @param {THREE.Line} arcLine - Arc preview line object
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} startZ - Starting Z position
 * @param {number} targetX - Target X position
 * @param {number} targetZ - Target Z position
 * @param {string} characterName - Character name
 * @param {Object} collisionManager - Collision manager for ground height checks
 */
export function updateMortarArcPreview(arcLine, startX, startY, startZ, targetX, targetZ, characterName, collisionManager = null) {
  // Recalculate trajectory points
  const points = calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, 50);
  
  // Adjust points to ground height if collision manager available
  if (collisionManager) {
    for (const point of points) {
      const groundHeight = collisionManager.getGroundHeight(point.x, point.z, 0.1);
      // Don't go below ground
      if (point.y < groundHeight) {
        point.y = groundHeight;
      }
    }
  }
  
  // Update geometry
  arcLine.geometry.dispose();
  arcLine.geometry = new THREE.BufferGeometry().setFromPoints(points);
  
  // Update userData if character changed
  if (arcLine.userData.characterName !== characterName) {
    arcLine.userData.characterName = characterName;
    // Update color if character changed
    const characterColor = getCharacterColor(characterName);
    arcLine.userData.characterColor = characterColor;
    arcLine.material.color.setHex(characterColor);
  }
}

/**
 * Remove mortar arc preview from scene
 * @param {THREE.Line} arcLine - Arc preview line object
 * @param {Object} scene - THREE.js scene
 */
export function removeMortarArcPreview(arcLine, scene) {
  if (arcLine && arcLine.geometry) {
    arcLine.geometry.dispose();
  }
  if (arcLine && arcLine.material) {
    arcLine.material.dispose();
  }
  if (scene && arcLine) {
    scene.remove(arcLine);
  }
}

