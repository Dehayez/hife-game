export function calculateKDRatio(kills, deaths) {
  if (deaths === 0) {
    return kills > 0 ? kills.toFixed(2) : '0.00';
  }
  return (kills / deaths).toFixed(2);
}

export function calculateScore(kills) {
  return (kills || 0) * 100;
}

export function getAllPlayers(multiplayerManager, botManager, playerStats) {
  const allPlayers = [];

  // Add local player
  if (multiplayerManager) {
    const localPlayerId = multiplayerManager.getLocalPlayerId();
    if (localPlayerId && playerStats.has(localPlayerId)) {
      const stats = playerStats.get(localPlayerId);
      stats.isLocal = true;
      allPlayers.push({ playerId: localPlayerId, stats, isBot: false });
    }

    // Add remote players
    const connectedPlayers = multiplayerManager.getConnectedPlayers();
    connectedPlayers.forEach(player => {
      if (player.id !== localPlayerId) {
        if (playerStats.has(player.id)) {
          const stats = playerStats.get(player.id);
          stats.isLocal = false;
          allPlayers.push({ playerId: player.id, stats, isBot: false });
        } else {
          // Initialize remote player if not tracked yet
          playerStats.set(player.id, {
            id: player.id.substring(0, 8),
            kills: 0,
            deaths: 0,
            isLocal: false
          });
          const stats = playerStats.get(player.id);
          allPlayers.push({ playerId: player.id, stats, isBot: false });
        }
      }
    });
  } else {
    // Fallback: just local player
    const localStats = playerStats.values().next().value;
    if (localStats) {
      allPlayers.push({ playerId: 'local', stats: localStats, isBot: false });
    }
  }

  // Add bots if botManager is available
  if (botManager) {
    const bots = botManager.getAllBots();
    bots.forEach((bot, index) => {
      if (bot && bot.userData) {
        const botId = bot.userData.id || `bot-${index}`;
        const botName = bot.userData.characterName || 'Bot';
        const botKills = bot.userData.kills || 0;
        const botDeaths = bot.userData.deaths || 0;

        allPlayers.push({
          playerId: botId,
          stats: {
            id: `${botName} ${index + 1}`,
            kills: botKills,
            deaths: botDeaths,
            isLocal: false
          },
          isBot: true
        });
      }
    });
  }

  return allPlayers;
}

export function sortPlayers(allPlayers, calculateKDRatioFn, calculateScoreFn) {
  return allPlayers.sort((a, b) => {
    const aScore = calculateScoreFn(a.stats.kills || 0);
    const bScore = calculateScoreFn(b.stats.kills || 0);
    
    // Sort by score first (descending)
    if (aScore !== bScore) {
      return bScore - aScore;
    }
    
    // If scores are equal, sort by K/D ratio
    const aKD = calculateKDRatioFn(a.stats.kills, a.stats.deaths);
    const bKD = calculateKDRatioFn(b.stats.kills, b.stats.deaths);
    return parseFloat(bKD) - parseFloat(aKD);
  });
}

export function createPlayerRow(playerId, stats, calculateKDRatioFn, calculateScoreFn) {
  const row = document.createElement('tr');
  row.className = 'scoreboard__row';
  if (stats.isLocal) {
    row.classList.add('scoreboard__row--local');
  }
  
  // Player ID
  const playerCell = document.createElement('td');
  playerCell.className = 'scoreboard__cell scoreboard__cell--player';
  const playerIdSpan = document.createElement('span');
  playerIdSpan.className = 'scoreboard__player-id';
  playerIdSpan.textContent = stats.id || playerId.substring(0, 8);
  if (stats.isLocal) {
    playerIdSpan.classList.add('scoreboard__player-id--local');
    playerIdSpan.textContent += ' (You)';
  }
  playerCell.appendChild(playerIdSpan);
  row.appendChild(playerCell);
  
  // Score
  const scoreCell = document.createElement('td');
  scoreCell.className = 'scoreboard__cell scoreboard__cell--score';
  scoreCell.textContent = calculateScoreFn(stats.kills || 0);
  row.appendChild(scoreCell);
  
  // Kills
  const killsCell = document.createElement('td');
  killsCell.className = 'scoreboard__cell scoreboard__cell--kills';
  killsCell.textContent = stats.kills || 0;
  row.appendChild(killsCell);
  
  // Deaths
  const deathsCell = document.createElement('td');
  deathsCell.className = 'scoreboard__cell scoreboard__cell--deaths';
  deathsCell.textContent = stats.deaths || 0;
  row.appendChild(deathsCell);

  // K/D Ratio
  const kdCell = document.createElement('td');
  kdCell.className = 'scoreboard__cell scoreboard__cell--kd';
  kdCell.textContent = calculateKDRatioFn(stats.kills || 0, stats.deaths || 0);
  row.appendChild(kdCell);
  
  return row;
}

