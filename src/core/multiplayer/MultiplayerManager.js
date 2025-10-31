/**
 * MultiplayerManager.js
 * 
 * Main manager for multiplayer functionality.
 * Handles room creation, player connections, and data synchronization.
 */

export class MultiplayerManager {
  /**
   * Create a new MultiplayerManager
   * @param {Function} onPlayerJoined - Callback when player joins
   * @param {Function} onPlayerLeft - Callback when player leaves
   * @param {Function} onDataReceived - Callback when data is received
   */
  constructor(onPlayerJoined, onPlayerLeft, onDataReceived) {
    this.peerConnection = null;
    this.dataChannel = null;
    this.isHost = false;
    this.roomCode = null;
    this.connectedPlayers = new Map();
    this.localPlayerId = this._generatePlayerId();
    this.onPlayerJoined = onPlayerJoined;
    this.onPlayerLeft = onPlayerLeft;
    this.onDataReceived = onDataReceived;
    
    // Simple signaling via localStorage (for demo - in production use a signaling server)
    this.signalingChannel = null;
    this._setupSignaling();
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
   * Generate a room code
   * @returns {string} Room code
   * @private
   */
  _generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

  /**
   * Setup signaling mechanism
   * @private
   */
  _setupSignaling() {
    // Use localStorage as a simple signaling mechanism
    // In production, use WebSocket or Socket.io for proper signaling
    this.signalingKey = 'multiplayer_signaling';
    
    // Listen for signaling messages
    window.addEventListener('storage', (e) => {
      if (e.key === this.signalingKey && e.newValue) {
        try {
          const message = JSON.parse(e.newValue);
          if (message.roomCode === this.roomCode && message.from !== this.localPlayerId) {
            this._handleSignalingMessage(message);
          }
        } catch (err) {
          console.error('Error parsing signaling message:', err);
        }
      }
    });
  }

  /**
   * Send a signaling message
   * @param {Object} message - Message to send
   * @private
   */
  _sendSignalingMessage(message) {
    const fullMessage = {
      ...message,
      from: this.localPlayerId,
      roomCode: this.roomCode,
      timestamp: Date.now()
    };
    localStorage.setItem(this.signalingKey, JSON.stringify(fullMessage));
    // Trigger storage event manually (doesn't fire for same tab)
    setTimeout(() => localStorage.removeItem(this.signalingKey), 100);
  }

  /**
   * Handle incoming signaling message
   * @param {Object} message - Signaling message
   * @private
   */
  _handleSignalingMessage(message) {
    // Handle WebRTC signaling (simplified for demo)
    // In production, implement proper offer/answer/ICE candidate exchange
    console.log('Received signaling message:', message);
    
    if (message.type === 'player-joined') {
      if (this.onPlayerJoined) {
        this.onPlayerJoined(message.playerId);
      }
    } else if (message.type === 'player-left') {
      if (this.onPlayerLeft) {
        this.onPlayerLeft(message.playerId);
      }
    } else if (message.type === 'game-data') {
      if (this.onDataReceived) {
        this.onDataReceived(message.playerId, message.data);
      }
    }
  }

  /**
   * Create a new room
   * @returns {string} Room code
   */
  createRoom() {
    this.roomCode = this._generateRoomCode();
    this.isHost = true;
    this.connectedPlayers.set(this.localPlayerId, { id: this.localPlayerId, isLocal: true });
    
    this._sendSignalingMessage({
      type: 'room-created',
      roomCode: this.roomCode
    });
    
    return this.roomCode;
  }

  /**
   * Join an existing room
   * @param {string} roomCode - Room code to join
   * @returns {boolean} True if successfully joined
   */
  joinRoom(roomCode) {
    this.roomCode = roomCode;
    this.isHost = false;
    this.connectedPlayers.set(this.localPlayerId, { id: this.localPlayerId, isLocal: true });
    
    this._sendSignalingMessage({
      type: 'player-joined',
      playerId: this.localPlayerId
    });
    
    return true;
  }

  /**
   * Leave the current room
   */
  leaveRoom() {
    if (this.roomCode) {
      this._sendSignalingMessage({
        type: 'player-left',
        playerId: this.localPlayerId
      });
    }
    
    this.roomCode = null;
    this.isHost = false;
    this.connectedPlayers.clear();
    
    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }
    
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  /**
   * Send game data to other players
   * @param {Object} data - Data to send
   */
  sendGameData(data) {
    if (this.roomCode) {
      this._sendSignalingMessage({
        type: 'game-data',
        data: data
      });
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
}

