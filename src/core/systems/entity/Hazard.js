/**
 * Hazard.js
 * 
 * Handles hazard (thorn) creation, movement, and updates.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getHazardStats } from '../../../config/entity/EntityStats.js';
import { getGeometryPool } from '../abilities/functions/utils/GeometryPool.js';

/**
 * Create a hazard (thorn cluster)
 * @param {Object} scene - THREE.js scene
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {string} id - Unique identifier
 * @param {number} size - Hazard size (default uses stats defaultSize)
 * @returns {THREE.Group} Created hazard group
 */
export function createHazard(scene, x, z, id, size = null) {
  const stats = getHazardStats();
  const hazardSize = size || stats.defaultSize;
  
  // Create cursed thorn cluster - dark mystical thorn formation
  const group = new THREE.Group();
  
  // Use geometry pool for optimization
  const pool = getGeometryPool();
  
  // Main thorn body - dark purple/black with spikes
  // ConeGeometry: radius, height, radialSegments
  const mainRadius = hazardSize * stats.mainBodySize;
  const mainGeo = pool.acquireCone(mainRadius, stats.mainBodyHeight, 6);
  const mainMat = new THREE.MeshStandardMaterial({ 
    color: stats.mainColor,
    emissive: stats.mainEmissive,
    emissiveIntensity: stats.mainEmissiveIntensity,
    metalness: stats.metalness,
    roughness: stats.roughness
  });
  const mainMesh = new THREE.Mesh(mainGeo, mainMat);
  mainMesh.position.y = stats.mainBodyHeight * 0.5;
  group.add(mainMesh);
  
  // Add spike thorns around the base
  for (let i = 0; i < stats.spikeCount; i++) {
    // Use geometry pool for optimization
    const spikeRadius = hazardSize * stats.spikeSize;
    const spikeGeo = pool.acquireCone(spikeRadius, stats.spikeHeight, 4);
    const spikeMat = new THREE.MeshStandardMaterial({ 
      color: stats.spikeColor,
      emissive: stats.spikeEmissive,
      emissiveIntensity: stats.spikeEmissiveIntensity,
      metalness: stats.metalness,
      roughness: stats.roughness
    });
    const spike = new THREE.Mesh(spikeGeo, spikeMat);
    const angle = (i / stats.spikeCount) * Math.PI * 2;
    spike.position.set(
      Math.cos(angle) * hazardSize * 0.4,
      stats.spikeHeight * 0.5,
      Math.sin(angle) * hazardSize * 0.4
    );
    spike.rotation.x = -0.5;
    spike.rotation.z = angle;
    group.add(spike);
  }
  
  group.position.set(x, 0, z); // Position on ground
  group.castShadow = true;
  group.receiveShadow = true;
  
  // Add movement properties for random movement
  const speed = stats.minSpeed + Math.random() * (stats.maxSpeed - stats.minSpeed);
  const direction = Math.random() * Math.PI * 2;
  const changeDirectionInterval = stats.directionChangeMin + Math.random() * (stats.directionChangeMax - stats.directionChangeMin);
  
  group.userData = { 
    type: 'hazard', 
    id, 
    active: true,
    speed: speed,
    direction: direction,
    changeDirectionTimer: 0,
    changeDirectionInterval: changeDirectionInterval,
    size: hazardSize
  };
  
  scene.add(group);
  return group;
}

/**
 * Update hazard movement
 * @param {THREE.Group} hazard - Hazard group
 * @param {number} dt - Delta time in seconds
 * @param {Object} collisionManager - Collision manager for wall checks
 * @param {number} arenaSize - Arena size
 */
export function updateHazard(hazard, dt, collisionManager, arenaSize) {
  if (!hazard.userData.active) return;
  
  const stats = getHazardStats();
  const userData = hazard.userData;
  
  // Update direction change timer
  userData.changeDirectionTimer += dt;
  if (userData.changeDirectionTimer >= userData.changeDirectionInterval) {
    // Change to random direction
    userData.direction = Math.random() * Math.PI * 2;
    userData.changeDirectionTimer = 0;
    userData.changeDirectionInterval = stats.directionChangeMin + Math.random() * (stats.directionChangeMax - stats.directionChangeMin);
  }
  
  // Move hazard
  const moveX = Math.cos(userData.direction) * userData.speed * dt;
  const moveZ = Math.sin(userData.direction) * userData.speed * dt;
  
  // Check collision with walls
  const newX = hazard.position.x + moveX;
  const newZ = hazard.position.z + moveZ;
  const nextPos = new THREE.Vector3(newX, hazard.position.y, newZ);
  
  const halfArena = arenaSize / 2;
  let hitWall = false;
  
  if (collisionManager) {
    // Use collision manager if available
    if (collisionManager.willCollide(nextPos, userData.size)) {
      hitWall = true;
    }
  } else {
    // Simple bounds check
    if (Math.abs(newX) > halfArena || Math.abs(newZ) > halfArena) {
      hitWall = true;
    }
  }
  
  if (hitWall) {
    // Bounce off wall - reverse direction with slight random variation
    userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
  } else {
    // Update position
    hazard.position.x = newX;
    hazard.position.z = newZ;
  }
}

