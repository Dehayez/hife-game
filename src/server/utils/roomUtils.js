/**
 * roomUtils.js
 * 
 * Utility functions for room management.
 */

/**
 * Generate a unique room code
 * @returns {string} Room code
 */
export function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

/**
 * Get or create room
 * @param {Map} rooms - Rooms map
 * @param {string} roomCode - Room code
 * @returns {Set} Room set
 */
export function getOrCreateRoom(rooms, roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  return rooms.get(roomCode);
}

