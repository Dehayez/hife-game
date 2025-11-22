/**
 * roomHandler.js
 * 
 * Handles room creation and joining.
 */

import { generateRoomCode, getOrCreateRoom, getRoomSocketIds } from '../utils/roomUtils.js';

/**
 * Handle room creation
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 * @param {Object} gameState - Game state
 * @param {Object} options - Room options (isPrivate)
 * @param {Function} callback - Callback function
 */
export function handleCreateRoom(socket, rooms, players, gameState, options, callback) {
  const isPrivate = options?.isPrivate || false;
  const roomCode = generateRoomCode();
  const room = getOrCreateRoom(rooms, roomCode, isPrivate);
  room.socketIds.add(socket.id);
  
  socket.join(roomCode);
  
  players.set(socket.id, {
    roomCode,
    playerId: socket.id,
    gameState: gameState || {},
    isHost: true
  });
  
  console.log(`Room created: ${roomCode} by ${socket.id} (${isPrivate ? 'private' : 'public'})`);
  
  if (callback) {
    callback({ roomCode, success: true, isPrivate });
  }
  
  // Notify others in room (though initially empty)
  socket.to(roomCode).emit('player-joined', {
    playerId: socket.id,
    gameState: gameState || {}
  });
}

/**
 * Handle room joining
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 * @param {string} roomCode - Room code
 * @param {Object} gameState - Game state
 * @param {Function} callback - Callback function
 */
export function handleJoinRoom(socket, rooms, players, roomCode, gameState, callback) {
  const normalizedRoomCode = roomCode.toUpperCase();
  const room = rooms.get(normalizedRoomCode);
  
  if (!room) {
    if (callback) {
      callback({ success: false, error: 'Room not found' });
    }
    return;
  }
  
  if (!room.socketIds.has(socket.id)) {
    room.socketIds.add(socket.id);
    socket.join(normalizedRoomCode);
    
    players.set(socket.id, {
      roomCode: normalizedRoomCode,
      playerId: socket.id,
      gameState: gameState || {},
      isHost: false
    });
    
    console.log(`Player ${socket.id} joined room ${normalizedRoomCode}`);
    
    // Notify others in room
    socket.to(normalizedRoomCode).emit('player-joined', {
      playerId: socket.id,
      gameState: gameState || {}
    });
    
    // Get existing players in room
    const existingPlayers = Array.from(room.socketIds)
      .filter(id => id !== socket.id)
      .map(id => ({
        playerId: id,
        gameState: players.get(id)?.gameState || {}
      }));
    
    if (callback) {
      callback({ 
        roomCode: normalizedRoomCode, 
        success: true,
        existingPlayers,
        isPrivate: room.isPrivate
      });
    }
  } else {
    if (callback) {
      callback({ success: false, error: 'Already in room' });
    }
  }
}

/**
 * Handle room leaving
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 */
export function handleLeaveRoom(socket, rooms, players) {
  const player = players.get(socket.id);
  if (player && player.roomCode) {
    const room = rooms.get(player.roomCode);
    if (room) {
      room.socketIds.delete(socket.id);
      if (room.socketIds.size === 0) {
        rooms.delete(player.roomCode);
      }
    }
    
    socket.to(player.roomCode).emit('player-left', {
      playerId: socket.id
    });
    
    socket.leave(player.roomCode);
    players.delete(socket.id);
    
    console.log(`Player ${socket.id} left room ${player.roomCode}`);
  }
}

/**
 * Handle listing available rooms
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 * @param {Function} callback - Callback function
 */
export function handleListRooms(socket, rooms, players, callback) {
  const availableRooms = [];
  
  for (const [roomCode, roomData] of rooms.entries()) {
    const playerCount = roomData.socketIds.size;
    // Only include public rooms that have at least one player and aren't full (assuming max 4 players)
    if (!roomData.isPrivate && playerCount > 0 && playerCount < 4) {
      availableRooms.push({
        roomCode,
        playerCount,
        maxPlayers: 4
      });
    }
  }
  
  if (callback) {
    callback({ rooms: availableRooms, success: true });
  }
}

/**
 * Handle room property updates (e.g., privacy toggle)
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 * @param {Object} updates - Room property updates (isPrivate, etc.)
 * @param {Function} callback - Callback function
 */
export function handleUpdateRoom(socket, rooms, players, updates, callback) {
  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    if (callback) {
      callback({ success: false, error: 'Not in a room' });
    }
    return;
  }

  // Check if player is host
  if (!player.isHost) {
    if (callback) {
      callback({ success: false, error: 'Only the host can update room settings' });
    }
    return;
  }

  const room = rooms.get(player.roomCode);
  if (!room) {
    if (callback) {
      callback({ success: false, error: 'Room not found' });
    }
    return;
  }

  // Update room properties
  const updatedProperties = {};
  if (updates.hasOwnProperty('isPrivate')) {
    room.isPrivate = updates.isPrivate;
    updatedProperties.isPrivate = updates.isPrivate;
  }

  console.log(`Room ${player.roomCode} updated by ${socket.id}:`, updatedProperties);

  // Broadcast update to all players in room
  socket.to(player.roomCode).emit('room-updated', {
    roomCode: player.roomCode,
    updates: updatedProperties
  });

  // Also emit to the host
  socket.emit('room-updated', {
    roomCode: player.roomCode,
    updates: updatedProperties
  });

  if (callback) {
    callback({ 
      success: true, 
      updates: updatedProperties 
    });
  }
}

