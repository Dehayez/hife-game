/**
 * GameConstants.js
 * 
 * Centralized constants used throughout the game.
 * Reduces magic numbers and improves maintainability.
 */

export const GAME_CONSTANTS = {
  // Timing constants
  SYNC_INTERVAL: 66, // Position sync interval in milliseconds (~15 times per second for ultra-smooth multiplayer with less jitter)
  ANIMATION_UPDATE_THROTTLE: 16, // Max update interval for animations in milliseconds
  STALE_PLAYER_CLEANUP: 5000, // Cleanup stale players every 5 seconds
  AUTO_JOIN_DELAY: 100, // Delay before attempting auto-join in milliseconds
  AUTO_JOIN_RETRY_DELAY: 1000, // Retry delay for auto-join in milliseconds
  INITIAL_STATE_SEND_DELAY: 50, // Delay before sending initial state in milliseconds
  INITIAL_STATE_REQUEST_DELAY: 200, // Delay before requesting existing players in milliseconds
  LOADING_SCREEN_REMOVE_DELAY: 300, // Delay before removing loading screen in milliseconds
  
  // UI constants
  LOADING_TRANSITION_DURATION: 300, // Loading screen transition duration in milliseconds
  
  // Arena constants
  STANDARD_ARENA_SIZE: 20,
  LARGE_ARENA_SIZE: 40,
  
  // Camera constants
  CAMERA_SPRINT_OFFSET: 0.6, // Camera Y offset reduction when sprinting
  CAMERA_LERP_SPEED: 0.08, // Camera position lerp speed
  CAMERA_Y_OFFSET_LERP: 0.05, // Camera Y offset lerp speed
  CAMERA_LOOK_AT_HEIGHT: 0.4, // Height offset for camera lookAt
  
  // Particle constants
  DEFAULT_PARTICLE_COUNT: 35,
  LARGE_ARENA_PARTICLE_COUNT: 60,
  
  // Mushroom visibility
  MUSHROOM_VISIBLE_MODE: 'free-play',
  
  // Character defaults
  DEFAULT_CHARACTER: 'lucy',
  AVAILABLE_CHARACTERS: ['lucy', 'herald'],
  
  // Game mode defaults
  DEFAULT_GAME_MODE: 'free-play',
  
  // Input mode defaults
  DEFAULT_INPUT_MODE: 'keyboard',
  
  // Arena defaults
  DEFAULT_ARENA: 'standard',
};

