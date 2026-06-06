/**
 * BlockConfig.js
 *
 * Apocalypse Cottage placeable block types. Each block is a 1×1×1 cube
 * aligned to the terrain grid X/Z and stacked in Y.
 */

export const BLOCK_TYPE = {
  WOOD: 'wood',
  STONE: 'stone',
  THATCH: 'thatch'
};

export const BLOCK_CONFIG = {
  [BLOCK_TYPE.WOOD]: {
    label: 'Wood',
    color: 0xc9a072,         // pale cottagecore timber
    cost: { wood: 1 },
    roughness: 0.9,
    metalness: 0.0
  },
  [BLOCK_TYPE.STONE]: {
    label: 'Stone',
    color: 0xa8b0a4,         // mossy pebble
    cost: { stone: 2 },
    roughness: 0.85,
    metalness: 0.05
  },
  [BLOCK_TYPE.THATCH]: {
    label: 'Thatch',
    color: 0xe8a78a,         // soft coral roof
    cost: { wood: 1, mushroom: 1 },
    roughness: 0.85,
    metalness: 0.0
  }
};

export const BLOCK_TYPE_BY_SLOT = {
  1: BLOCK_TYPE.WOOD,
  2: BLOCK_TYPE.STONE,
  3: BLOCK_TYPE.THATCH
};

export function getBlockConfig(type) {
  return BLOCK_CONFIG[type] || null;
}
