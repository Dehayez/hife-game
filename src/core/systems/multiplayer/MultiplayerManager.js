/**
 * MultiplayerManager.js
 * 
 * Main manager for multiplayer functionality.
 * Handles room creation, player connections, and data synchronization via WebSocket.
 */

import { WEBSOCKET_SERVER_URL, PRODUCTION_DOMAINS } from '../../../config/global/multiplayer.js';
import { MAX_PLAYERS_PER_ROOM, ROOM_CODE_REGEX } from '../../../config/global/RoomConfig.js';

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
    this.onRoomUpdated = null;
    this.onHostChanged = null;
    this.socket = null;
    this.serverUrl = this._getServerUrl();
    this.roomProperties = {}; // Store room properties like isPrivate
    this.maxPlayers = MAX_PLAYERS_PER_ROOM;
    
    // Connection state tracking
    this.connectionState = 'disconnected'; // 'disconnected', 'connecting', 'connected', 'reconnecting'
    this.onConnectionStateChange = null;

    // Latency tracking (ms). Updated by periodic pings.
    this.latency = null;
    this.onLatencyChange = null;
    this._pingTimer = null;

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
   * Update connection state and notify listeners
   * @param {string} newState - New connection state
   * @private
   */
  _updateConnectionState(newState) {
    if (this.connectionState !== newState) {
      this.connectionState = newState;
      if (this.onConnectionStateChange) {
        this.onConnectionStateChange(newState);
      }
    }
  }

  /**
   * Probe round-trip latency using Socket.io's volatile emit + ack pattern.
   * Uses the built-in engine.io ping if available, otherwise a lightweight
   * application-level probe. Updates `this.latency` and notifies listeners.
   * @private
   */
  _startLatencyProbe() {
    this._stopLatencyProbe();
    const probe = () => {
      if (!this.socket || !this.socket.connected) return;
      const start = performance.now();
      // volatile so probes never queue up if the socket is briefly unhealthy
      this.socket.volatile.emit('ping-probe', () => {
        const rtt = Math.round(performance.now() - start);
        // simple low-pass filter to avoid jitter
        this.latency = this.latency == null ? rtt : Math.round(this.latency * 0.7 + rtt * 0.3);
        if (this.onLatencyChange) this.onLatencyChange(this.latency);
      });
    };
    // first sample quickly, then every 4s
    setTimeout(probe, 250);
    this._pingTimer = setInterval(probe, 4000);
  }

  _stopLatencyProbe() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
    this.latency = null;
    if (this.onLatencyChange) this.onLatencyChange(null);
  }

  /**
   * Get current latency in ms (or null if unknown).
   * @returns {number|null}
   */
  getLatency() {
    return this.latency;
  }

  /**
   * Set callback fired when latency changes.
   * @param {Function} callback - (latencyMs|null) => void
   */
  setLatencyChangeCallback(callback) {
    this.onLatencyChange = callback;
  }

  /**
   * Setup Socket.io connection
   * @private
   */
  _setupSocket() {
    // Load Socket.io client from CDN if not already loaded
    if (typeof io === 'undefined') {
      this._updateConnectionState('disconnected');
      return;
    }
    
    this._updateConnectionState('connecting');
    
    this.socket = io(this.serverUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });
    
    this.socket.on('connect', () => {
      this.localPlayerId = this.socket.id;
      this._updateConnectionState('connected');
      this._startLatencyProbe();

      // Trigger connection callback if set
      if (this.onConnected) {
        this.onConnected();
      }
    });
    
    this.socket.on('disconnect', (reason) => {
      this._stopLatencyProbe();
      // If disconnect was intentional or server closed, mark as disconnected
      if (reason === 'io server disconnect' || reason === 'io client disconnect') {
        this._updateConnectionState('disconnected');
      } else {
        // Otherwise, Socket.io will attempt to reconnect
        this._updateConnectionState('reconnecting');
      }
    });
    
    this.socket.on('connect_error', (error) => {
      // Connection error occurred, but Socket.io will attempt to reconnect
      // Suppress console errors since we have a visual indicator
      // (Socket.io logs these errors automatically, but we handle them silently)
      if (this.connectionState === 'connected') {
        this._updateConnectionState('reconnecting');
      } else {
        this._updateConnectionState('connecting');
      }
    });
    
    this.socket.on('reconnect_attempt', (attemptNumber) => {
      this._updateConnectionState('reconnecting');
    });
    
    this.socket.on('reconnect', (attemptNumber) => {
      this._updateConnectionState('connected');
    });
    
    this.socket.on('reconnect_error', (error) => {
      // Suppress console errors since we have a visual indicator
      this._updateConnectionState('reconnecting');
    });
    
    this.socket.on('reconnect_failed', () => {
      this._updateConnectionState('disconnected');
    });
    
    // Debug logging gated behind window.HIFE_DEBUG_MP — quiet by default in production.
    const dbg = (...args) => { if (typeof window !== 'undefined' && window.HIFE_DEBUG_MP) console.log('[MultiplayerManager]', ...args); };

    // Handle player joined
    this.socket.on('player-joined', (data) => {
      dbg(`player-joined ${data.playerId}`);

      if (data.playerId === this.localPlayerId) return;
      if (this.connectedPlayers.has(data.playerId)) return;

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
          gameMode: data.gameState?.gameMode,
          position: data.position || null
        });
      } else if (typeof window !== 'undefined' && window.HIFE_DEBUG_MP) {
        console.warn('[MultiplayerManager] onPlayerJoined callback is not set!');
      }
    });
    
    // Handle player left
    this.socket.on('player-left', (data) => {
      this.connectedPlayers.delete(data.playerId);
      
      if (this.onPlayerLeft) {
        this.onPlayerLeft(data.playerId);
      }
    });
    
    // Handle player state updates — hot path, no logging.
    this.socket.on('player-state', (data) => {
      if (data.playerId === this.localPlayerId) return;
      if (this.onDataReceived) {
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
    
    // Handle projectile position updates
    this.socket.on('projectile-update', (data) => {
      if (data.playerId !== this.localPlayerId && this.onDataReceived) {
        this.onDataReceived(data.playerId, {
          type: 'projectile-update',
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
      dbg(`existing-players (${players.length})`);
      players.forEach(playerData => {
        const cached = this.connectedPlayers.get(playerData.playerId);
        if (cached) {
          // Refresh stale character info — a player may have swapped while we
          // were mid-join, and onPlayerJoined dedup would otherwise stick us
          // with the old sprite.
          const freshCharacter = playerData.gameState?.characterName;
          if (freshCharacter && freshCharacter !== cached.characterName) {
            cached.characterName = freshCharacter;
            if (this.onDataReceived) {
              this.onDataReceived(playerData.playerId, {
                type: 'character-change',
                characterName: freshCharacter
              });
            }
          }
          return;
        }
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
            gameMode: playerData.gameState?.gameMode,
            position: playerData.position || null
          });
        }
      });
    });
    
    // Handle character change
    this.socket.on('character-change', (data) => {
      if (data.playerId !== this.localPlayerId) {
        // Update player info
        const playerInfo = this.connectedPlayers.get(data.playerId);
        if (playerInfo) {
          playerInfo.characterName = data.characterName;
        }
        
        // Trigger callback if set
        if (this.onDataReceived) {
          this.onDataReceived(data.playerId, {
            type: 'character-change',
            characterName: data.characterName
          });
        }
      }
    });

    // Apocalypse Cottage — terrain / tree / block events broadcast by peers
    this.socket.on('world-event', (data) => {
      if (!data || data.playerId === this.localPlayerId) return;
      if (this.onDataReceived) {
        this.onDataReceived(data.playerId, { type: 'world-event', ...data });
      }
    });

    // Handle host transfer
    this.socket.on('host-changed', (data) => {
      if (data.roomCode !== this.roomCode) return;
      const wasHost = this.isHost;
      this.isHost = data.newHostId === this.localPlayerId;
      if (this.onHostChanged) {
        this.onHostChanged({ newHostId: data.newHostId, isHost: this.isHost, wasHost });
      }
      if (this.onRoomUpdated) {
        this.onRoomUpdated({ isHost: this.isHost, hostId: data.newHostId });
      }
    });

    // Handle room property updates
    this.socket.on('room-updated', (data) => {
      if (data.roomCode === this.roomCode && data.updates) {
        // Store room properties
        if (!this.roomProperties) {
          this.roomProperties = {};
        }
        Object.assign(this.roomProperties, data.updates);
        
        // Trigger callback if set
        if (this.onRoomUpdated) {
          this.onRoomUpdated(data.updates);
        }
      }
    });
  }

  /**
   * Create a new room
   * @param {Object} gameState - Current game state {arena, gameMode, characterName}
   * @param {Object} options - Room options (isPrivate: boolean)
   * @returns {Promise<string>} Room code
   */
  async createRoom(gameState = {}, options = {}) {
    // Wait for connection if not connected
    if (!this.socket || !this.socket.connected) {
      try {
        await this.waitForConnection();
      } catch (error) {
        throw new Error('Failed to connect to server: ' + error.message);
      }
    }
    
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to server'));
        return;
      }
      
      this.socket.emit('create-room', gameState, options, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.isHost = true;
          this.maxPlayers = response.maxPlayers || this.maxPlayers;
          this.roomProperties = {
            isPrivate: response.isPrivate || options.isPrivate || false
          };
          this.connectedPlayers.set(this.localPlayerId, {
            id: this.localPlayerId,
            isLocal: true,
            characterName: gameState.characterName || 'lucy',
            arena: gameState.arena,
            gameMode: gameState.gameMode
          });
          if (this._onRoomJoinedListeners) {
            this._onRoomJoinedListeners.forEach(fn => {
              try { fn(this.roomCode); } catch (e) { console.warn('onRoomJoined listener error:', e); }
            });
          }
          resolve(response.roomCode);
        } else {
          reject(new Error(response.error || 'Failed to create room'));
        }
      });
    });
  }

  /**
   * Wait for connection to be established.
   * @param {number} timeout - Timeout in milliseconds (default 5000ms)
   * @returns {Promise<void>} Resolves when connected, rejects on timeout or missing socket.
   */
  waitForConnection(timeout = 5000) {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not initialised'));
        return;
      }
      if (this.socket.connected) {
        resolve();
        return;
      }

      let settled = false;
      const cleanup = () => {
        settled = true;
        clearTimeout(timer);
        this.socket.off('connect', onConnect);
      };
      const onConnect = () => {
        if (settled) return;
        cleanup();
        resolve();
      };
      const timer = setTimeout(() => {
        if (settled) return;
        cleanup();
        reject(new Error('Connection timeout'));
      }, timeout);

      this.socket.once('connect', onConnect);
    });
  }

  /**
   * Join an existing room
   * @param {string} roomCode - Room code to join
   * @param {Object} gameState - Current game state {arena, gameMode, characterName}
   * @returns {Promise<Object>} Response with existing players
   */
  async joinRoom(roomCode, gameState = {}) {
    const normalized = typeof roomCode === 'string' ? roomCode.trim().toUpperCase() : '';
    if (!ROOM_CODE_REGEX.test(normalized)) {
      throw new Error('Invalid room code format');
    }

    // Wait for connection if not connected
    if (!this.socket || !this.socket.connected) {
      try {
        await this.waitForConnection();
      } catch (error) {
        throw new Error('Failed to connect to server: ' + error.message);
      }
    }

    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('join-room', normalized, gameState, (response) => {
        if (response.success) {
          this.roomCode = response.roomCode;
          this.isHost = response.isHost === true;
          this.maxPlayers = response.maxPlayers || this.maxPlayers;
          this.roomProperties = {
            isPrivate: response.isPrivate || false
          };
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
                    gameMode: playerData.gameState?.gameMode,
                    position: playerData.position || null
                  });
                }
              }
            });
          }
          
          if (this._onRoomJoinedListeners) {
            this._onRoomJoinedListeners.forEach(fn => {
              try { fn(this.roomCode); } catch (e) { console.warn('onRoomJoined listener error:', e); }
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
   * Subscribe to room-join completion. Fires after both joinRoom and createRoom
   * succeed. Useful for fetching one-shot snapshots after entering a room.
   */
  setOnRoomJoined(fn) {
    if (!this._onRoomJoinedListeners) this._onRoomJoinedListeners = [];
    this._onRoomJoinedListeners.push(fn);
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
    this.roomProperties = {};
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
   * @param {Object} projectileData - Projectile data {type, startX, startY, startZ, directionX, directionZ, targetX, targetZ, characterName, projectileId}
   */
  sendProjectileCreate(projectileData) {
    if (this.roomCode && this.socket) {
      this.socket.emit('projectile-create', projectileData);
    }
  }

  /**
   * Send projectile position update event
   * @param {Object} updateData - Projectile update data {projectileId, x, y, z, velocityX, velocityZ}
   */
  sendProjectileUpdate(updateData) {
    if (this.roomCode && this.socket) {
      this.socket.emit('projectile-update', updateData);
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
   * Send an Apocalypse Cottage world event (terrain / tree / block).
   * @param {string} type - one of: terrain, tree-plant, tree-stage, tree-chop, block-place, block-remove
   * @param {Object} payload - event-specific data
   */
  sendWorldEvent(type, payload) {
    if (this.roomCode && this.socket && this.socket.connected) {
      this.socket.emit('world-event', { type, ...payload });
    }
  }

  /**
   * Request the room's current Apocalypse Cottage world snapshot from the
   * server. Resolves with { terrain: [...], trees: [...], blocks: [...] }.
   */
  requestWorldSnapshot() {
    return new Promise((resolve) => {
      if (!this.roomCode || !this.socket || !this.socket.connected) {
        resolve({ terrain: [], trees: [], blocks: [] });
        return;
      }
      let done = false;
      const finish = (data) => {
        if (done) return;
        done = true;
        resolve(data || { terrain: [], trees: [], blocks: [] });
      };
      this.socket.emit('request-world-snapshot', finish);
      // Safety timeout in case the server is older / event not registered.
      setTimeout(() => finish(null), 2000);
    });
  }

  /**
   * Send character change event
   * @param {string} characterName - New character name
   */
  sendCharacterChange(characterName) {
    if (this.roomCode && this.socket && this.socket.connected) {
      // Update local game state
      const playerInfo = this.connectedPlayers.get(this.localPlayerId);
      if (playerInfo) {
        playerInfo.characterName = characterName;
      }
      
      // Emit character change to server
      this.socket.emit('character-change', {
        characterName: characterName
      });
    }
  }

  /**
   * Manually request the server to re-send the existing-players list. The
   * normal join handshake already includes them; this is only useful as a
   * resync escape hatch after a reconnect.
   */
  requestExistingPlayers() {
    if (this.roomCode && this.socket && this.socket.connected) {
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

  /**
   * Get current connection state
   * @returns {string} Connection state ('disconnected', 'connecting', 'connected', 'reconnecting')
   */
  getConnectionState() {
    return this.connectionState;
  }

  /**
   * Set callback for connection state changes
   * @param {Function} callback - Callback function(state)
   */
  setConnectionStateChangeCallback(callback) {
    this.onConnectionStateChange = callback;
  }

  /**
   * Set callback for room property updates
   * @param {Function} callback - Callback function(updates)
   */
  setRoomUpdatedCallback(callback) {
    this.onRoomUpdated = callback;
  }

  /**
   * Set callback for host transfer events.
   * @param {Function} callback - Callback function({ newHostId, isHost, wasHost })
   */
  setHostChangedCallback(callback) {
    this.onHostChanged = callback;
  }

  /**
   * Maximum players per room (server-authoritative; falls back to shared default).
   * @returns {number}
   */
  getMaxPlayers() {
    return this.maxPlayers;
  }

  /**
   * Update room properties (only host can do this)
   * @param {Object} updates - Property updates (e.g., { isPrivate: true })
   * @returns {Promise<Object>} Promise resolving to update result
   */
  async updateRoom(updates) {
    if (!this.socket || !this.socket.connected) {
      throw new Error('Not connected to server');
    }

    if (!this.isHost) {
      throw new Error('Only the host can update room settings');
    }

    return new Promise((resolve, reject) => {
      this.socket.emit('update-room', updates, (response) => {
        if (response && response.success) {
          // Update local room properties
          if (!this.roomProperties) {
            this.roomProperties = {};
          }
          Object.assign(this.roomProperties, response.updates);
          resolve(response);
        } else {
          reject(new Error(response?.error || 'Failed to update room'));
        }
      });
    });
  }

  /**
   * Get room properties
   * @returns {Object} Room properties
   */
  getRoomProperties() {
    return this.roomProperties || {};
  }

  /**
   * Fetch list of available rooms
   * @returns {Promise<Array>} Promise resolving to array of available rooms
   */
  async fetchAvailableRooms() {
    return new Promise((resolve, reject) => {
      if (!this.socket || !this.socket.connected) {
        reject(new Error('Not connected to server'));
        return;
      }

      this.socket.emit('list-rooms', (response) => {
        if (response && response.success) {
          resolve(response.rooms || []);
        } else {
          reject(new Error(response?.error || 'Failed to fetch rooms'));
        }
      });
    });
  }
}

