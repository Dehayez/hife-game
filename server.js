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
  : ['https://hife.be', 'https://www.hife.be', 'http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173', 'http://127.0.0.1:3000'];

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
const rooms = new Map(); // roomCode -> Set of socketIds
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
function getOrCreateRoom(roomCode) {
  if (!rooms.has(roomCode)) {
    rooms.set(roomCode, new Set());
  }
  return rooms.get(roomCode);
}

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  /**
   * Create a new room
   */
  socket.on('create-room', (gameState, callback) => {
    const roomCode = generateRoomCode();
    const room = getOrCreateRoom(roomCode);
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
  });

  /**
   * Join an existing room
   */
  socket.on('join-room', (roomCode, gameState, callback) => {
    const room = getOrCreateRoom(roomCode.toUpperCase());
    
    if (!room.has(socket.id)) {
      room.add(socket.id);
      socket.join(roomCode.toUpperCase());
      
      players.set(socket.id, {
        roomCode: roomCode.toUpperCase(),
        playerId: socket.id,
        gameState: gameState || {},
        isHost: false
      });
      
      console.log(`Player ${socket.id} joined room ${roomCode.toUpperCase()}`);
      
      // Notify others in room
      socket.to(roomCode.toUpperCase()).emit('player-joined', {
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
          roomCode: roomCode.toUpperCase(), 
          success: true,
          existingPlayers
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
   * Send projectile creation (firebolt or mortar)
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
   * Request existing players in room
   */
  socket.on('request-existing-players', () => {
    const player = players.get(socket.id);
    if (player && player.roomCode) {
      const room = rooms.get(player.roomCode);
      if (room) {
        const existingPlayers = Array.from(room)
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

