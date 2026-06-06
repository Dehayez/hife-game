/**
 * TreeConfig.js
 *
 * Tree lifecycle tuning for Apocalypse Cottage.
 */

export const TREE_STAGE = {
  SAPLING: 'sapling',
  YOUNG: 'young',
  MATURE: 'mature',
  WITHERING: 'withering',
  DEAD: 'dead'
};

export const TREE_CONFIG = {
  // Seconds spent in each stage before auto-advance to the next.
  stageDurations: {
    [TREE_STAGE.SAPLING]: 6,
    [TREE_STAGE.YOUNG]: 18,
    [TREE_STAGE.MATURE]: 45,
    [TREE_STAGE.WITHERING]: 25,
    [TREE_STAGE.DEAD]: 12
  },

  // Visual sizes per stage (radius, trunk height)
  visual: {
    [TREE_STAGE.SAPLING]:   { trunkH: 0.4, trunkR: 0.06, leafR: 0.25, color: 0xa3d68a },
    [TREE_STAGE.YOUNG]:     { trunkH: 1.1, trunkR: 0.12, leafR: 0.55, color: 0x86c272 },
    [TREE_STAGE.MATURE]:    { trunkH: 2.2, trunkR: 0.2,  leafR: 1.1,  color: 0x6ea85f },
    [TREE_STAGE.WITHERING]: { trunkH: 2.2, trunkR: 0.2,  leafR: 0.9,  color: 0xb29a7a },
    [TREE_STAGE.DEAD]:      { trunkH: 2.0, trunkR: 0.18, leafR: 0.0,  color: 0x4a3540 }
  },

  trunkColor: 0x6a4a3a,

  // Wood yielded by chopping at each stage.
  woodYield: {
    [TREE_STAGE.SAPLING]: 0,
    [TREE_STAGE.YOUNG]: 1,
    [TREE_STAGE.MATURE]: 3,
    [TREE_STAGE.WITHERING]: 2,
    [TREE_STAGE.DEAD]: 1
  },

  // Hits required to fell the tree at each stage.
  chopHits: {
    [TREE_STAGE.SAPLING]: 1,
    [TREE_STAGE.YOUNG]: 2,
    [TREE_STAGE.MATURE]: 4,
    [TREE_STAGE.WITHERING]: 3,
    [TREE_STAGE.DEAD]: 2
  }
};

export function getTreeConfig() {
  return TREE_CONFIG;
}
