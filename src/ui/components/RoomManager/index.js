import { createRoomUI, createRoomDisplayUI, createJoinUI, handleCreateRoom as handleCreateRoomFn, handleJoinRoom as handleJoinRoomFn, handleLeaveRoom as handleLeaveRoomFn, handleCopyLink as handleCopyLinkFn } from './functions.js';

export function initRoomManager({ mount, multiplayerManager, onRoomCreated, onRoomJoined }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__room-manager';
  
  let roomCodeDisplay = null;
  let joinInput = null;
  let createButton = null;
  let joinButton = null;
  let leaveButton = null;
  let statusText = null;

  function handleCreateRoom() {
    handleCreateRoomFn(onRoomCreated);
    updateUI();
  }

  function handleJoinRoom() {
    handleJoinRoomFn(joinInput, onRoomJoined);
    updateUI();
  }

  function handleLeaveRoom() {
    handleLeaveRoomFn(multiplayerManager);
    updateUI();
  }

  function handleCopyLink(event) {
    handleCopyLinkFn(event, multiplayerManager);
  }

  function updateUI() {
    // Clear wrapper
    wrapper.innerHTML = '';
    
    if (multiplayerManager.isInRoom()) {
      // Show room display
      const roomDisplay = createRoomDisplayUI(
        document.createElement('div'), 
        document.createElement('button'), 
        multiplayerManager, 
        handleCopyLink, 
        handleLeaveRoom
      );
      wrapper.appendChild(roomDisplay);
      
      // Find and update roomCodeDisplay and leaveButton
      roomCodeDisplay = roomDisplay.querySelector('.ui__room-code');
      leaveButton = roomDisplay.querySelector('.ui__button--secondary');
      
      if (roomCodeDisplay) {
        roomCodeDisplay.textContent = multiplayerManager.getRoomCode();
      }
    } else {
      // Show create/join options
      createButton = document.createElement('button');
      statusText = document.createElement('div');
      wrapper.appendChild(createRoomUI(createButton, statusText, handleCreateRoom));
      
      joinInput = document.createElement('input');
      joinButton = document.createElement('button');
      wrapper.appendChild(createJoinUI(joinInput, joinButton, handleJoinRoom));
      
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

