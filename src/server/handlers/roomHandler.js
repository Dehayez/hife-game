/**
 * roomHandler.js
 * 
 * Handles room creation and joining.
 */

import { generateRoomCode, getOrCreateRoom } from '../utils/roomUtils.js';

/**
 * Handle room creation
 * @param {Object} socket - Socket instance
 * @param {Map} rooms - Rooms map
 * @param {Map} players - Players map
 * @param {Object} gameState - Game state
 * @param {Function} callback - Callback function
 */
export function handleCreateRoom(socket, rooms, players, gameState, callback) {
  const roomCode = generateRoomCode();
  const room = getOrCreateRoom(rooms, roomCode);
  room.add(socket.id);
  
  socket.join(roomCode);
  
  players.set(socket.id, {
    roomCode,
    playerId: socket.id,
    gameState: gameState || {},
    isHost: true
  });
  
  console.log(`Room created: ${roomCode} by ${socket.id}`);
  
  if (callback) {
    callback({ roomCode, success: true });
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
  const room = getOrCreateRoom(rooms, normalizedRoomCode);
  
  if (!room.has(socket.id)) {
    room.add(socket.id);
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
    const existingPlayers = Array.from(room)
      .filter(id => id !== socket.id)
      .map(id => ({
        playerId: id,
        gameState: players.get(id)?.gameState || {}
      }));
    
    if (callback) {
      callback({ 
        roomCode: normalizedRoomCode, 
        success: true,
        existingPlayers
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
      room.delete(socket.id);
      if (room.size === 0) {
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

