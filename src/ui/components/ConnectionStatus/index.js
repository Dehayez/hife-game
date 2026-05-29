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
  
  // Track latest values so state and latency callbacks can compose.
  let currentState = multiplayerManager ? multiplayerManager.getConnectionState() : 'disconnected';
  let currentLatency = multiplayerManager && typeof multiplayerManager.getLatency === 'function'
    ? multiplayerManager.getLatency()
    : null;

  const render = () => updateStatus(wrapper, statusIndicator, statusText, currentState, currentLatency);

  // Set initial state
  if (multiplayerManager) {
    render();

    // Listen for connection state changes
    multiplayerManager.setConnectionStateChangeCallback((state) => {
      currentState = state;
      render();
    });

    // Listen for latency updates (optional API; older managers may not have it)
    if (typeof multiplayerManager.setLatencyChangeCallback === 'function') {
      multiplayerManager.setLatencyChangeCallback((latency) => {
        currentLatency = latency;
        render();
      });
    }
  }

  mount.appendChild(wrapper);

  // Public API
  return {
    update(state) {
      if (state !== undefined) currentState = state;
      render();
    },
    getWrapper() {
      return wrapper;
    }
  };
}

