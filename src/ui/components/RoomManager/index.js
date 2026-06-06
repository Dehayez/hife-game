import {
  buildLobbyUI,
  buildRoomListUI,
  buildRoomDisplayUI
} from './functions.js';

/**
 * Initialise the RoomManager UI.
 *
 * @param {Object} options
 * @param {HTMLElement} options.mount - DOM mount point.
 * @param {Object} options.multiplayerManager - MultiplayerManager instance.
 * @param {(roomCode: string, isPrivate: boolean) => Promise<void>} options.onRoomCreated
 *   Called when the user requests room creation. Must call `multiplayerManager.createRoom(...)`
 *   and resolve on success or throw on failure. The RoomManager awaits this to surface
 *   loading / error state inline.
 * @param {(roomCode: string) => Promise<void>} options.onRoomJoined
 *   Called when the user requests to join a room. Same contract as onRoomCreated.
 */
export function initRoomManager({ mount, multiplayerManager, onRoomCreated, onRoomJoined }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__room-manager';
  mount.appendChild(wrapper);

  const state = {
    phase: 'idle',           // 'idle' | 'creating' | 'joining' | 'in-room'
    error: null,
    availableRooms: [],
    loadingRooms: false,
    justCreatedAt: null,
    privacyPending: false,
    isPrivateSelection: false // pre-create selection in the lobby
  };

  let refreshTimer = null;
  let toastTimer = null;
  let autoJoinAttempted = false;

  function clearTimers() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
    if (toastTimer) { clearTimeout(toastTimer); toastTimer = null; }
  }

  function setState(patch) {
    Object.assign(state, patch);
    render();
  }

  function setError(message) {
    setState({ error: friendlyError(message) });
  }

  function clearError() {
    if (state.error !== null) setState({ error: null });
  }

  function getRoomParam() {
    try {
      return new URLSearchParams(window.location.search).get('room');
    } catch {
      return null;
    }
  }

  function setRoomParam(code) {
    try {
      const url = new URL(window.location);
      url.searchParams.set('room', code);
      window.history.replaceState({}, '', url);
    } catch { /* noop */ }
  }

  function clearRoomParam() {
    try {
      const url = new URL(window.location);
      if (!url.searchParams.has('room')) return;
      url.searchParams.delete('room');
      window.history.replaceState({}, '', url);
    } catch { /* noop */ }
  }

  async function refreshAvailableRooms({ silent = false } = {}) {
    if (!multiplayerManager.isConnected()) {
      setState({ availableRooms: [], loadingRooms: false });
      return;
    }
    if (!silent) setState({ loadingRooms: true });
    try {
      const rooms = await multiplayerManager.fetchAvailableRooms();
      setState({ availableRooms: rooms || [], loadingRooms: false });
    } catch {
      // Surface only if user explicitly refreshed; background failures are quiet.
      setState({ availableRooms: [], loadingRooms: false });
    }
  }

  function startAutoRefresh() {
    if (refreshTimer) return;
    refreshTimer = setInterval(() => {
      if (state.phase === 'idle') refreshAvailableRooms({ silent: true });
    }, 5000);
  }

  function stopAutoRefresh() {
    if (refreshTimer) { clearInterval(refreshTimer); refreshTimer = null; }
  }

  async function handleCreate() {
    if (state.phase !== 'idle') return;
    clearError();
    setState({ phase: 'creating' });
    try {
      const code = await onRoomCreated?.(state.isPrivateSelection);
      if (typeof code === 'string') setRoomParam(code);
      state.justCreatedAt = Date.now();
      scheduleToastClear();
      setState({ phase: 'in-room', error: null });
    } catch (err) {
      setState({ phase: 'idle' });
      setError(err?.message || 'Failed to create room');
    }
  }

  async function handleJoin(code) {
    if (state.phase !== 'idle') return;
    const normalized = (code || '').trim().toUpperCase();
    if (!/^[A-Z0-9]{6}$/.test(normalized)) {
      setError('Enter a valid 6-character room code (letters and numbers only).');
      return;
    }
    clearError();
    setState({ phase: 'joining' });
    try {
      await onRoomJoined?.(normalized);
      setRoomParam(normalized);
      setState({ phase: 'in-room', error: null });
    } catch (err) {
      clearRoomParam();
      setState({ phase: 'idle' });
      setError(err?.message || 'Failed to join room');
    }
  }

  function handleLeave() {
    multiplayerManager.leaveRoom();
    clearRoomParam();
    state.justCreatedAt = null;
    setState({ phase: 'idle', error: null, privacyPending: false });
    refreshAvailableRooms({ silent: true });
  }

  async function handlePrivacyToggleInRoom(isPrivate) {
    if (state.privacyPending) return;
    setState({ privacyPending: true });
    try {
      await multiplayerManager.updateRoom({ isPrivate });
      setState({ privacyPending: false });
    } catch (err) {
      setState({ privacyPending: false });
      setError(err?.message || 'Failed to update room settings');
    }
  }

  function handleCopyLink(button) {
    const code = multiplayerManager.getRoomCode();
    if (!code) return;
    const url = new URL(window.location.origin + window.location.pathname);
    url.searchParams.set('room', code);
    const link = url.toString();
    const original = button.textContent;
    navigator.clipboard.writeText(link).then(() => {
      button.textContent = '✓ Copied!';
      button.classList.add('ui__button--success');
      setTimeout(() => {
        button.textContent = original;
        button.classList.remove('ui__button--success');
      }, 2000);
    }).catch(() => {
      // Fallback: surface as a soft error rather than alert().
      setError(`Couldn't access clipboard. Share manually: ${link}`);
    });
  }

  function scheduleToastClear() {
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastTimer = null;
      if (state.justCreatedAt) {
        state.justCreatedAt = null;
        render();
      }
    }, 3000);
  }

  function render() {
    wrapper.innerHTML = '';

    if (multiplayerManager.isInRoom() && state.phase !== 'joining' && state.phase !== 'creating') {
      const roomProperties = multiplayerManager.getRoomProperties();
      const node = buildRoomDisplayUI({
        roomCode: multiplayerManager.getRoomCode(),
        players: multiplayerManager.getConnectedPlayers().length,
        maxPlayers: multiplayerManager.getMaxPlayers?.() ?? 4,
        isHost: !!multiplayerManager.isHost,
        isPrivate: !!roomProperties.isPrivate,
        justCreated: !!state.justCreatedAt,
        createdAt: state.justCreatedAt,
        privacyPending: state.privacyPending,
        onCopyLink: handleCopyLink,
        onLeave: handleLeave,
        onPrivacyChange: multiplayerManager.isHost ? handlePrivacyToggleInRoom : null
      });
      wrapper.appendChild(node);
      if (state.error) {
        // Surface in-room errors below the room display.
        const banner = document.createElement('div');
        banner.className = 'ui__room-error';
        banner.setAttribute('role', 'alert');
        banner.textContent = state.error;
        wrapper.appendChild(banner);
      }
      return;
    }

    const urlRoomCode = getRoomParam();
    wrapper.appendChild(buildLobbyUI({
      phase: state.phase,
      error: state.error,
      isConnected: multiplayerManager.isConnected(),
      maxPlayers: multiplayerManager.getMaxPlayers?.() ?? 4,
      isPrivate: state.isPrivateSelection,
      urlRoomCode: urlRoomCode || '',
      onCreate: handleCreate,
      onJoin: handleJoin,
      onPrivacyChange: (val) => { state.isPrivateSelection = !!val; }
    }));

    wrapper.appendChild(buildRoomListUI({
      rooms: state.availableRooms,
      loading: state.loadingRooms,
      phase: state.phase,
      onJoin: (code) => handleJoin(code),
      onRefresh: () => refreshAvailableRooms()
    }));
  }

  // React to server-driven room updates (privacy, host change).
  multiplayerManager.setRoomUpdatedCallback(() => render());
  multiplayerManager.setHostChangedCallback?.(() => render());

  // React to connection state changes so the lobby reflects offline immediately.
  if (multiplayerManager.setConnectionStateChangeCallback) {
    multiplayerManager.setConnectionStateChangeCallback(() => {
      render();
      if (multiplayerManager.isConnected() && state.phase === 'idle') {
        refreshAvailableRooms({ silent: true });
      }
    });
  }

  async function autoJoinFromURL() {
    if (autoJoinAttempted) return;
    autoJoinAttempted = true;
    const code = getRoomParam();
    if (!code) return;
    if (multiplayerManager.isInRoom()) return;
    if (!multiplayerManager.isConnected()) {
      try { await multiplayerManager.waitForConnection?.(5000); }
      catch { return; }
    }
    handleJoin(code);
  }

  // Initial paint + background refresh + deep-link.
  render();
  refreshAvailableRooms({ silent: true });
  startAutoRefresh();
  autoJoinFromURL();

  return {
    update() {
      // Reconcile internal phase if MultiplayerManager state changed externally
      // (e.g. UIInitializer called leaveRoom on game-mode switch).
      const inRoom = multiplayerManager.isInRoom();
      if (!inRoom && state.phase === 'in-room') {
        state.phase = 'idle';
        state.justCreatedAt = null;
        state.privacyPending = false;
        clearRoomParam();
      } else if (inRoom && state.phase !== 'in-room' && state.phase !== 'creating' && state.phase !== 'joining') {
        state.phase = 'in-room';
      }
      render();
    },
    getWrapper() {
      return wrapper;
    },
    destroy() {
      clearTimers();
      stopAutoRefresh();
    },
    autoJoinFromURL
  };
}

const ERROR_MAP = {
  'Room not found': 'No room with that code. Double-check it or ask the host.',
  'Room is full': 'That room is full.',
  'Invalid room code format': 'Enter a valid 6-character room code (letters and numbers only).',
  'Already in room': 'You are already in this room.',
  'Not in a room': 'You are not in a room.',
  'Only the host can update room settings': 'Only the host can change room settings.',
  'Invalid game state': 'Your game state looks off. Refresh and try again.',
  'Not connected to server': 'Disconnected from the server. Trying to reconnect…',
  'Connection timeout': 'Could not reach the server. Check your connection and try again.'
};

function friendlyError(message) {
  if (!message) return null;
  if (ERROR_MAP[message]) return ERROR_MAP[message];
  if (message.startsWith('Failed to connect to server:')) {
    return 'Could not reach the server. Check your connection and try again.';
  }
  return message;
}
