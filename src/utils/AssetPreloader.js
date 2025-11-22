/**
 * AssetPreloader.js
 * 
 * Utility for preloading assets in parallel using Web Workers.
 * Helps optimize initial load times by prefetching common assets.
 */

import { checkFilesExist, loadJsonFiles, prefetchAssets, processAnimationMetadata } from './workers/WorkerManager.js';

/**
 * Preload common game assets in parallel
 * @param {Object} options - Preload options
 * @param {string[]} options.audioPaths - Array of audio file paths to preload
 * @param {string[]} options.jsonPaths - Array of JSON file paths to preload
 * @param {string[]} options.animationBasePaths - Array of animation base paths (without extension)
 * @returns {Promise<Object>} Results object with preload status
 */
export async function preloadCommonAssets({ audioPaths = [], jsonPaths = [], animationBasePaths = [] }) {
  const results = {
    audio: {},
    json: {},
    animations: {}
  };

  // Preload assets in parallel using workers
  const promises = [];

  if (audioPaths.length > 0) {
    promises.push(
      checkFilesExist(audioPaths).then(fileExists => {
        results.audio = fileExists;
        // Prefetch existing audio files to warm cache
        const existingAudio = audioPaths.filter(path => fileExists[path]);
        if (existingAudio.length > 0) {
          return prefetchAssets(existingAudio).then(prefetchResults => {
            results.audio = { ...fileExists, prefetched: prefetchResults };
          });
        }
      }).catch(error => {
        console.warn('Audio preload failed:', error);
      })
    );
  }

  if (jsonPaths.length > 0) {
    promises.push(
      loadJsonFiles(jsonPaths).then(jsonResults => {
        results.json = jsonResults;
      }).catch(error => {
        console.warn('JSON preload failed:', error);
      })
    );
  }

  if (animationBasePaths.length > 0) {
    promises.push(
      processAnimationMetadata(animationBasePaths).then(metadataResults => {
        results.animations = metadataResults;
      }).catch(error => {
        console.warn('Animation metadata preload failed:', error);
      })
    );
  }

  await Promise.allSettled(promises);

  return results;
}

/**
 * Preload character-specific assets
 * @param {string} characterName - Character name (e.g., 'lucy', 'herald')
 * @returns {Promise<Object>} Preload results
 */
export async function preloadCharacterAssets(characterName) {
  if (!characterName) {
    return {};
  }

  const basePath = `/assets/characters/${characterName}`;
  
  // Common animation paths for characters
  const animationBasePaths = [
    `${basePath}/idle`,
    `${basePath}/walk_front`,
    `${basePath}/walk_back`,
    `${basePath}/walk_left`,
    `${basePath}/walk_right`,
    `${basePath}/jump`,
    `${basePath}/land`,
    `${basePath}/sprint_front`,
    `${basePath}/sprint_back`,
    `${basePath}/sprint_left`,
    `${basePath}/sprint_right`
  ];

  // Common sound paths
  const audioPaths = [
    `${basePath}/footstep.wav`,
    `${basePath}/jump.wav`,
    `${basePath}/land.wav`
  ];

  return preloadCommonAssets({
    animationBasePaths,
    audioPaths
  });
}

/**
 * Preload ability assets
 * @param {string[]} abilityNames - Array of ability names to preload
 * @returns {Promise<Object>} Preload results
 */
export async function preloadAbilityAssets(abilityNames = []) {
  if (!abilityNames || abilityNames.length === 0) {
    return {};
  }

  const audioPaths = [];
  const jsonPaths = [];

  for (const abilityName of abilityNames) {
    // Ability sounds
    audioPaths.push(`/assets/audio/abilities/${abilityName}/${abilityName}_shot.wav`);
    audioPaths.push(`/assets/audio/abilities/${abilityName}/${abilityName}_explosion.wav`);
    
    // Ability config JSON (if exists)
    jsonPaths.push(`/src/config/abilities/characters/${abilityName}.js`);
  }

  return preloadCommonAssets({
    audioPaths,
    jsonPaths
  });
}

