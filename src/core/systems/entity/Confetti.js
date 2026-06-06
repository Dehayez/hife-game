/**
 * Confetti.js
 * 
 * Handles confetti burst effects when items are collected.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getConfettiStats } from '../../../config/entity/EntityStats.js';

let sharedConfettiTexture = null;

function getSharedConfettiTexture() {
  if (sharedConfettiTexture) {
    return sharedConfettiTexture;
  }

  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d');
  context.fillStyle = 'rgba(255,255,255,1)';
  context.fillRect(4, 2, 8, 12);

  sharedConfettiTexture = new THREE.CanvasTexture(canvas);
  return sharedConfettiTexture;
}

/**
 * Create a confetti burst effect
 * @param {Object} scene - THREE.js scene
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} z - Z position
 * @returns {Object} Confetti effect object
 */
export function createConfettiBurst(scene, x, y, z, options = {}) {
  const stats = getConfettiStats();
  const firstPerson = !!options.firstPerson;
  const aroundPlayer = !!options.aroundPlayer;
  const spreadRadius = options.spreadRadius || (firstPerson ? 0.7 : 0.9);
  const spreadHeight = options.spreadHeight || (firstPerson ? 1.0 : 1.2);
  const particleCount = firstPerson
    ? Math.max(8, Math.round(stats.particleCount * 0.45))
    : stats.particleCount;
  const particleSize = firstPerson ? stats.particleSize * 0.72 : stats.particleSize;
  const lifetimeScale = firstPerson ? 0.7 : 1;
  const verticalBoost = firstPerson ? 1.2 : 1;
  
  // Create confetti particles bursting outward from position
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = [];
  const lifetimes = [];
  
  // Convert color to normalized RGB
  const color = stats.color;
  const r = ((color >> 16) & 0xff) / 255;
  const g = ((color >> 8) & 0xff) / 255;
  const b = (color & 0xff) / 255;
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;

    // Spawn from a shell around the player body (or exact point fallback).
    const shellAngle = Math.random() * Math.PI * 2;
    const shellRadius = aroundPlayer ? (0.2 + Math.random() * spreadRadius) : 0;
    const shellHeight = aroundPlayer ? ((Math.random() - 0.25) * spreadHeight) : 0;
    const startX = x + Math.cos(shellAngle) * shellRadius;
    const startY = y + shellHeight;
    const startZ = z + Math.sin(shellAngle) * shellRadius;

    positions[i3] = startX;
    positions[i3 + 1] = startY;
    positions[i3 + 2] = startZ;
    
    // Random velocity for burst effect
    const angle = Math.random() * Math.PI * 2;
    const verticalAngle = (Math.random() - 0.3) * Math.PI * 0.3; // Less vertical spread
    const speed = stats.minVelocity + Math.random() * (stats.maxVelocity - stats.minVelocity);
    
    // If spawning around player, bias velocity away from center so the effect
    // visibly wraps around the character.
    const awayX = aroundPlayer ? (startX - x) : 0;
    const awayZ = aroundPlayer ? (startZ - z) : 0;
    const awayLength = Math.hypot(awayX, awayZ) || 1;
    const awayScale = aroundPlayer ? 0.9 : 0;
    const outwardX = (awayX / awayLength) * awayScale;
    const outwardZ = (awayZ / awayLength) * awayScale;

    velocities.push({
      x: Math.cos(angle) * Math.cos(verticalAngle) * speed + outwardX,
      y: Math.sin(verticalAngle) * speed + verticalBoost,
      z: Math.sin(angle) * Math.cos(verticalAngle) * speed + outwardZ
    });
    
    // Confetti colors with small variation
    const colorVariation = Math.random() * 0.1;
    colors[i3] = r + colorVariation;
    colors[i3 + 1] = g + Math.random() * 0.05;
    colors[i3 + 2] = b + Math.random() * 0.05;
    
    lifetimes.push(0);
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  
  const material = new THREE.PointsMaterial({
    size: particleSize,
    vertexColors: true,
    transparent: true,
    opacity: 1.0,
    blending: THREE.NormalBlending,
    map: getSharedConfettiTexture(),
    sizeAttenuation: true,
    depthWrite: false
  });
  
  const particles = new THREE.Points(geometry, material);
  scene.add(particles);
  
  // Store confetti effect data
  return {
    particles,
    geometry,
    velocities,
    lifetimes,
    initialColors: new Float32Array(colors),
    maxLifetime: (stats.minLifetime + Math.random() * (stats.maxLifetime - stats.minLifetime)) * lifetimeScale
  };
}

/**
 * Update confetti effect
 * @param {Object} effect - Confetti effect object
 * @param {number} dt - Delta time in seconds
 * @returns {boolean} True if effect should be removed
 */
export function updateConfetti(effect, dt) {
  const positions = effect.geometry.attributes.position.array;
  const colors = effect.geometry.attributes.color.array;
  
  let maxLifetime = 0;
  const gravity = 9.8;
  
  for (let j = 0; j < effect.velocities.length; j++) {
    const j3 = j * 3;
    const vel = effect.velocities[j];
    const lifetime = effect.lifetimes[j];
    
    // Update position with velocity and gravity
    positions[j3] += vel.x * dt;
    positions[j3 + 1] += vel.y * dt;
    positions[j3 + 2] += vel.z * dt;
    
    // Apply gravity
    vel.y -= gravity * dt;
    
    // Update lifetime
    effect.lifetimes[j] = lifetime + dt;
    maxLifetime = Math.max(maxLifetime, effect.lifetimes[j]);
    
    // Keep original color constant (no color fading, only opacity)
    colors[j3] = effect.initialColors[j3];
    colors[j3 + 1] = effect.initialColors[j3 + 1];
    colors[j3 + 2] = effect.initialColors[j3 + 2];
  }
  
  // Fade out opacity while keeping color constant
  const alpha = Math.max(0, 1 - (maxLifetime / effect.maxLifetime));
  effect.particles.material.opacity = alpha;
  
  effect.geometry.attributes.position.needsUpdate = true;
  effect.geometry.attributes.color.needsUpdate = true;
  
  // Return true if effect should be removed
  return maxLifetime >= effect.maxLifetime;
}

/**
 * Remove confetti effect from scene
 * @param {Object} scene - THREE.js scene
 * @param {Object} effect - Confetti effect object
 */
export function removeConfetti(scene, effect) {
  scene.remove(effect.particles);
  effect.geometry.dispose();
  effect.particles.material.dispose();
}

