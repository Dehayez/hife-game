/**
 * ConnectionStatus.js
 * 
 * UI component that displays connection status indicator
 * Shows when client/server is reconnecting or having connection issues
 */

import { updateStatus } from './functions.js';

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
  
  // Set initial state
  if (multiplayerManager) {
    updateStatus(wrapper, statusIndicator, statusText, multiplayerManager.getConnectionState());
    
    // Listen for connection state changes
    multiplayerManager.setConnectionStateChangeCallback((state) => {
      updateStatus(wrapper, statusIndicator, statusText, state);
    });
  }
  
  mount.appendChild(wrapper);
  
  // Public API
  return {
    update(state) {
      updateStatus(wrapper, statusIndicator, statusText, state);
    },
    getWrapper() {
      return wrapper;
    }
  };
}

