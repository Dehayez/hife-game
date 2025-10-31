export class MultiplayerManager {
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

  _generatePlayerId() {
    return 'player_' + Math.random().toString(36).substr(2, 9);
  }

  _generateRoomCode() {
    return Math.random().toString(36).substr(2, 6).toUpperCase();
  }

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

  sendGameData(data) {
    if (this.roomCode) {
      this._sendSignalingMessage({
        type: 'game-data',
        data: data
      });
    }
  }

  getRoomCode() {
    return this.roomCode;
  }

  getLocalPlayerId() {
    return this.localPlayerId;
  }

  getConnectedPlayers() {
    return Array.from(this.connectedPlayers.values());
  }

  isInRoom() {
    return this.roomCode !== null;
  }
}

