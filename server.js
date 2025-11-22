/**
 * WebSocket Server for Hife Game Multiplayer
 * 
 * Handles room management, player connections, and real-time game state synchronization.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PORT = process.env.PORT || 3001;

// Allow CORS from production domain
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS 
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['https://hifeofmools.com', 'https://www.hifeofmools.com', 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

// Create HTTP server
const httpServer = createServer();

// Create Socket.io server
const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) return callback(null, true);
      
      // Check if origin is in allowed list
      if (ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true);
      } else {
        // In development, allow all localhost origins
        if (process.env.NODE_ENV !== 'production') {
          if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
            callback(null, true);
            return;
          }
        }
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: true
  },
  // Use path for Socket.io (works better with reverse proxies)
  path: '/socket.io/',
  // Allow all transports
  transports: ['websocket', 'polling']
});

// Store active rooms and players
const rooms = new Map(); // roomCode -> { socketIds: Set, isPrivate: boolean }
const players = new Map(); // socketId -> { roomCode, playerId, gameState }

/**
 * Generate a unique room code
 */
function generateRoomCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

/**
 * Get or create room
 */
function getOrCreateRoom(roomCode, isPrivate = false) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, {
      socketIds: new Set(),
      isPrivate: isPrivate
    });
  }
  return rooms.get(roomCode);
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  /**
   * Create a new room
   */
  socket.on('create-room', (gameState, options, callback) => {
    // Handle backward compatibility: if callback is passed as second argument
    if (typeof options === 'function') {
      callback = options;
      options = {};
    }
    
    const isPrivate = options?.isPrivate || false;
    const roomCode = generateRoomCode();
    const room = getOrCreateRoom(roomCode, isPrivate);
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
  });

  /**
   * Join an existing room
   */
  socket.on('join-room', (roomCode, gameState, callback) => {
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
  });

  /**
   * Leave room
   */
  socket.on('leave-room', () => {
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
  });

  /**
   * Send player state update (position, rotation, animation)
   */
  socket.on('player-state', (state) => {
    const player = players.get(socket.id);
    if (player && player.roomCode) {
      socket.to(player.roomCode).emit('player-state', {
        playerId: socket.id,
        state: state
      });
    }
  });

  /**
   * Send projectile creation (bolt or mortar)
   */
  socket.on('projectile-create', (projectileData) => {
    const player = players.get(socket.id);
    if (player && player.roomCode) {
      socket.to(player.roomCode).emit('projectile-create', {
        playerId: socket.id,
        ...projectileData
      });
    }
  });

  /**
   * Send player damage/health update
   */
  socket.on('player-damage', (damageData) => {
    const player = players.get(socket.id);
    if (player && player.roomCode) {
      socket.to(player.roomCode).emit('player-damage', {
        playerId: socket.id,
        ...damageData
      });
    }
  });

  /**
   * Handle character change
   */
  socket.on('character-change', (data) => {
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
  });

  /**
   * Request existing players in room
   */
  socket.on('request-existing-players', () => {
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
  });

  /**
   * List available rooms
   */
  socket.on('list-rooms', (callback) => {
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
  });

  /**
   * Update room properties (e.g., privacy toggle)
   */
  socket.on('update-room', (updates, callback) => {
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
  });

  /**
   * Handle disconnection
   */
  socket.on('disconnect', () => {
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
      
      players.delete(socket.id);
      console.log(`Player disconnected: ${socket.id}`);
    }
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

