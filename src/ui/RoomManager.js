export function initRoomManager({ mount, multiplayerManager, onRoomCreated, onRoomJoined }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__room-manager';
  
  let roomCodeDisplay = null;
  let joinInput = null;
  let createButton = null;
  let joinButton = null;
  let leaveButton = null;
  let statusText = null;

  function createRoomUI() {
    const container = document.createElement('div');
    container.className = 'ui__room-container';

    // Create room button
    createButton = document.createElement('button');
    createButton.type = 'button';
    createButton.className = 'ui__button ui__button--primary';
    createButton.textContent = 'Create Room';
    createButton.addEventListener('click', handleCreateRoom);
    container.appendChild(createButton);

    // Status text
    statusText = document.createElement('div');
    statusText.className = 'ui__status-text';
    statusText.textContent = 'Not in a room';
    container.appendChild(statusText);

    return container;
  }

  function createRoomDisplayUI() {
    const container = document.createElement('div');
    container.className = 'ui__room-display';

    // Room code display
    const codeLabel = document.createElement('div');
    codeLabel.className = 'ui__label';
    codeLabel.textContent = 'Room Code:';
    container.appendChild(codeLabel);

    roomCodeDisplay = document.createElement('div');
    roomCodeDisplay.className = 'ui__room-code';
    roomCodeDisplay.textContent = multiplayerManager.getRoomCode();
    container.appendChild(roomCodeDisplay);

    // Copy button
    const copyButton = document.createElement('button');
    copyButton.type = 'button';
    copyButton.className = 'ui__button ui__button--small';
    copyButton.textContent = 'Copy Link';
    copyButton.addEventListener('click', handleCopyLink);
    container.appendChild(copyButton);

    // Share instruction
    const shareText = document.createElement('div');
    shareText.className = 'ui__share-text';
    shareText.textContent = 'Share this code with friends to invite them!';
    container.appendChild(shareText);

    // Leave room button
    leaveButton = document.createElement('button');
    leaveButton.type = 'button';
    leaveButton.className = 'ui__button ui__button--secondary';
    leaveButton.textContent = 'Leave Room';
    leaveButton.addEventListener('click', handleLeaveRoom);
    container.appendChild(leaveButton);

    return container;
  }

  function createJoinUI() {
    const container = document.createElement('div');
    container.className = 'ui__join-container';

    // Join input
    const inputWrapper = document.createElement('div');
    inputWrapper.className = 'ui__input-wrapper';

    joinInput = document.createElement('input');
    joinInput.type = 'text';
    joinInput.className = 'ui__input';
    joinInput.placeholder = 'Enter room code';
    joinInput.maxLength = 6;
    inputWrapper.appendChild(joinInput);

    // Join button
    joinButton = document.createElement('button');
    joinButton.type = 'button';
    joinButton.className = 'ui__button ui__button--primary';
    joinButton.textContent = 'Join Room';
    joinButton.addEventListener('click', handleJoinRoom);
    inputWrapper.appendChild(joinButton);

    container.appendChild(inputWrapper);

    return container;
  }

  function handleCreateRoom() {
    // onRoomCreated callback will handle creating the room with game state
    if (onRoomCreated) {
      // Generate a temporary room code for the callback
      // The actual room creation happens in the callback with game state
      const tempRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
      
      // Update URL with room code
      const url = new URL(window.location);
      url.searchParams.set('room', tempRoomCode);
      window.history.pushState({}, '', url);
      
      onRoomCreated(tempRoomCode);
    }
    updateUI();
  }

  function handleJoinRoom() {
    const code = joinInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      alert('Please enter a valid 6-character room code');
      return;
    }

    // onRoomJoined callback will handle joining the room with game state
    if (onRoomJoined) {
      // Update URL with room code
      const url = new URL(window.location);
      url.searchParams.set('room', code);
      window.history.pushState({}, '', url);
      
      updateUI();
      
      onRoomJoined(code);
    }
  }

  function handleLeaveRoom() {
    multiplayerManager.leaveRoom();
    
    // Remove room from URL
    const url = new URL(window.location);
    url.searchParams.delete('room');
    window.history.pushState({}, '', url);
    
    updateUI();
  }

  function handleCopyLink(event) {
    const url = new URL(window.location);
    url.searchParams.set('room', multiplayerManager.getRoomCode());
    const link = url.toString();
    
    navigator.clipboard.writeText(link).then(() => {
      const copyBtn = event.target;
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }

  function updateUI() {
    // Clear wrapper
    wrapper.innerHTML = '';
    
    if (multiplayerManager.isInRoom()) {
      // Show room display
      wrapper.appendChild(createRoomDisplayUI());
      
      if (roomCodeDisplay) {
        roomCodeDisplay.textContent = multiplayerManager.getRoomCode();
      }
      
      if (statusText) {
        statusText.textContent = `Players: ${multiplayerManager.getConnectedPlayers().length}`;
      }
    } else {
      // Show create/join options
      wrapper.appendChild(createRoomUI());
      wrapper.appendChild(createJoinUI());
      
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

