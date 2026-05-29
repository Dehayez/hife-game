/**
 * Update the connection status display
 * @param {HTMLElement} wrapper - Wrapper element
 * @param {HTMLElement} statusIndicator - Status indicator element
 * @param {HTMLElement} statusText - Status text element
 * @param {string} state - Connection state ('disconnected', 'connecting', 'connected', 'reconnecting')
 * @param {number|null} [latency] - Optional latency in ms to display alongside connected state
 */
export function updateStatus(wrapper, statusIndicator, statusText, state, latency) {
  // Always strip prior quality classes; we'll re-add as needed.
  statusIndicator.classList.remove('is-connecting', 'is-reconnecting', 'is-connected', 'is-good', 'is-okay', 'is-bad');

  if (state === 'reconnecting') {
    wrapper.classList.remove('is-hidden');
    statusIndicator.classList.add('is-reconnecting');
    statusText.textContent = 'Reconnecting...';
    return;
  }

  if (state === 'connecting') {
    wrapper.classList.remove('is-hidden');
    statusIndicator.classList.add('is-connecting');
    statusText.textContent = 'Connecting...';
    return;
  }

  if (state === 'connected' && typeof latency === 'number' && latency >= 0) {
    // Show a small, unobtrusive ping pill once connected.
    wrapper.classList.remove('is-hidden');
    statusIndicator.classList.add('is-connected');
    if (latency < 80) statusIndicator.classList.add('is-good');
    else if (latency < 180) statusIndicator.classList.add('is-okay');
    else statusIndicator.classList.add('is-bad');
    statusText.textContent = `${latency} ms`;
    return;
  }

  // Disconnected, or connected with no latency yet — hide.
  wrapper.classList.add('is-hidden');
}

