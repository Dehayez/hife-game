/**
 * playerHandler.js
 * 
 * Handles player state updates and requests.
 */

import { 
  validatePlayerState, 
  validateProjectileData, 
  validateProjectileUpdate, 
  validateDamageData,
  validateCharacterName,
  RateLimiter 
} from '../utils/validation.js';

// Create rate limiter instance (shared across handlers)
export const rateLimiter = new RateLimiter();

/**
 * Handle player state update
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} state - Player state
 */
export function handlePlayerState(socket, players, state) {
  // Rate limiting
  if (!rateLimiter.isAllowed(socket.id, 'player-state')) {
    console.warn(`[Security] Rate limit exceeded for player-state from ${socket.id}`);
    return;
  }

  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    return;
  }

  // Validate player state
  const validation = validatePlayerState(state, player.lastState, player.gameState?.arena);
  if (!validation.valid) {
    console.warn(`[Security] Invalid player state from ${socket.id}: ${validation.error}`);
    return;
  }

  // Store last state for next validation
  player.lastState = validation.state;

  // Broadcast validated state
  socket.to(player.roomCode).emit('player-state', {
    playerId: socket.id,
    state: validation.state
  });
}

/**
 * Handle projectile creation
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} projectileData - Projectile data
 */
export function handleProjectileCreate(socket, players, projectileData) {
  // Rate limiting
  if (!rateLimiter.isAllowed(socket.id, 'projectile-create')) {
    console.warn(`[Security] Rate limit exceeded for projectile-create from ${socket.id}`);
    return;
  }

  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    return;
  }

  // Validate projectile data
  const validation = validateProjectileData(projectileData, player.gameState?.arena);
  if (!validation.valid) {
    console.warn(`[Security] Invalid projectile data from ${socket.id}: ${validation.error}`);
    return;
  }

  // Broadcast validated projectile data
  socket.to(player.roomCode).emit('projectile-create', {
    playerId: socket.id,
    ...validation.data
  });
}

/**
 * Handle projectile position update
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} updateData - Projectile update data
 */
export function handleProjectileUpdate(socket, players, updateData) {
  // Rate limiting
  if (!rateLimiter.isAllowed(socket.id, 'projectile-update')) {
    console.warn(`[Security] Rate limit exceeded for projectile-update from ${socket.id}`);
    return;
  }

  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    return;
  }

  // Validate projectile update
  const validation = validateProjectileUpdate(updateData, player.gameState?.arena);
  if (!validation.valid) {
    console.warn(`[Security] Invalid projectile update from ${socket.id}: ${validation.error}`);
    return;
  }

  // Broadcast validated update
  socket.to(player.roomCode).emit('projectile-update', {
    playerId: socket.id,
    ...validation.data
  });
}

/**
 * Handle player damage
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} damageData - Damage data
 */
export function handlePlayerDamage(socket, players, damageData) {
  // Rate limiting
  if (!rateLimiter.isAllowed(socket.id, 'player-damage')) {
    console.warn(`[Security] Rate limit exceeded for player-damage from ${socket.id}`);
    return;
  }

  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    return;
  }

  // Validate damage data
  const validation = validateDamageData(damageData);
  if (!validation.valid) {
    console.warn(`[Security] Invalid damage data from ${socket.id}: ${validation.error}`);
    return;
  }

  // Store validated health for server-side tracking
  if (!player.health) {
    player.health = validation.data.maxHealth;
  }
  player.health = validation.data.health;

  // Broadcast validated damage data
  socket.to(player.roomCode).emit('player-damage', {
    playerId: socket.id,
    ...validation.data
  });
}

/**
 * Handle character change
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} data - Character change data
 */
export function handleCharacterChange(socket, players, data) {
  // Rate limiting
  if (!rateLimiter.isAllowed(socket.id, 'character-change')) {
    console.warn(`[Security] Rate limit exceeded for character-change from ${socket.id}`);
    return;
  }

  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    return;
  }

  // Validate character name
  if (!validateCharacterName(data?.characterName)) {
    console.warn(`[Security] Invalid character name from ${socket.id}: ${data?.characterName}`);
    return;
  }

  const characterName = data.characterName.toLowerCase();

  // Update player's game state
  if (player.gameState) {
    player.gameState.characterName = characterName;
  }
  
  // Broadcast character change to other players in room
  socket.to(player.roomCode).emit('character-change', {
    playerId: socket.id,
    characterName
  });
}

/**
 * Handle request for existing players
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 */
export function handleRequestExistingPlayers(socket, rooms, players) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    const room = rooms.get(player.roomCode);
    if (room && room.socketIds) {
      const existingPlayers = Array.from(room.socketIds)
        .filter(id => id !== socket.id)
        .map(id => {
          const other = players.get(id);
          return {
            playerId: id,
            gameState: other?.gameState || {},
            position: other?.lastState ? {
              x: other.lastState.x,
              y: other.lastState.y,
              z: other.lastState.z
            } : null
          };
        });

      socket.emit('existing-players', existingPlayers);
    }
  }
}

