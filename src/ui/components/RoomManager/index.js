import { createRoomUI, createRoomDisplayUI, createJoinUI, createRoomListUI, handleCreateRoom as handleCreateRoomFn, handleJoinRoom as handleJoinRoomFn, handleLeaveRoom as handleLeaveRoomFn, handleCopyLink as handleCopyLinkFn } from './functions.js';

export function initRoomManager({ mount, multiplayerManager, onRoomCreated, onRoomJoined }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__room-manager';
  
  let roomCodeDisplay = null;
  let joinInput = null;
  let createButton = null;
  let joinButton = null;
  let leaveButton = null;
  let statusText = null;
  let privacyToggle = null;
  let availableRooms = [];
  let refreshButton = null;
  let roomInfo = {
    justCreated: false,
    isPrivate: false,
    createdAt: null,
    onPrivacyToggle: null
  };

  // Set up room update listener
  multiplayerManager.setRoomUpdatedCallback((updates) => {
    if (updates.hasOwnProperty('isPrivate')) {
      roomInfo.isPrivate = updates.isPrivate;
      updateUI();
    }
  });

  async function loadAvailableRooms() {
    try {
      if (multiplayerManager.isConnected()) {
        availableRooms = await multiplayerManager.fetchAvailableRooms();
      } else {
        availableRooms = [];
      }
    } catch (error) {
      console.error('Failed to load available rooms:', error);
      availableRooms = [];
    }
  }

  function handleCreateRoom() {
    const isPrivate = privacyToggle ? privacyToggle.checked : false;
    roomInfo.justCreated = true;
    roomInfo.isPrivate = isPrivate;
    roomInfo.createdAt = Date.now();
    handleCreateRoomFn(onRoomCreated, isPrivate);
    // UI will update after room is created
  }

  function handleJoinRoom(roomCode = null) {
    if (roomCode) {
      // Join from room list - create a temporary input object
      const tempInput = { value: roomCode };
      handleJoinRoomFn(tempInput, onRoomJoined);
    } else {
      // Join from input
      handleJoinRoomFn(joinInput, onRoomJoined);
    }
    // UI will update after room is joined (via roomManager.update() in UIInitializer)
  }

  function handleLeaveRoom() {
    handleLeaveRoomFn(multiplayerManager);
    updateUI();
  }

  function handleCopyLink(event) {
    handleCopyLinkFn(event, multiplayerManager);
  }

  async function handlePrivacyToggle(isPrivate) {
    try {
      await multiplayerManager.updateRoom({ isPrivate });
      roomInfo.isPrivate = isPrivate;
      // UI will update via room-updated event callback
    } catch (error) {
      console.error('Failed to update room privacy:', error);
      // Revert toggle on error
      updateUI();
    }
  }

  async function handleRefreshRooms() {
    await loadAvailableRooms();
    updateUI();
  }

  async function updateUI() {
    // Clear wrapper
    wrapper.innerHTML = '';
    
    if (multiplayerManager.isInRoom()) {
      // Get current room properties
      const roomProperties = multiplayerManager.getRoomProperties();
      roomInfo.isPrivate = roomProperties.isPrivate || false;
      roomInfo.onPrivacyToggle = multiplayerManager.isHost ? handlePrivacyToggle : null;
      
      // Show room display with room info
      const roomDisplay = createRoomDisplayUI(
        document.createElement('div'), 
        document.createElement('button'), 
        multiplayerManager, 
        handleCopyLink, 
        handleLeaveRoom,
        roomInfo
      );
      wrapper.appendChild(roomDisplay);
      
      // Find and update roomCodeDisplay and leaveButton
      roomCodeDisplay = roomDisplay.querySelector('.ui__room-code');
      leaveButton = roomDisplay.querySelector('.ui__button--secondary');
      
      if (roomCodeDisplay) {
        roomCodeDisplay.textContent = multiplayerManager.getRoomCode();
      }

      // Reset justCreated flag after displaying
      if (roomInfo.justCreated) {
        setTimeout(() => {
          roomInfo.justCreated = false;
        }, 3500); // Slightly longer than notification display time
      }
    } else {
      // Reset room info when not in room
      roomInfo.justCreated = false;
      roomInfo.isPrivate = false;
      roomInfo.createdAt = null;
      // Load available rooms
      await loadAvailableRooms();
      
      // Show create/join options
      createButton = document.createElement('button');
      statusText = document.createElement('div');
      privacyToggle = document.createElement('input');
      wrapper.appendChild(createRoomUI(createButton, statusText, privacyToggle, handleCreateRoom));
      
      joinInput = document.createElement('input');
      joinButton = document.createElement('button');
      wrapper.appendChild(createJoinUI(joinInput, joinButton, () => handleJoinRoom()));
      
      // Show available rooms list
      refreshButton = document.createElement('button');
      const roomListContainer = createRoomListUI(
        availableRooms,
        (roomCode) => handleJoinRoom(roomCode),
        refreshButton,
        handleRefreshRooms
      );
      wrapper.appendChild(roomListContainer);
      
      // Check URL for room code
      const urlParams = new URLSearchParams(window.location.search);
      const roomParam = urlParams.get('room');
      if (roomParam && joinInput) {
        joinInput.value = roomParam;
      }
    }
  }

  // Initial UI
  updateUI();

  mount.appendChild(wrapper);

  // Public API
  return {
    update() {
      updateUI();
    },
    getWrapper() {
      return wrapper;
    }
  };
}

