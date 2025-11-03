/**
 * SplashAreaAnimation.js
 * 
 * Handles animation logic for splash areas (expansion, hold, shrinking).
 * Extracted from SplashArea.js for better organization.
 */

import { SPLASH_AREA_CONFIG } from '../../config/base/MortarAttackConfig.js';

/**
 * Update splash area animation phases
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {number} dt - Delta time in seconds
 */
export function updateSplashAnimation(splashArea, dt) {
  const splashBase = splashArea.children[0];
  if (!splashBase || !splashBase.material) {
    return;
  }
  
  const expandDuration = splashArea.userData.expandDuration || 0.2;
  const shrinkDelay = splashArea.userData.shrinkDelay || 0.5;
  const shrinkDuration = splashArea.userData.shrinkDuration || 1.0;
  
  // Phase 1: Expansion animation (fast scale up from impact point)
  if (splashArea.userData.lifetime < expandDuration) {
    updateExpansionPhase(splashArea, splashBase, expandDuration);
  }
  // Phase 2: Hold at full size (before shrinking starts)
  else if (splashArea.userData.lifetime < shrinkDelay + expandDuration) {
    updateHoldPhase(splashArea, splashBase);
  }
  // Phase 3: Shrinking phase
  else {
    updateShrinkingPhase(splashArea, splashBase, shrinkDelay, expandDuration, shrinkDuration);
  }
}

/**
 * Update expansion phase
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {THREE.Mesh} splashBase - Splash base mesh
 * @param {number} expandDuration - Expansion duration
 */
function updateExpansionPhase(splashArea, splashBase, expandDuration) {
  const expandProgress = Math.min(splashArea.userData.lifetime / expandDuration, 1.0);
  const expandFactor = expandProgress;
  
  // Scale from impact point to full size
  splashBase.scale.set(expandFactor, expandFactor, expandFactor);
  
  // Opacity fades in from 0 to 1 during expansion
  splashBase.material.opacity = expandFactor;
  
  // Light intensity increases during expansion
  updateLightIntensity(splashArea, expandFactor);
  
  // Damage radius expands
  splashArea.userData.radius = splashArea.userData.initialRadius * expandFactor;
}

/**
 * Update hold phase
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {THREE.Mesh} splashBase - Splash base mesh
 */
function updateHoldPhase(splashArea, splashBase) {
  // Keep at full size during delay period
  splashBase.scale.set(1.0, 1.0, 1.0);
  splashBase.material.opacity = 1.0;
  updateLightIntensity(splashArea, 1.0);
  splashArea.userData.radius = splashArea.userData.initialRadius;
}

/**
 * Update shrinking phase
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {THREE.Mesh} splashBase - Splash base mesh
 * @param {number} shrinkDelay - Shrink delay
 * @param {number} expandDuration - Expansion duration
 * @param {number} shrinkDuration - Shrink duration
 */
function updateShrinkingPhase(splashArea, splashBase, shrinkDelay, expandDuration, shrinkDuration) {
  const timeSinceShrinkStart = splashArea.userData.lifetime - (shrinkDelay + expandDuration);
  const shrinkProgress = Math.min(timeSinceShrinkStart / shrinkDuration, 1.0);
  const shrinkFactor = 1.0 - shrinkProgress;
  
  // Shrink the splash area uniformly
  splashBase.scale.set(shrinkFactor, shrinkFactor, shrinkFactor);
  
  // Fade opacity while shrinking
  splashBase.material.opacity = shrinkFactor;
  
  // Update damage radius to shrink as well
  splashArea.userData.radius = splashArea.userData.initialRadius * shrinkFactor;
  
  // Fade out light
  updateLightIntensity(splashArea, shrinkFactor);
}

/**
 * Update light intensity based on phase factor
 * @param {THREE.Object3D} splashArea - Splash area container
 * @param {number} factor - Phase factor (0-1)
 */
function updateLightIntensity(splashArea, factor) {
  if (splashArea.userData.splashLight) {
    const maxIntensity = splashArea.userData.splashLightIntensity || 2.0;
    splashArea.userData.splashLight.intensity = maxIntensity * factor;
    const lightPos = splashArea.userData.splashLightPosition || splashArea.userData.position.clone();
    splashArea.userData.splashLight.position.set(lightPos.x, lightPos.y, lightPos.z);
  }
}

