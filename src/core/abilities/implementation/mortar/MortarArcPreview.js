/**
 * MortarArcPreview.js
 * 
 * Handles visual preview of mortar trajectory arc.
 * Shows predicted path when aiming with right joystick.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getMortarStats } from '../CharacterAbilityStats.js';
import { MORTAR_ATTACK_CONFIG } from '../../config/base/MortarAttackConfig.js';
import { MORTAR_GRAVITY } from './BaseMortar.js';

// Get arc preview settings from config
const ARC_CONFIG = MORTAR_ATTACK_CONFIG.arcPreview;
const ARC_TUBE_RADIUS = ARC_CONFIG.tubeRadius;
const ARC_COLOR = ARC_CONFIG.color;
const ARC_OPACITY = ARC_CONFIG.opacity;
const ARC_POINTS = ARC_CONFIG.points;
const ARC_TUBE_SEGMENTS = ARC_CONFIG.tubeSegments;

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
function calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, numPoints = ARC_POINTS) {
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
 * @returns {THREE.Mesh|null} Tube mesh representing the arc preview, or null if too few points
 */
export function createMortarArcPreview(scene, startX, startY, startZ, targetX, targetZ, characterName, collisionManager = null) {
  // Calculate trajectory points
  const points = calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, ARC_POINTS);
  
  // Ensure we have enough points (CatmullRomCurve3 needs at least 4 points)
  if (points.length < 4) {
    // If too few points, return null to indicate preview cannot be created
    return null;
  }
  
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
  
  // Create curve from points
  const curve = new THREE.CatmullRomCurve3(points);
  
  // Create tube geometry along the curve
  const tubeGeometry = new THREE.TubeGeometry(curve, ARC_POINTS, ARC_TUBE_RADIUS, ARC_TUBE_SEGMENTS, false);
  
  // Create material with grey/white color, opacity, and blur effect
  const material = new THREE.MeshBasicMaterial({
    color: ARC_COLOR,
    transparent: true,
    opacity: ARC_OPACITY,
    depthWrite: false, // Allow transparency blending
    blending: THREE.AdditiveBlending, // Additive blending for glow effect
    side: THREE.DoubleSide
  });
  
  // Create tube mesh
  const arcTube = new THREE.Mesh(tubeGeometry, material);
  
  // Store metadata and references for smooth updates
  arcTube.userData = {
    type: 'mortarArcPreview',
    characterName: characterName,
    curve: curve, // Store curve reference for updates
    geometry: tubeGeometry // Store geometry reference
  };
  
  return arcTube;
}

/**
 * Update mortar arc preview position
 * Optimized for smooth updates by reusing geometry buffers
 * @param {THREE.Mesh} arcTube - Arc preview tube mesh object
 * @param {number} startX - Starting X position
 * @param {number} startY - Starting Y position
 * @param {number} startZ - Starting Z position
 * @param {number} targetX - Target X position
 * @param {number} targetZ - Target Z position
 * @param {string} characterName - Character name
 * @param {Object} collisionManager - Collision manager for ground height checks
 * @returns {boolean} True if update was successful, false if too few points
 */
export function updateMortarArcPreview(arcTube, startX, startY, startZ, targetX, targetZ, characterName, collisionManager = null) {
  // Recalculate trajectory points
  const points = calculateTrajectoryPoints(startX, startY, startZ, targetX, targetZ, characterName, ARC_POINTS);
  
  // Ensure we have enough points (CatmullRomCurve3 needs at least 4 points)
  if (points.length < 4) {
    // If too few points, return false to indicate update failed
    return false;
  }
  
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
  
  // Always create a new curve from fresh points to avoid undefined point issues
  const curve = new THREE.CatmullRomCurve3(points.map(p => p.clone()));
  
  // Store old geometry for disposal
  const oldGeometry = arcTube.geometry;
  
  // Create new geometry with updated curve
  const newGeometry = new THREE.TubeGeometry(curve, ARC_POINTS, ARC_TUBE_RADIUS, ARC_TUBE_SEGMENTS, false);
  
  // Replace geometry (this is faster than removing/adding to scene)
  arcTube.geometry = newGeometry;
  
  // Update userData with new curve reference
  arcTube.userData.curve = curve;
  
  // Dispose old geometry asynchronously to avoid frame drops
  if (oldGeometry && oldGeometry !== newGeometry) {
    // Use requestAnimationFrame to defer disposal until next frame
    requestAnimationFrame(() => {
      if (oldGeometry && oldGeometry !== arcTube.geometry) {
        oldGeometry.dispose();
      }
    });
  }
  
  // Update userData if character changed (though color stays grey/white)
  if (arcTube.userData.characterName !== characterName) {
    arcTube.userData.characterName = characterName;
  }
  
  return true; // Indicate successful update
}

/**
 * Remove mortar arc preview from scene
 * @param {THREE.Mesh} arcTube - Arc preview tube mesh object
 * @param {Object} scene - THREE.js scene
 */
export function removeMortarArcPreview(arcTube, scene) {
  if (arcTube && arcTube.geometry) {
    arcTube.geometry.dispose();
  }
  if (arcTube && arcTube.material) {
    arcTube.material.dispose();
  }
  if (scene && arcTube) {
    scene.remove(arcTube);
  }
}

