/**
 * index.js
 * 
 * Main WebSocket server for Hife Game Multiplayer.
 * Handles room management, player connections, and real-time game state synchronization.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { handleCreateRoom, handleJoinRoom, handleLeaveRoom } from './handlers/roomHandler.js';
import { handlePlayerState, handleProjectileCreate, handleProjectileUpdate, handlePlayerDamage, handleCharacterChange, handleRequestExistingPlayers } from './handlers/playerHandler.js';

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

io.on('connection', (socket) => {
  console.log(`Player connected: ${socket.id}`);

  // Create a new room
  socket.on('create-room', (gameState, callback) => {
    handleCreateRoom(socket, rooms, players, gameState, callback);
  });

  // Join an existing room
  socket.on('join-room', (roomCode, gameState, callback) => {
    handleJoinRoom(socket, rooms, players, roomCode, gameState, callback);
  });

  // Leave room
  socket.on('leave-room', () => {
    handleLeaveRoom(socket, rooms, players);
  });

  // Send player state update (position, rotation, animation)
  socket.on('player-state', (state) => {
    handlePlayerState(socket, players, state);
  });

  // Send projectile creation (bolt or mortar)
  socket.on('projectile-create', (projectileData) => {
    handleProjectileCreate(socket, players, projectileData);
  });
  
  // Send projectile position update
  socket.on('projectile-update', (updateData) => {
    handleProjectileUpdate(socket, players, updateData);
  });

  // Send player damage/health update
  socket.on('player-damage', (damageData) => {
    handlePlayerDamage(socket, players, damageData);
  });

  // Handle character change
  socket.on('character-change', (data) => {
    handleCharacterChange(socket, players, data);
  });

  // Request existing players in room
  socket.on('request-existing-players', () => {
    handleRequestExistingPlayers(socket, rooms, players);
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    handleLeaveRoom(socket, rooms, players);
    console.log(`Player disconnected: ${socket.id}`);
  });
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

