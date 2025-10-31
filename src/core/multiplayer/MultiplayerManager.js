/**
 * MultiplayerManager.js
 * 
 * Main manager for multiplayer functionality.
 * Handles room creation, player connections, and data synchronization via WebSocket.
 */

import { WEBSOCKET_SERVER_URL, PRODUCTION_DOMAINS } from '../../config/multiplayer.js';

export class MultiplayerManager {
  /**
   * Create a new MultiplayerManager
   * @param {Function} onPlayerJoined - Callback when player joins
   * @param {Function} onPlayerLeft - Callback when player leaves
   * @param {Function} onDataReceived - Callback when data is received
   */
  constructor(onPlayerJoined, onPlayerLeft, onDataReceived) {
    this.isHost = false;
    this.roomCode = null;
    this.connectedPlayers = new Map();
    this.localPlayerId = this._generatePlayerId();
    this.onPlayerJoined = onPlayerJoined;
    this.onPlayerLeft = onPlayerLeft;
    this.onDataReceived = onDataReceived;
    this.socket = null;
    this.serverUrl = this._getServerUrl();
    
    this._setupSocket();
  }

  /**
   * Generate a unique player ID
   * @returns {string} Player ID
   * @private
   */
  _generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Get WebSocket server URL
   * @returns {string} Server URL
   * @private
   */
  _getServerUrl() {
    // In development, use localhost:3001
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }
    
    // In production, use configured server URL or same origin
    const hostname = window.location.hostname;
    const isProduction = PRODUCTION_DOMAINS.some(domain => 
      hostname === domain || hostname.endsWith('.' + domain)
    );
    
    if (isProduction) {
      // Use environment variable if set, otherwise same origin
      if (WEBSOCKET_SERVER_URL) {
        return WEBSOCKET_SERVER_URL;
      }
      // Fallback to same origin (requires reverse proxy setup)
      return window.location.origin;
    }
    
    // Fallback: use same origin
    return window.location.origin;
  }

  /**
   * Setup Socket.io connection
   * @private
   */
  _setupSocket() {
    // Load Socket.io client from CDN if not already loaded
    if (typeof io === 'undefined') {
      console.error('Socket.io client not loaded. Please add <script src="https://cdn.socket.io/4.5.4/socket.io.min.js"></script> to index.html');
      return;
    }
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling']
    });
    
    this.socket.on('connect', () => {
      console.log('Connected to multiplayer server');
      this.localPlayerId = this.socket.id;
      
      // Trigger connection callback if set
      if (this.onConnected) {
        this.onConnected();
      }
    });
    
    this.socket.on('disconnect', () => {
      console.log('Disconnected from multiplayer server');
    });
    
    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error);
    });
    
    // Handle player joined
    this.socket.on('player-joined', (data) => {
      if (data.playerId !== this.localPlayerId) {
        if (!this.connectedPlayers.has(data.playerId)) {
          this.connectedPlayers.set(data.playerId, {
            id: data.playerId,
            isLocal: false,
            characterName: data.gameState?.characterName || 'lucy',
            arena: data.gameState?.arena,
            gameMode: data.gameState?.gameMode
          });
          
          if (this.onPlayerJoined) {
            this.onPlayerJoined(data.playerId, {
              characterName: data.gameState?.characterName,
              arena: data.gameState?.arena,
              gameMode: data.gameState?.gameMode
            });
          }
        }
      }
    });
    
    // Handle player left
    this.socket.on('player-left', (data) => {
      this.connectedPlayers.delete(data.playerId);
      
      if (this.onPlayerLeft) {
        this.onPlayerLeft(data.playerId);
      }
    });
    
    // Handle player state updates
    this.socket.on('player-state', (data) => {
      if (data.playerId !== this.localPlayerId && this.onDataReceived) {
        this.onDataReceived(data.playerId, {
          type: 'player-state',
          ...data.state
        });
      }
    });
    
    // Handle projectile creation
    this.socket.on('projectile-create', (data) => {
      if (data.playerId !== this.localPlayerId && this.onDataReceived) {
        this.onDataReceived(data.playerId, {
          type: 'projectile-create',
          ...data
        });
      }
    });
    
    // Handle player damage
    this.socket.on('player-damage', (data) => {
      if (data.playerId !== this.localPlayerId && this.onDataReceived) {
        this.onDataReceived(data.playerId, {
          type: 'player-damage',
          ...data
        });
      }
    });
    
    // Handle existing players response
    this.socket.on('existing-players', (players) => {
      players.forEach(playerData => {
        if (!this.connectedPlayers.has(playerData.playerId)) {
          this.connectedPlayers.set(playerData.playerId, {
            id: playerData.playerId,
            isLocal: false,
            characterName: playerData.gameState?.characterName || 'lucy',
            arena: playerData.gameState?.arena,
            gameMode: playerData.gameState?.gameMode
          });
          
          if (this.onPlayerJoined) {
            this.onPlayerJoined(playerData.playerId, {
              characterName: playerData.gameState?.characterName,
              arena: playerData.gameState?.arena,
              gameMode: playerData.gameState?.gameMode
            });
          }
        }
      });
    });
  }

  /**
   * Create a new room
   * @param {Object} gameState - Current game state {arena, gameMode, characterName}
   * @returns {Promise<string>} Room code
   */
  async createRoom(gameState = {}) {
    // Wait for connection if not connected
    if (!this.socket || !this.socket.connected) {
      console.log('[MultiplayerManager] Waiting for connection before creating room...');
      try {
        await this.waitForConnection();
        console.log('[MultiplayerManager] Connection established, proceeding with create');
      } catch (error) {
        throw new Error('Failed to connect to server: ' + error.message);
      }
    }
    
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      this.socket.emit('create-room', gameState, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.isHost = true;
          this.connectedPlayers.set(this.localPlayerId, {
            id: this.localPlayerId,
            isLocal: true,
            characterName: gameState.characterName || 'lucy',
            arena: gameState.arena,
            gameMode: gameState.gameMode
          });
          resolve(response.roomCode);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }

  /**
   * Wait for connection to be established
   * @param {number} timeout - Timeout in milliseconds (default: 5000ms)
   * @returns {Promise<void>} Resolves when connected
   */
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (this.socket && this.socket.connected) {
        resolve();
        return;
      }
      
      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        if (this.socket && this.socket.connected) {
          clearInterval(checkInterval);
          resolve();
        } else if (Date.now() - startTime > timeout) {
          clearInterval(checkInterval);
          reject(new Error('Connection timeout'));
        }
      }, 100);
      
      // Also listen for connect event
      if (this.socket) {
        const onConnect = () => {
          clearInterval(checkInterval);
          resolve();
        };
        this.socket.once('connect', onConnect);
      }
    });
  }

  /**
   * Join an existing room
   * @param {string} roomCode - Room code to join
   * @param {Object} gameState - Current game state {arena, gameMode, characterName}
   * @returns {Promise<Object>} Response with existing players
   */
  async joinRoom(roomCode, gameState = {}) {
    // Wait for connection if not connected
    if (!this.socket || !this.socket.connected) {
      console.log('[MultiplayerManager] Waiting for connection before joining room...');
      try {
        await this.waitForConnection();
        console.log('[MultiplayerManager] Connection established, proceeding with join');
      } catch (error) {
        throw new Error('Failed to connect to server: ' + error.message);
      }
    }
    
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      this.socket.emit('join-room', roomCode, gameState, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.isHost = false;
          this.connectedPlayers.set(this.localPlayerId, {
            id: this.localPlayerId,
            isLocal: true,
            characterName: gameState.characterName || 'lucy',
            arena: gameState.arena,
            gameMode: gameState.gameMode
          });
          
          // Trigger onPlayerJoined for existing players
          if (response.existingPlayers && Array.isArray(response.existingPlayers)) {
            response.existingPlayers.forEach(playerData => {
              if (!this.connectedPlayers.has(playerData.playerId)) {
                this.connectedPlayers.set(playerData.playerId, {
                  id: playerData.playerId,
                  isLocal: false,
                  characterName: playerData.gameState?.characterName || 'lucy',
                  arena: playerData.gameState?.arena,
                  gameMode: playerData.gameState?.gameMode
                });
                
                if (this.onPlayerJoined) {
                  this.onPlayerJoined(playerData.playerId, {
                    characterName: playerData.gameState?.characterName,
                    arena: playerData.gameState?.arena,
                    gameMode: playerData.gameState?.gameMode
                  });
                }
              }
            });
          }
          
          resolve(response);
        } else {
          reject(new Error(response.error || 'Failed to join room'));
        }
      });
    });
  }

  /**
   * Leave the current room
   */
  leaveRoom() {
    if (this.roomCode && this.socket) {
      this.socket.emit('leave-room');
    }
    
    this.roomCode = null;
    this.isHost = false;
    this.connectedPlayers.clear();
  }

  /**
   * Cleanup resources
   */
  destroy() {
    this.leaveRoom();
    
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  /**
   * Send game data to other players
   * @param {Object} data - Data to send
   */
  sendGameData(data) {
    if (this.roomCode && this.socket) {
      this.socket.emit('game-data', data);
    }
  }

  /**
   * Send player state update (position, rotation, animation)
   * @param {Object} state - Player state
   */
  sendPlayerState(state) {
    if (this.roomCode && this.socket) {
      this.socket.emit('player-state', state);
    }
  }

  /**
   * Send projectile creation event
   * @param {Object} projectileData - Projectile data {type, startX, startY, startZ, directionX, directionZ, targetX, targetZ, characterName}
   */
  sendProjectileCreate(projectileData) {
    if (this.roomCode && this.socket) {
      this.socket.emit('projectile-create', projectileData);
    }
  }

  /**
   * Send player damage event
   * @param {Object} damageData - Damage data {damage, health, maxHealth}
   */
  sendPlayerDamage(damageData) {
    if (this.roomCode && this.socket) {
      this.socket.emit('player-damage', damageData);
    }
  }

  /**
   * Request existing players' states (called when joining a room)
   * @param {Function} sendStateCallback - Callback to send current player state
   */
  requestExistingPlayers(sendStateCallback) {
    if (this.roomCode && this.socket && sendStateCallback) {
      this.sendStateCallback = sendStateCallback;
      this.socket.emit('request-existing-players');
    }
  }

  /**
   * Get current room code
   * @returns {string|null} Room code or null
   */
  getRoomCode() {
    return this.roomCode;
  }

  /**
   * Get local player ID
   * @returns {string} Local player ID
   */
  getLocalPlayerId() {
    return this.localPlayerId;
  }

  /**
   * Get connected players
   * @returns {Array<Object>} Array of connected players
   */
  getConnectedPlayers() {
    return Array.from(this.connectedPlayers.values());
  }

  /**
   * Check if player is in a room
   * @returns {boolean} True if in a room
   */
  isInRoom() {
    return this.roomCode !== null;
  }

  /**
   * Get player info
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player info or null
   */
  getPlayerInfo(playerId) {
    return this.connectedPlayers.get(playerId) || null;
  }

  /**
   * Check if connected to server
   * @returns {boolean} True if connected
   */
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

