/**
 * HDRI Background Example
 * 
 * This example shows how to load and use HDRI backgrounds in your game,
 * similar to how Blender handles environment maps.
 */

import { initializeManagers } from '../src/core/ManagerInitializer.js';

/**
 * Example 1: Basic HDRI Background Setup
 */
async function exampleBasicHDRI() {
  const canvas = document.getElementById('app-canvas');
  
  // Initialize managers
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Load HDRI background after scene initialization
  try {
    await sceneManager.loadEnvironmentMap('/assets/environments/forest_sky.hdr');
    console.log('HDRI background loaded successfully!');
  } catch (error) {
    console.error('Failed to load HDRI:', error);
  }
}

/**
 * Example 2: HDRI with Custom Options
 */
async function exampleCustomOptions() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Load HDRI with custom configuration
  await sceneManager.loadEnvironmentMap('/assets/environments/studio.hdr', {
    useAsBackground: true,    // Show HDRI as background
    useAsEnvironment: true,   // Use for reflections and lighting
    pmremSize: 512            // Higher quality (slower)
  });
}

/**
 * Example 3: Background Only (No Reflections)
 */
async function exampleBackgroundOnly() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Use HDRI only as background, keep default lighting
  await sceneManager.loadEnvironmentMap('/assets/environments/sky.hdr', {
    useAsBackground: true,
    useAsEnvironment: false  // Don't affect reflections
  });
}

/**
 * Example 4: Environment Only (No Background)
 */
async function exampleEnvironmentOnly() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Use HDRI for reflections only, keep default background color
  await sceneManager.loadEnvironmentMap('/assets/environments/studio.hdr', {
    useAsBackground: false,   // Keep default background
    useAsEnvironment: true    // Use for reflections
  });
}

/**
 * Example 5: Dynamic Environment Switching
 */
async function exampleDynamicSwitching() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Switch to night environment
  async function switchToNight() {
    await sceneManager.loadEnvironmentMap('/assets/environments/night_sky.hdr');
  }
  
  // Switch to day environment
  async function switchToDay() {
    await sceneManager.loadEnvironmentMap('/assets/environments/day_sky.hdr');
  }
  
  // Remove environment and restore default
  function resetToDefault() {
    sceneManager.removeEnvironmentMap();
  }
  
  // Example: Switch environments based on game time
  // switchToNight();
  // Later: switchToDay();
}

/**
 * Example 6: Error Handling
 */
async function exampleWithErrorHandling() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  try {
    await sceneManager.loadEnvironmentMap('/assets/environments/forest_sky.hdr');
    console.log('Environment loaded successfully');
  } catch (error) {
    console.error('Failed to load environment:', error);
    // Fallback to default background
    sceneManager.removeEnvironmentMap();
  }
}

/**
 * Example 7: Loading Multiple Environments
 */
async function exampleMultipleEnvironments() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Preload environments for quick switching
  const environments = {
    forest: '/assets/environments/forest_sky.hdr',
    night: '/assets/environments/night_sky.hdr',
    studio: '/assets/environments/studio.hdr'
  };
  
  // Load initial environment
  await sceneManager.loadEnvironmentMap(environments.forest);
  
  // Switch environments based on game state
  // await sceneManager.loadEnvironmentMap(environments.night);
}

// Export examples for use
export {
  exampleBasicHDRI,
  exampleCustomOptions,
  exampleBackgroundOnly,
  exampleEnvironmentOnly,
  exampleDynamicSwitching,
  exampleWithErrorHandling,
  exampleMultipleEnvironments
};


