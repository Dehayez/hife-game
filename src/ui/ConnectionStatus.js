/**
 * ConnectionStatus.js
 * 
 * UI component that displays connection status indicator
 * Shows when client/server is reconnecting or having connection issues
 */

export function initConnectionStatus({ mount, multiplayerManager }) {
  const wrapper = document.createElement('div');
  wrapper.className = 'ui__connection-status';
  
  const statusIndicator = document.createElement('div');
  statusIndicator.className = 'ui__connection-status-indicator';
  
  const statusText = document.createElement('div');
  statusText.className = 'ui__connection-status-text';
  
  wrapper.appendChild(statusIndicator);
  wrapper.appendChild(statusText);
  
  // Initially hidden
  wrapper.classList.add('is-hidden');
  
  /**
   * Update the connection status display
   * @param {string} state - Connection state ('disconnected', 'connecting', 'connected', 'reconnecting')
   */
  function updateStatus(state) {
    // Only show indicator when connecting or reconnecting
    if (state === 'connecting' || state === 'reconnecting') {
      wrapper.classList.remove('is-hidden');
      
      if (state === 'reconnecting') {
        statusIndicator.classList.add('is-reconnecting');
        statusIndicator.classList.remove('is-connecting');
        statusText.textContent = 'Reconnecting...';
      } else {
        statusIndicator.classList.add('is-connecting');
        statusIndicator.classList.remove('is-reconnecting');
        statusText.textContent = 'Connecting...';
      }
    } else {
      // Hide when connected or disconnected
      wrapper.classList.add('is-hidden');
      statusIndicator.classList.remove('is-connecting', 'is-reconnecting');
    }
  }
  
  // Set initial state
  if (multiplayerManager) {
    updateStatus(multiplayerManager.getConnectionState());
    
    // Listen for connection state changes
    multiplayerManager.setConnectionStateChangeCallback((state) => {
      updateStatus(state);
    });
  }
  
  mount.appendChild(wrapper);
  
  // Public API
  return {
    update(state) {
      updateStatus(state);
    },
    getWrapper() {
      return wrapper;
    }
  };
}

