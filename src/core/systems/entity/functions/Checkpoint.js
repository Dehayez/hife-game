/**
 * Checkpoint.js
 * 
 * Handles checkpoint (shrine) creation, activation, and updates.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getCheckpointStats } from '../config/EntityStats.js';

/**
 * Create a checkpoint (shrine)
 * @param {Object} scene - THREE.js scene
 * @param {number} x - X position
 * @param {number} z - Z position
 * @param {string} id - Unique identifier
 * @returns {THREE.Group} Created checkpoint group
 */
export function createCheckpoint(scene, x, z, id) {
  const stats = getCheckpointStats();
  
  // Create magical crystal shrine - mystical pillar with crystal top
  const group = new THREE.Group();
  
  // Base pillar - stone with mystical runes
  const pillarGeo = new THREE.CylinderGeometry(
    stats.pillarRadiusTop, 
    stats.pillarRadiusBottom, 
    stats.pillarHeight, 
    stats.pillarSegments
  );
  const pillarMat = new THREE.MeshStandardMaterial({ 
    color: stats.pillarColor,
    emissive: stats.pillarEmissive,
    emissiveIntensity: stats.pillarEmissiveIntensity,
    metalness: stats.pillarMetalness,
    roughness: stats.pillarRoughness
  });
  const pillar = new THREE.Mesh(pillarGeo, pillarMat);
  pillar.position.y = stats.pillarHeight * 0.5;
  pillar.castShadow = true;
  pillar.receiveShadow = true;
  group.add(pillar);
  
  // Crystal top - glowing magical crystal
  const crystalGeo = new THREE.OctahedronGeometry(stats.crystalSize, stats.crystalDetail);
  const crystalMat = new THREE.MeshStandardMaterial({ 
    color: stats.crystalColor,
    emissive: stats.crystalEmissive,
    emissiveIntensity: stats.crystalEmissiveIntensity,
    metalness: stats.crystalMetalness,
    roughness: stats.crystalRoughness,
    transparent: true,
    opacity: stats.crystalOpacity
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.y = stats.pillarHeight + stats.crystalSize * 0.7;
  crystal.castShadow = true;
  crystal.receiveShadow = true;
  group.add(crystal);
  
  // Magical energy ring around crystal
  const ringGeo = new THREE.TorusGeometry(
    stats.ringRadius, 
    stats.ringTube, 
    stats.ringSegments, 
    stats.ringTubularSegments
  );
  const ringMat = new THREE.MeshStandardMaterial({ 
    color: stats.ringColor,
    emissive: stats.ringEmissive,
    emissiveIntensity: stats.ringEmissiveIntensity,
    metalness: stats.ringMetalness,
    roughness: stats.ringRoughness
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.position.y = stats.pillarHeight;
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  ring.receiveShadow = true;
  group.add(ring);
  
  group.position.set(x, 0, z);
  group.castShadow = true;
  group.receiveShadow = true;
  
  // Add mystical glow light
  const shrineLight = new THREE.PointLight(
    stats.lightColor,
    stats.lightIntensity,
    stats.lightRange
  );
  shrineLight.position.set(x, stats.lightHeight, z);
  scene.add(shrineLight);
  
  group.userData = { 
    type: 'checkpoint', 
    id, 
    activated: false, 
    glowLight: shrineLight, 
    crystal: crystal, 
    ring: ring 
  };
  
  scene.add(group);
  return group;
}

/**
 * Activate a checkpoint
 * @param {THREE.Group} checkpoint - Checkpoint group
 * @returns {boolean} True if checkpoint was activated
 */
export function activateCheckpoint(checkpoint) {
  if (checkpoint.userData.activated) return false;
  
  checkpoint.userData.activated = true;
  const stats = getCheckpointStats();
  
  // Activate shrine - brighten crystal and ring
  if (checkpoint.userData.crystal) {
    checkpoint.userData.crystal.material.color.setHex(stats.activatedCrystalColor);
    checkpoint.userData.crystal.material.emissive.setHex(stats.activatedCrystalEmissive);
    checkpoint.userData.crystal.material.emissiveIntensity = stats.activatedCrystalEmissiveIntensity;
  }
  
  if (checkpoint.userData.ring) {
    checkpoint.userData.ring.material.color.setHex(stats.activatedRingColor);
    checkpoint.userData.ring.material.emissive.setHex(stats.activatedRingEmissive);
    checkpoint.userData.ring.material.emissiveIntensity = stats.activatedRingEmissiveIntensity;
  }
  
  // Brighten glow light
  if (checkpoint.userData.glowLight) {
    checkpoint.userData.glowLight.color.setHex(stats.activatedLightColor);
    checkpoint.userData.glowLight.intensity = stats.activatedLightIntensity;
  }
  
  return true;
}

/**
 * Update checkpoint animation (rotating ring)
 * @param {THREE.Group} checkpoint - Checkpoint group
 * @param {number} dt - Delta time in seconds
 */
export function updateCheckpoint(checkpoint, dt) {
  if (checkpoint.userData.ring) {
    // Rotate ring slowly
    checkpoint.userData.ring.rotation.z += dt * 2;
  }
  
  if (checkpoint.userData.crystal) {
    // Pulse crystal slightly
    const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.1;
    checkpoint.userData.crystal.scale.set(pulse, pulse, pulse);
  }
}

