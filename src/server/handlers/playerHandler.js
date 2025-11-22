/**
 * playerHandler.js
 * 
 * Handles player state updates and requests.
 */

/**
 * Handle player state update
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} state - Player state
 */
export function handlePlayerState(socket, players, state) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    socket.to(player.roomCode).emit('player-state', {
      playerId: socket.id,
      state: state
    });
  }
}

/**
 * Handle projectile creation
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} projectileData - Projectile data
 */
export function handleProjectileCreate(socket, players, projectileData) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    socket.to(player.roomCode).emit('projectile-create', {
      playerId: socket.id,
      ...projectileData
    });
  }
}

/**
 * Handle projectile position update
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} updateData - Projectile update data
 */
export function handleProjectileUpdate(socket, players, updateData) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    socket.to(player.roomCode).emit('projectile-update', {
      playerId: socket.id,
      ...updateData
    });
  }
}

/**
 * Handle player damage
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} damageData - Damage data
 */
export function handlePlayerDamage(socket, players, damageData) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    socket.to(player.roomCode).emit('player-damage', {
      playerId: socket.id,
      ...damageData
    });
  }
}

/**
 * Handle character change
 * @param {Object} socket - Socket instance
 * @param {Map} players - Players map
 * @param {Object} data - Character change data
 */
export function handleCharacterChange(socket, players, data) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    // Update player's game state
    if (player.gameState) {
      player.gameState.characterName = data.characterName;
    }
    
    // Broadcast character change to other players in room
    socket.to(player.roomCode).emit('character-change', {
      playerId: socket.id,
      characterName: data.characterName
    });
  }
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
        .map(id => ({
          playerId: id,
          gameState: players.get(id)?.gameState || {}
        }));
      
      socket.emit('existing-players', existingPlayers);
    }
  }
}

