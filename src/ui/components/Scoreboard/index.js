/**
 * Scoreboard.js
 * 
 * Multiplayer scoreboard overlay component.
 * Displays player statistics including ID, score, kills, deaths, K/D ratio, etc.
 * Can be toggled with Tab key (PC) or Back/Select/Options button (controller).
 */

import { calculateKDRatio, calculateScore, getAllPlayers, sortPlayers, createPlayerRow } from './functions.js';

export class Scoreboard {
  /**
   * Create a new Scoreboard
   * @param {Object} config - Configuration object
   * @param {Object} config.multiplayerManager - MultiplayerManager instance
   * @param {Object} config.gameModeManager - GameModeManager instance
   * @param {Object} config.botManager - BotManager instance
   * @param {Object} config.characterManager - CharacterManager instance
   */
  constructor(config) {
    this.isVisible = false;
    this.config = config || {};
    this.multiplayerManager = config.multiplayerManager || null;
    this.gameModeManager = config.gameModeManager || null;
    this.botManager = config.botManager || null;
    this.characterManager = config.characterManager || null;
    
    // Player stats tracking
    this.playerStats = new Map(); // Map<playerId, {kills, deaths, bots, id}>
    
    // Create scoreboard structure
    this.createScoreboard();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Create scoreboard DOM structure
   */
  createScoreboard() {
    // Main overlay
    this.overlay = document.createElement('div');
    this.overlay.className = 'scoreboard';
    this.overlay.setAttribute('aria-hidden', 'true');
    
    // Scoreboard container
    this.container = document.createElement('div');
    this.container.className = 'scoreboard__container';
    
    // Scoreboard header
    this.header = document.createElement('div');
    this.header.className = 'scoreboard__header';
    const title = document.createElement('h2');
    title.className = 'scoreboard__title';
    title.textContent = 'Scoreboard';
    this.header.appendChild(title);
    this.container.appendChild(this.header);
    
    // Scoreboard table
    this.table = document.createElement('table');
    this.table.className = 'scoreboard__table';
    
    // Table header
    this.thead = document.createElement('thead');
    this.thead.className = 'scoreboard__thead';
    const headerRow = document.createElement('tr');
    headerRow.className = 'scoreboard__header-row';
    
    const headers = [
      { text: 'Player', className: 'scoreboard__col-player' },
      { text: 'Score', className: 'scoreboard__col-score' },
      { text: 'Kills', className: 'scoreboard__col-kills' },
      { text: 'Deaths', className: 'scoreboard__col-deaths' },
      { text: 'K/D', className: 'scoreboard__col-kd' }
    ];
    
    headers.forEach(header => {
      const th = document.createElement('th');
      th.className = header.className;
      th.textContent = header.text;
      headerRow.appendChild(th);
    });
    
    this.thead.appendChild(headerRow);
    this.table.appendChild(this.thead);
    
    // Table body
    this.tbody = document.createElement('tbody');
    this.tbody.className = 'scoreboard__tbody';
    this.table.appendChild(this.tbody);
    
    this.container.appendChild(this.table);

    this.overlay.appendChild(this.container);
    
    // Append to root element if provided, otherwise to body
    const root = document.getElementById('scoreboard-root') || document.body;
    root.appendChild(this.overlay);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    // Close on overlay click (outside scoreboard)
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) {
        this.toggle();
      }
    });
  }

  /**
   * Initialize player stats for a player
   * @param {string} playerId - Player ID
   * @param {string} displayId - Display ID (short version)
   */
  initializePlayer(playerId, displayId = null) {
    if (!this.playerStats.has(playerId)) {
      this.playerStats.set(playerId, {
        id: displayId || playerId.substring(0, 8),
        kills: 0,
        deaths: 0,
        isLocal: false
      });
    }
  }

  /**
   * Update player stats
   * @param {string} playerId - Player ID
   * @param {Object} stats - Stats object {kills?, deaths?}
   */
  updatePlayerStats(playerId, stats) {
    if (!this.playerStats.has(playerId)) {
      this.initializePlayer(playerId);
    }

    const playerData = this.playerStats.get(playerId);
    if (stats.kills !== undefined) {
      playerData.kills = stats.kills;
    }
    if (stats.deaths !== undefined) {
      playerData.deaths = stats.deaths;
    }
    if (stats.isLocal !== undefined) {
      playerData.isLocal = stats.isLocal;
    }
  }

  /**
   * Get player stats
   * @param {string} playerId - Player ID
   * @returns {Object|null} Player stats or null
   */
  getPlayerStats(playerId) {
    return this.playerStats.get(playerId) || null;
  }

  /**
   * Remove player stats
   * @param {string} playerId - Player ID
   */
  removePlayer(playerId) {
    this.playerStats.delete(playerId);
  }

  /**
   * Update scoreboard display
   */
  updateDisplay() {
    if (!this.tbody) return;

    // Clear existing rows
    this.tbody.innerHTML = '';

    // Get all players
    const allPlayers = getAllPlayers(this.multiplayerManager, this.botManager, this.playerStats);
    
    // Sort players by score (descending), then by K/D ratio
    const sortedPlayers = sortPlayers(allPlayers, calculateKDRatio, calculateScore);
    
    // Create rows for each player
    sortedPlayers.forEach(({ playerId, stats }) => {
      const row = createPlayerRow(playerId, stats, calculateKDRatio, calculateScore);
      this.tbody.appendChild(row);
    });
    
    // If no players, show empty state
    if (sortedPlayers.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.className = 'scoreboard__row scoreboard__row--empty';
      const emptyCell = document.createElement('td');
      emptyCell.className = 'scoreboard__cell';
      emptyCell.colSpan = 5;
      emptyCell.textContent = 'No players';
      emptyRow.appendChild(emptyCell);
      this.tbody.appendChild(emptyRow);
    }
  }

  /**
   * Refresh scoreboard data from managers
   */
  refreshData() {
    // Get local player stats from game mode manager
    if (this.gameModeManager) {
      const modeState = this.gameModeManager.getModeState();
      if (modeState) {
        // Get player ID (use multiplayer ID if available, otherwise 'local')
        let localPlayerId = 'local';
        if (this.multiplayerManager && this.multiplayerManager.getLocalPlayerId) {
          const mpId = this.multiplayerManager.getLocalPlayerId();
          if (mpId) {
            localPlayerId = mpId;
          }
        }

        // Update local player stats
        this.updatePlayerStats(localPlayerId, {
          kills: modeState.kills || 0,
          deaths: modeState.deaths || 0,
          isLocal: true
        });
      }
    }

    // Update display
    this.updateDisplay();
  }

  /**
   * Toggle scoreboard visibility
   */
  toggle() {
    this.isVisible = !this.isVisible;
    this.overlay.setAttribute('aria-hidden', !this.isVisible);
    this.overlay.classList.toggle('is-visible', this.isVisible);
    
    if (this.isVisible) {
      // Refresh data when opening
      this.refreshData();

      // Notify that scoreboard is open (to block game inputs if needed)
      if (this.config.onScoreboardOpen) {
        this.config.onScoreboardOpen();
      }
    } else {
      // Notify that scoreboard is closed
      if (this.config.onScoreboardClose) {
        this.config.onScoreboardClose();
      }
    }
  }

  /**
   * Show scoreboard
   */
  show() {
    if (!this.isVisible) {
      this.toggle();
    }
  }

  /**
   * Hide scoreboard
   */
  hide() {
    if (this.isVisible) {
      this.toggle();
    }
  }

  /**
   * Check if scoreboard is visible
   * @returns {boolean} True if visible
   */
  isOpen() {
    return this.isVisible;
  }

  /**
   * Destroy scoreboard
   */
  destroy() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
  }
}

