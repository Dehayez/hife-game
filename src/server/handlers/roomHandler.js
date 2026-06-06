/**
 * roomHandler.js
 *
 * Handles room creation, joining, leaving, listing, and property updates.
 */

import { generateRoomCode, getOrCreateRoom } from '../utils/roomUtils.js';
import { validateRoomCode, validateGameState } from '../utils/validation.js';
import { MAX_PLAYERS_PER_ROOM } from '../../config/global/RoomConfig.js';

const callbackSafe = (callback, payload) => {
  if (typeof callback === 'function') callback(payload);
};

/**
 * Handle room creation
 */
export function handleCreateRoom(socket, rooms, players, gameState, options, callback) {
  const gameStateValidation = validateGameState(gameState);
  if (!gameStateValidation.valid) {
    callbackSafe(callback, { success: false, error: 'Invalid game state' });
    return;
  }

  const safeOptions = options && typeof options === 'object' ? options : {};
  const isPrivate = safeOptions.isPrivate === true;

  const roomCode = generateRoomCode(rooms);
  const room = getOrCreateRoom(rooms, roomCode, isPrivate);
  room.socketIds.add(socket.id);
  room.hostId = socket.id;

  socket.join(roomCode);

  const spawnPosition = gameStateValidation.state.position || null;
  players.set(socket.id, {
    roomCode,
    playerId: socket.id,
    gameState: gameStateValidation.state,
    isHost: true,
    lastState: spawnPosition ? { ...spawnPosition } : null
  });

  console.log(`Room created: ${roomCode} by ${socket.id} (${isPrivate ? 'private' : 'public'})`);

  callbackSafe(callback, {
    roomCode,
    success: true,
    isPrivate,
    maxPlayers: MAX_PLAYERS_PER_ROOM
  });
}

/**
 * Handle room joining
 */
export function handleJoinRoom(socket, rooms, players, roomCode, gameState, callback) {
  if (!validateRoomCode(roomCode)) {
    callbackSafe(callback, { success: false, error: 'Invalid room code format' });
    return;
  }

  const normalizedRoomCode = roomCode.toUpperCase();
  const room = rooms.get(normalizedRoomCode);

  if (!room) {
    callbackSafe(callback, { success: false, error: 'Room not found' });
    return;
  }

  if (room.socketIds.has(socket.id)) {
    callbackSafe(callback, { success: false, error: 'Already in room' });
    return;
  }

  if (room.socketIds.size >= MAX_PLAYERS_PER_ROOM) {
    callbackSafe(callback, { success: false, error: 'Room is full' });
    return;
  }

  const gameStateValidation = validateGameState(gameState);
  if (!gameStateValidation.valid) {
    callbackSafe(callback, { success: false, error: 'Invalid game state' });
    return;
  }

  room.socketIds.add(socket.id);
  if (!room.hostId) {
    // Defensive: a room without a host (e.g. orphaned) — promote the joiner.
    room.hostId = socket.id;
  }
  socket.join(normalizedRoomCode);

  const isHost = room.hostId === socket.id;
  const spawnPosition = gameStateValidation.state.position || null;
  players.set(socket.id, {
    roomCode: normalizedRoomCode,
    playerId: socket.id,
    gameState: gameStateValidation.state,
    isHost,
    lastState: spawnPosition ? { ...spawnPosition } : null
  });

  console.log(`Player ${socket.id} joined room ${normalizedRoomCode}`);

  // Broadcast with spawn position so existing players can place the joiner
  // immediately, not at the origin while waiting for the first state tick.
  socket.to(normalizedRoomCode).emit('player-joined', {
    playerId: socket.id,
    gameState: gameStateValidation.state,
    position: spawnPosition
  });

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

  callbackSafe(callback, {
    roomCode: normalizedRoomCode,
    success: true,
    existingPlayers,
    isPrivate: room.isPrivate,
    isHost,
    hostId: room.hostId,
    maxPlayers: MAX_PLAYERS_PER_ROOM
  });
}

/**
 * Handle room leaving. Promotes a new host if the leaving socket was hosting.
 */
export function handleLeaveRoom(socket, rooms, players) {
  const player = players.get(socket.id);
  if (!player || !player.roomCode) return;

  const room = rooms.get(player.roomCode);
  if (room) {
    room.socketIds.delete(socket.id);

    if (room.socketIds.size === 0) {
      rooms.delete(player.roomCode);
    } else if (room.hostId === socket.id) {
      // Host transfer: promote the next socket (insertion order ≈ join order).
      const newHostId = room.socketIds.values().next().value;
      room.hostId = newHostId;
      const newHost = players.get(newHostId);
      if (newHost) newHost.isHost = true;
      socket.to(player.roomCode).emit('host-changed', {
        roomCode: player.roomCode,
        newHostId
      });
      console.log(`Host transferred in room ${player.roomCode}: ${socket.id} -> ${newHostId}`);
    }
  }

  socket.to(player.roomCode).emit('player-left', {
    playerId: socket.id
  });

  socket.leave(player.roomCode);
  players.delete(socket.id);

  console.log(`Player ${socket.id} left room ${player.roomCode}`);
}

/**
 * Handle listing available (public, joinable, not-owned-by-caller) rooms.
 */
export function handleListRooms(socket, rooms, callback) {
  const availableRooms = [];

  for (const [roomCode, roomData] of rooms.entries()) {
    if (roomData.isPrivate) continue;
    if (roomData.socketIds.has(socket.id)) continue; // hide caller's own room
    const playerCount = roomData.socketIds.size;
    if (playerCount === 0 || playerCount >= MAX_PLAYERS_PER_ROOM) continue;
    availableRooms.push({
      roomCode,
      playerCount,
      maxPlayers: MAX_PLAYERS_PER_ROOM
    });
  }

  callbackSafe(callback, { rooms: availableRooms, success: true });
}

/**
 * Allowlist for room property updates. Add new keys here as they become host-controllable.
 */
const ROOM_UPDATE_ALLOWLIST = new Set(['isPrivate']);

/**
 * Handle room property updates (host only).
 */
export function handleUpdateRoom(socket, rooms, players, updates, callback) {
  const player = players.get(socket.id);
  if (!player || !player.roomCode) {
    callbackSafe(callback, { success: false, error: 'Not in a room' });
    return;
  }

  if (!player.isHost) {
    callbackSafe(callback, { success: false, error: 'Only the host can update room settings' });
    return;
  }

  const room = rooms.get(player.roomCode);
  if (!room) {
    callbackSafe(callback, { success: false, error: 'Room not found' });
    return;
  }

  if (!updates || typeof updates !== 'object') {
    callbackSafe(callback, { success: false, error: 'Invalid update payload' });
    return;
  }

  const sanitized = {};
  if (ROOM_UPDATE_ALLOWLIST.has('isPrivate') && typeof updates.isPrivate === 'boolean') {
    room.isPrivate = updates.isPrivate;
    sanitized.isPrivate = updates.isPrivate;
  }

  if (Object.keys(sanitized).length === 0) {
    callbackSafe(callback, { success: false, error: 'No valid updates supplied' });
    return;
  }

  console.log(`Room ${player.roomCode} updated by ${socket.id}:`, sanitized);

  const payload = { roomCode: player.roomCode, updates: sanitized };
  socket.to(player.roomCode).emit('room-updated', payload);
  socket.emit('room-updated', payload);

  callbackSafe(callback, { success: true, updates: sanitized });
}
