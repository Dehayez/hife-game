export function createRoomUI(createButton, statusText, privacyToggle, handleCreateRoom) {
  const container = document.createElement('div');
  container.className = 'ui__room-container';

  // Privacy toggle wrapper
  const privacyWrapper = document.createElement('div');
  privacyWrapper.className = 'ui__privacy-wrapper';

  const privacyLabel = document.createElement('label');
  privacyLabel.className = 'ui__privacy-label';
  
  privacyToggle.type = 'checkbox';
  privacyToggle.className = 'ui__privacy-toggle';
  privacyToggle.checked = false; // Default to public
  
  const privacyText = document.createElement('span');
  privacyText.className = 'ui__privacy-text';
  privacyText.textContent = 'Private (Invite Only)';
  
  privacyLabel.appendChild(privacyToggle);
  privacyLabel.appendChild(privacyText);
  privacyWrapper.appendChild(privacyLabel);
  container.appendChild(privacyWrapper);

  // Create room button
  createButton.type = 'button';
  createButton.className = 'ui__button ui__button--primary';
  createButton.textContent = 'Create Room';
  createButton.addEventListener('click', handleCreateRoom);
  container.appendChild(createButton);

  // Status text
  statusText.className = 'ui__status-text';
  statusText.textContent = 'Not in a room';
  container.appendChild(statusText);

  return container;
}

export function createRoomDisplayUI(roomCodeDisplay, leaveButton, multiplayerManager, handleCopyLink, handleLeaveRoom, roomInfo = {}) {
  const container = document.createElement('div');
  container.className = 'ui__room-display';

  // Success notification (if just created)
  if (roomInfo.justCreated) {
    const successNotification = document.createElement('div');
    successNotification.className = 'ui__room-success';
    successNotification.textContent = '✓ Room created successfully!';
    container.appendChild(successNotification);
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      if (successNotification.parentNode) {
        successNotification.style.opacity = '0';
        successNotification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          if (successNotification.parentNode) {
            successNotification.remove();
          }
        }, 300);
      }
    }, 3000);
  }

  // Room status header
  const statusHeader = document.createElement('div');
  statusHeader.className = 'ui__room-status-header';
  
  const roomCode = multiplayerManager.getRoomCode();
  const connectedPlayers = multiplayerManager.getConnectedPlayers();
  const playerCount = connectedPlayers.length;
  const maxPlayers = 4;
  const isHost = multiplayerManager.isHost || false;
  const isPrivate = roomInfo.isPrivate || false;

  // Room code display
  const codeLabel = document.createElement('div');
  codeLabel.className = 'ui__label';
  codeLabel.textContent = 'Room Code:';
  statusHeader.appendChild(codeLabel);

  roomCodeDisplay.className = 'ui__room-code';
  roomCodeDisplay.textContent = roomCode;
  statusHeader.appendChild(roomCodeDisplay);

  // Privacy badge
  if (isPrivate) {
    const privacyBadge = document.createElement('div');
    privacyBadge.className = 'ui__room-privacy-badge';
    privacyBadge.textContent = '🔒 Private';
    statusHeader.appendChild(privacyBadge);
  }

  // Host badge
  if (isHost) {
    const hostBadge = document.createElement('div');
    hostBadge.className = 'ui__room-host-badge';
    hostBadge.textContent = '👑 Host';
    statusHeader.appendChild(hostBadge);
  }

  container.appendChild(statusHeader);

  // Room info section
  const infoSection = document.createElement('div');
  infoSection.className = 'ui__room-info-section';

  // Player count
  const playerInfo = document.createElement('div');
  playerInfo.className = 'ui__room-info-item';
  playerInfo.textContent = `👥 Players: ${playerCount}/${maxPlayers}`;
  infoSection.appendChild(playerInfo);

  // Creation time (if available)
  if (roomInfo.createdAt) {
    const timeInfo = document.createElement('div');
    timeInfo.className = 'ui__room-info-item';
    const timeAgo = getTimeAgo(roomInfo.createdAt);
    timeInfo.textContent = `⏱ Created: ${timeAgo}`;
    infoSection.appendChild(timeInfo);
  }

  container.appendChild(infoSection);

  // Action buttons wrapper
  const actionsWrapper = document.createElement('div');
  actionsWrapper.className = 'ui__room-actions';

  // Host controls (privacy toggle)
  if (isHost && roomInfo.onPrivacyToggle) {
    const hostControls = document.createElement('div');
    hostControls.className = 'ui__room-host-controls';

    const privacyControlLabel = document.createElement('label');
    privacyControlLabel.className = 'ui__privacy-label';
    
    const privacyControlToggle = document.createElement('input');
    privacyControlToggle.type = 'checkbox';
    privacyControlToggle.className = 'ui__privacy-toggle';
    privacyControlToggle.checked = isPrivate;
    privacyControlToggle.addEventListener('change', () => {
      if (roomInfo.onPrivacyToggle) {
        roomInfo.onPrivacyToggle(privacyControlToggle.checked);
      }
    });
    
    const privacyControlText = document.createElement('span');
    privacyControlText.className = 'ui__privacy-text';
    privacyControlText.textContent = 'Private Room';
    
    privacyControlLabel.appendChild(privacyControlToggle);
    privacyControlLabel.appendChild(privacyControlText);
    hostControls.appendChild(privacyControlLabel);
    actionsWrapper.appendChild(hostControls);
  }

  // Copy button
  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'ui__button ui__button--small';
  copyButton.textContent = 'Copy Link';
  copyButton.addEventListener('click', handleCopyLink);
  actionsWrapper.appendChild(copyButton);

  // Share instruction
  const shareText = document.createElement('div');
  shareText.className = 'ui__share-text';
  shareText.textContent = 'Share this code with friends to invite them!';
  actionsWrapper.appendChild(shareText);

  container.appendChild(actionsWrapper);

  // Leave room button
  leaveButton.type = 'button';
  leaveButton.className = 'ui__button ui__button--secondary';
  leaveButton.textContent = 'Leave Room';
  leaveButton.addEventListener('click', handleLeaveRoom);
  container.appendChild(leaveButton);

  return container;
}

function getTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function createJoinUI(joinInput, joinButton, handleJoinRoom) {
  const container = document.createElement('div');
  container.className = 'ui__join-container';

  // Join input
  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'ui__input-wrapper';

  joinInput.type = 'text';
  joinInput.className = 'ui__input';
  joinInput.placeholder = 'Enter room code';
  joinInput.maxLength = 6;
  inputWrapper.appendChild(joinInput);

  // Join button
  joinButton.type = 'button';
  joinButton.className = 'ui__button ui__button--primary';
  joinButton.textContent = 'Join Room';
  joinButton.addEventListener('click', handleJoinRoom);
  inputWrapper.appendChild(joinButton);

  container.appendChild(inputWrapper);

  return container;
}

export function createRoomListUI(availableRooms, onRoomClick, refreshButton, onRefresh) {
  const container = document.createElement('div');
  container.className = 'ui__room-list-container';

  // Title and refresh button wrapper
  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '8px';

  // Title
  const title = document.createElement('div');
  title.className = 'ui__room-list-title';
  title.textContent = 'Available Rooms';
  header.appendChild(title);

  // Refresh button
  refreshButton.type = 'button';
  refreshButton.className = 'ui__button ui__button--small';
  refreshButton.textContent = 'Refresh';
  refreshButton.addEventListener('click', onRefresh);
  header.appendChild(refreshButton);

  container.appendChild(header);

  // Room list
  const roomList = document.createElement('div');
  roomList.className = 'ui__room-list';

  if (availableRooms.length === 0) {
    const emptyMessage = document.createElement('div');
    emptyMessage.className = 'ui__room-list-empty';
    emptyMessage.textContent = 'No rooms available. Create one to get started!';
    roomList.appendChild(emptyMessage);
  } else {
    availableRooms.forEach(room => {
      const roomItem = document.createElement('div');
      roomItem.className = 'ui__room-item';
      
      const roomCode = document.createElement('div');
      roomCode.className = 'ui__room-item-code';
      roomCode.textContent = room.roomCode;
      
      const roomInfo = document.createElement('div');
      roomInfo.className = 'ui__room-item-info';
      roomInfo.textContent = `${room.playerCount}/${room.maxPlayers} players`;
      
      roomItem.appendChild(roomCode);
      roomItem.appendChild(roomInfo);
      
      roomItem.addEventListener('click', () => {
        onRoomClick(room.roomCode);
      });
      
      roomList.appendChild(roomItem);
    });
  }

  container.appendChild(roomList);

  return container;
}

export function handleCreateRoom(onRoomCreated, isPrivate = false) {
  if (!onRoomCreated) return;
  
  // Generate a temporary room code for the callback
  // The actual room creation happens in the callback with game state
  const tempRoomCode = Math.random().toString(36).substr(2, 6).toUpperCase();
  
  // Update URL with room code
  const url = new URL(window.location);
  url.searchParams.set('room', tempRoomCode);
  window.history.pushState({}, '', url);
  
  onRoomCreated(tempRoomCode, isPrivate);
}

export function handleJoinRoom(joinInput, onRoomJoined) {
  const code = typeof joinInput === 'string' ? joinInput : joinInput.value.trim().toUpperCase();
  
  if (code.length !== 6) {
    alert('Please enter a valid 6-character room code');
    return;
  }

  if (!onRoomJoined) return;

  // Update URL with room code
  const url = new URL(window.location);
  url.searchParams.set('room', code);
  window.history.pushState({}, '', url);
  
  onRoomJoined(code);
}

export function handleLeaveRoom(multiplayerManager) {
  multiplayerManager.leaveRoom();
  
  // Remove room from URL
  const url = new URL(window.location);
  url.searchParams.delete('room');
  window.history.pushState({}, '', url);
}

export function handleCopyLink(event, multiplayerManager) {
  const roomCode = multiplayerManager.getRoomCode();
  if (!roomCode) {
    console.warn('Cannot copy link: no room code available');
    return;
  }

  // Get room properties to check privacy status
  const roomProperties = multiplayerManager.getRoomProperties();
  const isPrivate = roomProperties.isPrivate || false;

  // Create a clean URL with only the room parameter
  const url = new URL(window.location.origin + window.location.pathname);
  url.searchParams.set('room', roomCode);
  const link = url.toString();
  
  navigator.clipboard.writeText(link).then(() => {
    const copyBtn = event.target;
    if (copyBtn && copyBtn.tagName === 'BUTTON') {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '✓ Copied!';
      copyBtn.classList.add('ui__button--success');
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.classList.remove('ui__button--success');
      }, 2000);
    }
  }).catch((error) => {
    console.error('Failed to copy link to clipboard:', error);
    // Fallback: show alert with room code and link
    const message = isPrivate 
      ? `Private Room Code: ${roomCode}\n\nLink: ${link}\n\nCopy this link to invite friends!`
      : `Room Code: ${roomCode}\n\nLink: ${link}\n\nCopy this link to share with friends!`;
    alert(message);
  });
}

export function updateUI(wrapper, multiplayerManager, roomCodeDisplay, statusText, joinInput, createRoomUI, createRoomDisplayUI, createJoinUI, handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleCopyLink, onRoomCreated, onRoomJoined) {
  // Clear wrapper
  wrapper.innerHTML = '';
  
  if (multiplayerManager.isInRoom()) {
    // Show room display
    const roomDisplay = createRoomDisplayUI(roomCodeDisplay, document.createElement('button'), multiplayerManager, (e) => handleCopyLink(e, multiplayerManager), () => {
      handleLeaveRoom(multiplayerManager);
      updateUI(wrapper, multiplayerManager, roomCodeDisplay, statusText, joinInput, createRoomUI, createRoomDisplayUI, createJoinUI, handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleCopyLink, onRoomCreated, onRoomJoined);
    });
    wrapper.appendChild(roomDisplay);
    
    if (roomCodeDisplay) {
      roomCodeDisplay.textContent = multiplayerManager.getRoomCode();
    }
    
    if (statusText) {
      statusText.textContent = `Players: ${multiplayerManager.getConnectedPlayers().length}`;
    }
  } else {
    // Show create/join options
    const createButton = document.createElement('button');
    const statusTextEl = document.createElement('div');
    wrapper.appendChild(createRoomUI(createButton, statusTextEl, () => {
      handleCreateRoom(onRoomCreated);
      updateUI(wrapper, multiplayerManager, roomCodeDisplay, statusText, joinInput, createRoomUI, createRoomDisplayUI, createJoinUI, handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleCopyLink, onRoomCreated, onRoomJoined);
    }));
    
    const joinInputEl = document.createElement('input');
    const joinButton = document.createElement('button');
    wrapper.appendChild(createJoinUI(joinInputEl, joinButton, () => {
      handleJoinRoom(joinInputEl, onRoomJoined);
      updateUI(wrapper, multiplayerManager, roomCodeDisplay, statusText, joinInput, createRoomUI, createRoomDisplayUI, createJoinUI, handleCreateRoom, handleJoinRoom, handleLeaveRoom, handleCopyLink, onRoomCreated, onRoomJoined);
    }));
    
    // Check URL for room code
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    if (roomParam && joinInputEl) {
      joinInputEl.value = roomParam;
    }
  }
}

