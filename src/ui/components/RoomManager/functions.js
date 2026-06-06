/**
 * RoomManager DOM builders.
 *
 * Pure rendering helpers consumed by ./index.js. No event wiring, no state —
 * the caller passes handlers and state in, gets back a detached DOM tree.
 */

export function buildErrorBanner(message) {
  if (!message) return null;
  const banner = document.createElement('div');
  banner.className = 'ui__room-error';
  banner.setAttribute('role', 'alert');
  banner.textContent = message;
  return banner;
}

export function buildLobbyUI({ phase, error, isConnected, maxPlayers, isPrivate, urlRoomCode, onCreate, onJoin, onPrivacyChange }) {
  const container = document.createElement('div');
  container.className = 'ui__room-container';

  const errorBanner = buildErrorBanner(error);
  if (errorBanner) container.appendChild(errorBanner);

  // Privacy toggle
  const privacyWrapper = document.createElement('div');
  privacyWrapper.className = 'ui__privacy-wrapper';
  const privacyLabel = document.createElement('label');
  privacyLabel.className = 'ui__privacy-label';

  const privacyToggle = document.createElement('input');
  privacyToggle.type = 'checkbox';
  privacyToggle.className = 'ui__privacy-toggle';
  privacyToggle.checked = !!isPrivate;
  privacyToggle.disabled = phase !== 'idle';
  privacyToggle.addEventListener('change', () => onPrivacyChange?.(privacyToggle.checked));

  const privacyText = document.createElement('span');
  privacyText.className = 'ui__privacy-text';
  privacyText.textContent = 'Private (Invite Only)';

  privacyLabel.appendChild(privacyToggle);
  privacyLabel.appendChild(privacyText);
  privacyWrapper.appendChild(privacyLabel);
  container.appendChild(privacyWrapper);

  // Create
  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'ui__button ui__button--primary';
  createButton.textContent = phase === 'creating' ? 'Creating room…' : 'Create Room';
  createButton.disabled = phase !== 'idle' || !isConnected;
  createButton.addEventListener('click', () => onCreate?.());
  container.appendChild(createButton);

  // Status
  const statusText = document.createElement('div');
  statusText.className = 'ui__status-text';
  if (!isConnected) {
    statusText.textContent = 'Connecting to server…';
  } else if (phase === 'joining') {
    statusText.textContent = 'Joining room…';
  } else {
    statusText.textContent = `Not in a room (max ${maxPlayers} players)`;
  }
  container.appendChild(statusText);

  // Join input + button
  const joinContainer = document.createElement('div');
  joinContainer.className = 'ui__join-container';

  const inputWrapper = document.createElement('div');
  inputWrapper.className = 'ui__input-wrapper';

  const joinInput = document.createElement('input');
  joinInput.type = 'text';
  joinInput.className = 'ui__input';
  joinInput.placeholder = 'Enter room code';
  joinInput.maxLength = 6;
  joinInput.autocapitalize = 'characters';
  joinInput.autocomplete = 'off';
  joinInput.spellcheck = false;
  joinInput.disabled = phase !== 'idle' || !isConnected;
  if (urlRoomCode) joinInput.value = urlRoomCode;
  joinInput.addEventListener('input', () => {
    joinInput.value = joinInput.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  });

  const joinButton = document.createElement('button');
  joinButton.type = 'button';
  joinButton.className = 'ui__button ui__button--primary';
  joinButton.textContent = phase === 'joining' ? 'Joining…' : 'Join Room';
  joinButton.disabled = phase !== 'idle' || !isConnected;

  const submit = () => onJoin?.(joinInput.value);
  joinButton.addEventListener('click', submit);
  joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') submit();
  });

  inputWrapper.appendChild(joinInput);
  inputWrapper.appendChild(joinButton);
  joinContainer.appendChild(inputWrapper);
  container.appendChild(joinContainer);

  return container;
}

export function buildRoomListUI({ rooms, loading, phase, onJoin, onRefresh }) {
  const container = document.createElement('div');
  container.className = 'ui__room-list-container';

  const header = document.createElement('div');
  header.style.display = 'flex';
  header.style.justifyContent = 'space-between';
  header.style.alignItems = 'center';
  header.style.marginBottom = '8px';

  const title = document.createElement('div');
  title.className = 'ui__room-list-title';
  title.textContent = 'Available Rooms';
  header.appendChild(title);

  const refreshButton = document.createElement('button');
  refreshButton.type = 'button';
  refreshButton.className = 'ui__button ui__button--small';
  refreshButton.textContent = loading ? 'Refreshing…' : 'Refresh';
  refreshButton.disabled = loading || phase !== 'idle';
  refreshButton.addEventListener('click', () => onRefresh?.());
  header.appendChild(refreshButton);

  container.appendChild(header);

  const roomList = document.createElement('div');
  roomList.className = 'ui__room-list';

  if (!rooms || rooms.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'ui__room-list-empty';
    empty.textContent = loading ? 'Loading rooms…' : 'No rooms available. Create one to get started!';
    roomList.appendChild(empty);
  } else {
    rooms.forEach((room) => {
      const item = document.createElement('div');
      item.className = 'ui__room-item';

      const code = document.createElement('div');
      code.className = 'ui__room-item-code';
      code.textContent = room.roomCode;

      const info = document.createElement('div');
      info.className = 'ui__room-item-info';
      info.textContent = `${room.playerCount}/${room.maxPlayers} players`;

      item.appendChild(code);
      item.appendChild(info);
      item.addEventListener('click', () => {
        if (phase === 'idle') onJoin?.(room.roomCode);
      });
      roomList.appendChild(item);
    });
  }

  container.appendChild(roomList);
  return container;
}

export function buildRoomDisplayUI({ roomCode, players, maxPlayers, isHost, isPrivate, justCreated, createdAt, privacyPending, onCopyLink, onLeave, onPrivacyChange }) {
  const container = document.createElement('div');
  container.className = 'ui__room-display';

  if (justCreated) {
    const toast = document.createElement('div');
    toast.className = 'ui__room-success';
    toast.textContent = '✓ Room created — share the code below';
    container.appendChild(toast);
  }

  const statusHeader = document.createElement('div');
  statusHeader.className = 'ui__room-status-header';

  const codeLabel = document.createElement('div');
  codeLabel.className = 'ui__label';
  codeLabel.textContent = 'Room Code:';
  statusHeader.appendChild(codeLabel);

  const codeEl = document.createElement('div');
  codeEl.className = 'ui__room-code';
  codeEl.textContent = roomCode || '—';
  statusHeader.appendChild(codeEl);

  if (isPrivate) {
    const badge = document.createElement('div');
    badge.className = 'ui__room-privacy-badge';
    badge.textContent = '🔒 Private';
    statusHeader.appendChild(badge);
  }
  if (isHost) {
    const badge = document.createElement('div');
    badge.className = 'ui__room-host-badge';
    badge.textContent = '👑 Host';
    statusHeader.appendChild(badge);
  }
  container.appendChild(statusHeader);

  const info = document.createElement('div');
  info.className = 'ui__room-info-section';

  const playerRow = document.createElement('div');
  playerRow.className = 'ui__room-info-item';
  playerRow.textContent = `👥 Players: ${players}/${maxPlayers}`;
  info.appendChild(playerRow);

  if (createdAt) {
    const timeRow = document.createElement('div');
    timeRow.className = 'ui__room-info-item';
    timeRow.textContent = `⏱ Created: ${formatTimeAgo(createdAt)}`;
    info.appendChild(timeRow);
  }
  container.appendChild(info);

  const actions = document.createElement('div');
  actions.className = 'ui__room-actions';

  if (isHost) {
    const hostControls = document.createElement('div');
    hostControls.className = 'ui__room-host-controls';
    const label = document.createElement('label');
    label.className = 'ui__privacy-label';

    const toggle = document.createElement('input');
    toggle.type = 'checkbox';
    toggle.className = 'ui__privacy-toggle';
    toggle.checked = !!isPrivate;
    toggle.disabled = !!privacyPending;
    toggle.addEventListener('change', () => onPrivacyChange?.(toggle.checked));

    const text = document.createElement('span');
    text.className = 'ui__privacy-text';
    text.textContent = privacyPending ? 'Updating…' : 'Private Room';

    label.appendChild(toggle);
    label.appendChild(text);
    hostControls.appendChild(label);
    actions.appendChild(hostControls);
  }

  const copyButton = document.createElement('button');
  copyButton.type = 'button';
  copyButton.className = 'ui__button ui__button--small';
  copyButton.textContent = 'Copy Link';
  copyButton.addEventListener('click', () => onCopyLink?.(copyButton));
  actions.appendChild(copyButton);

  const shareText = document.createElement('div');
  shareText.className = 'ui__share-text';
  shareText.textContent = 'Share this code with friends to invite them!';
  actions.appendChild(shareText);

  container.appendChild(actions);

  const leaveButton = document.createElement('button');
  leaveButton.type = 'button';
  leaveButton.className = 'ui__button ui__button--secondary';
  leaveButton.textContent = 'Leave Room';
  leaveButton.addEventListener('click', () => onLeave?.());
  container.appendChild(leaveButton);

  return container;
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
