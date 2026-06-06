/**
 * worldHandler.js
 *
 * Server-side handling of Apocalypse Cottage `world-event` messages:
 * terrain edits, tree lifecycle, and block placement. Maintains per-room
 * authoritative world state so new joiners can be hydrated with a snapshot.
 */

import { rateLimiter } from './playerHandler.js';

const VALID_TYPES = new Set([
  'terrain',
  'tree-plant',
  'tree-stage',
  'tree-chop',
  'block-place',
  'block-remove'
]);

// roomCode → { terrain: Map<"ix,iz", h>, trees: Map<id, treeState>, blocks: Map<"ix,iz,iy", {type}> }
const worldStateByRoom = new Map();

function ensureWorldState(roomCode) {
  let s = worldStateByRoom.get(roomCode);
  if (!s) {
    s = { terrain: new Map(), trees: new Map(), blocks: new Map() };
    worldStateByRoom.set(roomCode, s);
  }
  return s;
}

function clamp(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}

function asInt(n) {
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Light validation per event type. Returns a cleaned payload or null. */
function validatePayload(type, data) {
  if (!data || typeof data !== 'object') return null;
  switch (type) {
    case 'terrain': {
      const ix = asInt(data.ix);
      const iz = asInt(data.iz);
      const h = Number.isFinite(data.h) ? clamp(data.h, -100, 100) : null;
      if (ix === null || iz === null || h === null) return null;
      return { ix, iz, h };
    }
    case 'tree-plant': {
      const ix = asInt(data.ix);
      const iz = asInt(data.iz);
      const id = typeof data.id === 'string' && data.id.length <= 32 ? data.id : null;
      if (ix === null || iz === null || !id) return null;
      return { id, ix, iz };
    }
    case 'tree-stage': {
      const id = typeof data.id === 'string' && data.id.length <= 32 ? data.id : null;
      const stage = typeof data.stage === 'string' && data.stage.length <= 16 ? data.stage : null;
      if (!id || !stage) return null;
      return { id, stage };
    }
    case 'tree-chop': {
      const id = typeof data.id === 'string' && data.id.length <= 32 ? data.id : null;
      const fell = !!data.fell;
      if (!id) return null;
      return { id, fell };
    }
    case 'block-place': {
      const ix = asInt(data.ix);
      const iz = asInt(data.iz);
      const iy = asInt(data.iy);
      const type = typeof data.type === 'string' && data.type.length <= 16 ? data.type : null;
      if (ix === null || iz === null || iy === null || !type) return null;
      return { ix, iz, iy, type };
    }
    case 'block-remove': {
      const ix = asInt(data.ix);
      const iz = asInt(data.iz);
      const iy = asInt(data.iy);
      if (ix === null || iz === null || iy === null) return null;
      return { ix, iz, iy };
    }
    default:
      return null;
  }
}

/** Apply a validated event to the room's authoritative state. */
function applyToRoomState(state, type, payload) {
  switch (type) {
    case 'terrain':
      state.terrain.set(`${payload.ix},${payload.iz}`, payload.h);
      return;
    case 'tree-plant':
      state.trees.set(payload.id, { ix: payload.ix, iz: payload.iz, stage: 'sapling', stageAge: 0 });
      return;
    case 'tree-stage': {
      const t = state.trees.get(payload.id);
      if (t) { t.stage = payload.stage; t.stageAge = 0; }
      if (payload.stage === 'dead') state.trees.delete(payload.id);
      return;
    }
    case 'tree-chop':
      if (payload.fell) state.trees.delete(payload.id);
      return;
    case 'block-place':
      state.blocks.set(`${payload.ix},${payload.iz},${payload.iy}`, { type: payload.type });
      return;
    case 'block-remove':
      state.blocks.delete(`${payload.ix},${payload.iz},${payload.iy}`);
      return;
  }
}

export function handleWorldEvent(socket, players, evt) {
  if (!rateLimiter.isAllowed(socket.id, 'world-event')) {
    return;
  }
  const player = players.get(socket.id);
  if (!player || !player.roomCode) return;

  if (!evt || typeof evt !== 'object') return;
  const { type, ...data } = evt;
  if (!VALID_TYPES.has(type)) return;
  const clean = validatePayload(type, data);
  if (!clean) return;

  const state = ensureWorldState(player.roomCode);
  applyToRoomState(state, type, clean);

  socket.to(player.roomCode).emit('world-event', {
    playerId: socket.id,
    type,
    ...clean
  });
}

/**
 * Build a snapshot payload describing the entire current world state for a
 * room, for hydrating a joining player.
 */
export function buildWorldSnapshot(roomCode) {
  const state = worldStateByRoom.get(roomCode);
  if (!state) return { terrain: [], trees: [], blocks: [] };
  const terrain = [];
  for (const [key, h] of state.terrain) {
    const [ix, iz] = key.split(',').map(Number);
    terrain.push({ ix, iz, h });
  }
  const trees = [];
  for (const [id, t] of state.trees) {
    trees.push({ id, ix: t.ix, iz: t.iz, stage: t.stage, stageAge: t.stageAge });
  }
  const blocks = [];
  for (const [key, b] of state.blocks) {
    const [ix, iz, iy] = key.split(',').map(Number);
    blocks.push({ ix, iz, iy, type: b.type });
  }
  return { terrain, trees, blocks };
}

export function clearRoomWorld(roomCode) {
  worldStateByRoom.delete(roomCode);
}
