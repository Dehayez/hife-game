/**
 * Minimap.js
 * 
 * UI component that displays a minimap showing the arena, players, bots, and projectiles
 * Positioned in the top right corner of the screen
 */

import { updateMinimap, initializeMinimap } from './functions.js';

export function initMinimap({ mount, sceneManager, characterManager, remotePlayerManager, botManager, projectileManager, arenaManager, collisionManager }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__minimap';
  
  const canvas = document.createElement('canvas');
  canvas.className = 'ui__minimap-canvas';
  canvas.width = 200;
  canvas.height = 200;
  
  wrapper.appendChild(canvas);
  
  const ctx = canvas.getContext('2d');
  let animationFrameId = null;
  let isActive = false;
  
  // Initialize minimap state
  const state = initializeMinimap(sceneManager, arenaManager);
  
  /**
   * Start the minimap update loop
   */
  function start() {
    if (isActive) return;
    isActive = true;
    
    function update() {
      if (!isActive) return;
      
      updateMinimap(
        ctx,
        canvas.width,
        canvas.height,
        state,
        sceneManager,
        characterManager,
        remotePlayerManager,
        botManager,
        projectileManager,
        arenaManager,
        collisionManager
      );
      
      animationFrameId = requestAnimationFrame(update);
    }
    
    update();
  }
  
  /**
   * Stop the minimap update loop
   */
  function stop() {
    isActive = false;
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }
  
  /**
   * Show the minimap
   */
  function show() {
    wrapper.classList.remove('is-hidden');
    start();
  }
  
  /**
   * Hide the minimap
   */
  function hide() {
    wrapper.classList.add('is-hidden');
    stop();
  }
  
  // Start minimap by default
  start();
  
  mount.appendChild(wrapper);
  
  // Public API
  return {
    show,
    hide,
    start,
    stop,
    getWrapper() {
      return wrapper;
    },
    update() {
      if (isActive) {
        updateMinimap(
          ctx,
          canvas.width,
          canvas.height,
          state,
          sceneManager,
          characterManager,
          remotePlayerManager,
          botManager,
          projectileManager,
          arenaManager,
          collisionManager
        );
      }
    }
  };
}

