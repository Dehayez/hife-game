/**
 * Update the connection status display
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {HTMLElement} statusIndicator - Status indicator element
 * @param {HTMLElement} statusText - Status text element
 * @param {string} state - Connection state ('disconnected', 'connecting', 'connected', 'reconnecting')
 */
export function updateStatus(wrapper, statusIndicator, statusText, state) {
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

