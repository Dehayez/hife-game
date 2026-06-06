/**
 * roomUtils.js
 *
 * Utility functions for room management.
 */

import { ROOM_CODE_LENGTH } from '../../config/global/RoomConfig.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit easily confused chars (I/O/0/1)

function randomCode() {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

/**
 * Generate a room code that is not already in use.
 * @param {Map} rooms - Active rooms map. When omitted, returns a single random code (no collision guarantee).
 * @returns {string} Room code
 */
export function generateRoomCode(rooms) {
  if (!rooms) return randomCode();
  for (let attempt = 0; attempt < 100; attempt++) {
    const code = randomCode();
    if (!rooms.has(code)) return code;
  }
  // Extremely unlikely with a 32^6 keyspace; fall through with a timestamp tail to guarantee uniqueness.
  return randomCode().slice(0, ROOM_CODE_LENGTH - 2) + Date.now().toString(36).slice(-2).toUpperCase();
}

/**
 * Get or create room
 * @param {Map} rooms - Rooms map (roomCode -> { socketIds: Set, isPrivate: boolean, hostId: string|null, createdAt: number })
 * @param {string} roomCode - Room code
 * @param {boolean} isPrivate - Whether room is private
 * @returns {Object} Room object
 */
export function getOrCreateRoom(rooms, roomCode, isPrivate = false) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      socketIds: new Set(),
      isPrivate: isPrivate,
      hostId: null,
      createdAt: Date.now()
    });
  }
  return rooms.get(roomCode);
}

/**
 * Get room socket IDs
 * @param {Map} rooms - Rooms map
 * @param {string} roomCode - Room code
 * @returns {Set} Room socket IDs
 */
export function getRoomSocketIds(rooms, roomCode) {
  const room = rooms.get(roomCode);
  return room ? room.socketIds : new Set();
}

/**
 * Check if room is private
 * @param {Map} rooms - Rooms map
 * @param {string} roomCode - Room code
 * @returns {boolean} True if room is private
 */
export function isRoomPrivate(rooms, roomCode) {
  const room = rooms.get(roomCode);
  return room ? room.isPrivate : false;
}
