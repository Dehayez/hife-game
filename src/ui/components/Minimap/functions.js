/**
 * Minimap rendering functions
 */

/**
 * Initialize minimap state
 * @param {Object} sceneManager - Scene manager instance
 * @param {Object} arenaManager - Arena manager instance
 * @returns {Object} Minimap state object
 */
export function initializeMinimap(sceneManager, arenaManager) {
  return {
    arenaSize: sceneManager ? sceneManager.getArenaSize() : 20,
    lastUpdate: 0
  };
}

/**
 * Update minimap rendering
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {Object} state - Minimap state
 * @param {Object} sceneManager - Scene manager instance
 * @param {Object} characterManager - Character manager instance
 * @param {Object} remotePlayerManager - Remote player manager instance
 * @param {Object} botManager - Bot manager instance
 * @param {Object} projectileManager - Projectile manager instance
 * @param {Object} arenaManager - Arena manager instance
 * @param {Object} collisionManager - Collision manager instance
 * @param {Object} entityManager - Entity manager instance
 */
export function updateMinimap(ctx, width, height, state, sceneManager, characterManager, remotePlayerManager, botManager, projectileManager, arenaManager, collisionManager, entityManager) {
  // Clear canvas
  ctx.clearRect(0, 0, width, height);
  
  // Get arena size
  const arenaSize = sceneManager ? sceneManager.getArenaSize() : 20;
  state.arenaSize = arenaSize;
  
  // Calculate scale to fit arena in minimap (with padding)
  const padding = 10;
  const mapSize = Math.min(width, height) - padding * 2;
  const scale = mapSize / arenaSize;
  const offsetX = width / 2;
  const offsetY = height / 2;
  
  // Draw arena bounds
  ctx.strokeStyle = '#4a8a6a';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    offsetX - (arenaSize * scale) / 2,
    offsetY - (arenaSize * scale) / 2,
    arenaSize * scale,
    arenaSize * scale
  );
  
  // Helper function to convert world position to minimap coordinates
  const worldToMap = (x, z) => {
    return {
      x: offsetX + x * scale, // Horizontally rotated (mirrored)
      y: offsetY + z * scale // Invert Z because canvas Y is down
    };
  };
  
  // Draw grid lines (optional, for better orientation)
  ctx.strokeStyle = '#2a4a3a';
  ctx.lineWidth = 1;
  const gridLines = 4;
  for (let i = 1; i < gridLines; i++) {
    const pos = (i / gridLines) * arenaSize * scale;
    // Vertical lines
    ctx.beginPath();
    ctx.moveTo(offsetX - (arenaSize * scale) / 2 + pos, offsetY - (arenaSize * scale) / 2);
    ctx.lineTo(offsetX - (arenaSize * scale) / 2 + pos, offsetY + (arenaSize * scale) / 2);
    ctx.stroke();
    // Horizontal lines
    ctx.beginPath();
    ctx.moveTo(offsetX - (arenaSize * scale) / 2, offsetY - (arenaSize * scale) / 2 + pos);
    ctx.lineTo(offsetX + (arenaSize * scale) / 2, offsetY - (arenaSize * scale) / 2 + pos);
    ctx.stroke();
  }
  
  // Draw walls/obstacles
  if (collisionManager && collisionManager.walls) {
    ctx.fillStyle = '#666666'; // Grey color for walls
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1;
    
    for (const wall of collisionManager.walls) {
      if (wall && wall.position && wall.geometry) {
        // Get wall dimensions from geometry
        const wallSize = wall.geometry.parameters;
        const wallWidth = wallSize.width || wallSize.w || 0.4;
        const wallHeight = wallSize.depth || wallSize.h || 0.4;
        
        // Get wall position
        const wallX = wall.position.x;
        const wallZ = wall.position.z;
        
        // Convert to minimap coordinates
        const mapPos = worldToMap(wallX, wallZ);
        const mapWidth = wallWidth * scale;
        const mapHeight = wallHeight * scale;
        
        // Draw wall rectangle
        ctx.fillRect(
          mapPos.x - mapWidth / 2,
          mapPos.y - mapHeight / 2,
          mapWidth,
          mapHeight
        );
        
        // Draw wall border
        ctx.strokeRect(
          mapPos.x - mapWidth / 2,
          mapPos.y - mapHeight / 2,
          mapWidth,
          mapHeight
        );
      }
    }
  }
  
  // Draw local player
  if (characterManager && characterManager.getPlayer) {
    const localPlayer = characterManager.getPlayer();
    if (localPlayer && localPlayer.position) {
      const mapPos = worldToMap(localPlayer.position.x, localPlayer.position.z);
      ctx.fillStyle = '#00ff00'; // Green for local player
      ctx.beginPath();
      ctx.arc(mapPos.x, mapPos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Draw direction indicator
      if (localPlayer.userData && localPlayer.userData.facing) {
        const facing = localPlayer.userData.facing;
        const angle = facing === 'front' ? 0 : facing === 'back' ? Math.PI : 0;
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(mapPos.x, mapPos.y);
        ctx.lineTo(
          mapPos.x + Math.cos(angle) * 6,
          mapPos.y - Math.sin(angle) * 6
        );
        ctx.stroke();
      }
    }
  }
  
  // Draw remote players
  if (remotePlayerManager && remotePlayerManager.getRemotePlayers) {
    const remotePlayers = remotePlayerManager.getRemotePlayers();
    if (remotePlayers && remotePlayers instanceof Map) {
      for (const [playerId, remotePlayer] of remotePlayers) {
        if (remotePlayer && remotePlayer.mesh && remotePlayer.mesh.position) {
          const mapPos = worldToMap(remotePlayer.mesh.position.x, remotePlayer.mesh.position.z);
          ctx.fillStyle = '#0088ff'; // Blue for remote players
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw bots
  if (botManager && botManager.bots) {
    const bots = botManager.bots;
    if (Array.isArray(bots)) {
      for (const bot of bots) {
        if (bot && bot.position) {
          const mapPos = worldToMap(bot.position.x, bot.position.z);
          ctx.fillStyle = '#ff8800'; // Orange for bots
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw projectiles (bolts)
  if (projectileManager && projectileManager.projectiles) {
    const projectiles = projectileManager.projectiles;
    if (Array.isArray(projectiles)) {
      for (const projectile of projectiles) {
        if (projectile && projectile.position) {
          const mapPos = worldToMap(projectile.position.x, projectile.position.z);
          ctx.fillStyle = '#ffff00'; // Yellow for projectiles
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw mortars
  if (projectileManager && projectileManager.mortars) {
    const mortars = projectileManager.mortars;
    if (Array.isArray(mortars)) {
      for (const mortar of mortars) {
        if (mortar && mortar.position) {
          const mapPos = worldToMap(mortar.position.x, mortar.position.z);
          ctx.fillStyle = '#ff0000'; // Red for mortars
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw gems (collectibles)
  if (entityManager && entityManager.collectibles) {
    const collectibles = entityManager.collectibles;
    if (Array.isArray(collectibles)) {
      for (const gem of collectibles) {
        if (gem && gem.position && !gem.userData.collected) {
          const mapPos = worldToMap(gem.position.x, gem.position.z);
          ctx.fillStyle = '#cc4444'; // Red gem color
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 2, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw shadows (hazards)
  if (entityManager && entityManager.hazards) {
    const hazards = entityManager.hazards;
    if (Array.isArray(hazards)) {
      for (const hazard of hazards) {
        if (hazard && hazard.position && hazard.userData.active) {
          const mapPos = worldToMap(hazard.position.x, hazard.position.z);
          ctx.fillStyle = '#4a2a4a'; // Dark purple/black for shadows
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }
  
  // Draw pillars (checkpoints)
  if (entityManager && entityManager.checkpoints) {
    const checkpoints = entityManager.checkpoints;
    if (Array.isArray(checkpoints)) {
      for (const checkpoint of checkpoints) {
        if (checkpoint && checkpoint.position) {
          const mapPos = worldToMap(checkpoint.position.x, checkpoint.position.z);
          // Use different color based on activation status
          ctx.fillStyle = checkpoint.userData.activated ? '#88ccff' : '#6a8a9a'; // Light blue if activated, grey-blue if not
          ctx.beginPath();
          ctx.arc(mapPos.x, mapPos.y, 3, 0, Math.PI * 2);
          ctx.fill();
          // Draw border for pillars
          ctx.strokeStyle = checkpoint.userData.activated ? '#44aaff' : '#4a6a7a';
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }
  
  // Draw center point (optional, for reference)
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(offsetX, offsetY, 1, 0, Math.PI * 2);
  ctx.fill();
}

