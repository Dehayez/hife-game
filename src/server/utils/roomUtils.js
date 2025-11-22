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
 * @param {Map} rooms - Rooms map (roomCode -> { socketIds: Set, isPrivate: boolean })
 * @param {string} roomCode - Room code
 * @param {boolean} isPrivate - Whether room is private
 * @returns {Object} Room object with socketIds Set and isPrivate flag
 */
export function getOrCreateRoom(rooms, roomCode, isPrivate = false) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      socketIds: new Set(),
      isPrivate: isPrivate
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

