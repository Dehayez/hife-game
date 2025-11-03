/**
 * ParticleCalculation.js
 * 
 * Calculates particle count and spread radius based on projectile properties.
 * Uses configuration from config/base/{ability}ParticleConfig.js
 */

import { BOLT_COLLISION_PARTICLES } from '../../config/base/BoltParticleConfig.js';
import { MORTAR_COLLISION_PARTICLES } from '../../config/base/MortarParticleConfig.js';

/**
 * Calculate particle count and spread radius for a bolt projectile
 * @param {Object} projectileData - Projectile userData containing size, velocity, damage
 * @returns {Object} { particleCount, spreadRadius }
 */
export function calculateBoltParticles(projectileData) {
  const config = BOLT_COLLISION_PARTICLES;
  
  // Extract projectile properties
  const size = projectileData.size || config.baseSize;
  const velocityX = projectileData.velocityX || 0;
  const velocityZ = projectileData.velocityZ || 0;
  const speed = Math.sqrt(velocityX * velocityX + velocityZ * velocityZ);
  const damage = projectileData.damage || 20;
  const force = speed * size;
  
  // Calculate multipliers
  const sizeMultiplier = size / config.baseSize;
  const sizeExponent = Math.pow(sizeMultiplier, config.sizeExponent);
  
  const speedMultiplier = Math.max(
    config.speedMultiplierMin, 
    Math.min(config.speedMultiplierMax, speed / config.baseSpeed)
  );
  const speedExponent = Math.pow(speedMultiplier, config.speedExponent);
  
  const damageFactor = Math.min(1.1, Math.max(0.9, 0.9 + (damage / 200)));
  const forceFactor = Math.min(1.2, Math.max(0.9, 0.9 + (force / config.forceMax)));
  
  // Calculate particle count
  const particleCountMultiplier = 
    sizeExponent * config.sizeWeight +
    speedExponent * config.speedWeight +
    damageFactor * config.damageWeight +
    forceFactor * config.forceWeight;
  
  const particleCount = Math.max(
    config.minParticleCount,
    Math.round(config.baseParticleCount * particleCountMultiplier)
  );
  
  // Calculate spread radius
  const spreadSizeFactor = size * config.spreadSizeMultiplier;
  const spreadSpeedFactor = speedMultiplier * config.spreadSpeedMultiplier;
  const spreadForceFactor = Math.min(
    config.spreadForceMax, 
    force / config.spreadForceDivisor
  );
  
  const spreadRadius = Math.max(
    config.minSpreadRadius,
    config.baseSpreadRadius + spreadSizeFactor + spreadSpeedFactor + spreadForceFactor
  );
  
  return { particleCount, spreadRadius };
}

/**
 * Calculate particle count and spread radius for a mortar
 * @param {Object} mortarData - Mortar userData containing size, velocity, damage, splashRadius
 * @returns {Object} { particleCount, spreadRadius }
 */
export function calculateMortarParticles(mortarData) {
  const config = MORTAR_COLLISION_PARTICLES;
  
  // Extract mortar properties
  const size = mortarData.size || config.baseSize;
  const velocityX = mortarData.velocityX || 0;
  const velocityY = mortarData.velocityY || 0;
  const velocityZ = mortarData.velocityZ || 0;
  const speed = Math.sqrt(velocityX * velocityX + velocityY * velocityY + velocityZ * velocityZ);
  const damage = mortarData.damage || 35;
  const splashRadius = mortarData.splashRadius || config.splashRadiusBase;
  const force = speed * size;
  
  // Calculate multipliers
  const sizeMultiplier = size / config.baseSize;
  const sizeExponent = Math.pow(sizeMultiplier, config.sizeExponent);
  
  const speedMultiplier = Math.max(
    config.speedMultiplierMin,
    Math.min(config.speedMultiplierMax, speed / config.baseSpeed)
  );
  const speedExponent = Math.pow(speedMultiplier, config.speedExponent);
  
  const damageFactor = Math.min(1.1, Math.max(0.9, 0.9 + (damage / 300)));
  const splashFactor = Math.min(
    1.15, 
    Math.max(0.95, 0.95 + (splashRadius - config.splashRadiusBase) / 2)
  );
  const forceFactor = Math.min(1.2, Math.max(0.9, 0.9 + (force / config.forceMax)));
  
  // Calculate particle count
  const particleCountMultiplier = 
    sizeExponent * config.sizeWeight +
    speedExponent * config.speedWeight +
    splashFactor * config.splashRadiusWeight +
    damageFactor * config.damageWeight +
    forceFactor * config.forceWeight;
  
  const particleCount = Math.max(
    config.minParticleCount,
    Math.round(config.baseParticleCount * particleCountMultiplier)
  );
  
  // Calculate spread radius
  const spreadSizeFactor = size * config.spreadSizeMultiplier;
  const spreadSplashFactor = (splashRadius - config.splashRadiusBase) * config.spreadSplashMultiplier;
  const spreadSpeedFactor = speedMultiplier * config.spreadSpeedMultiplier;
  const spreadForceFactor = Math.min(
    config.spreadForceMax,
    force / config.spreadForceDivisor
  );
  
  const spreadRadius = Math.max(
    config.minSpreadRadius,
    config.baseSpreadRadius + spreadSizeFactor + spreadSplashFactor + spreadSpeedFactor + spreadForceFactor
  );
  
  return { particleCount, spreadRadius };
}

