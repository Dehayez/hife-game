/**
 * TerrainConfig.js
 *
 * Tuning constants for the Apocalypse Cottage heightmap terrain.
 */

export const TERRAIN_CONFIG = {
  cellsPerUnit: 2,        // 2 cells per world-unit → 0.5u tiles
  step: 0.5,              // Height delta per dig/raise action
  minHeight: -6,
  maxHeight: 12,
  actionCooldownMs: 90,   // Min ms between repeated terraform actions while holding

  // Pastel palette stops by height (each entry: [height, color hex])
  // Lower → wetter, higher → drier
  paletteStops: [
    { h: -6, color: 0x4a6a78 },  // deep teal pit
    { h: -2, color: 0x6a8a82 },  // mossy mud
    { h: 0,  color: 0x7ba36a },  // mossy meadow
    { h: 2,  color: 0xa3b06a },  // pale moss
    { h: 5,  color: 0xc8b58a },  // sandy beige
    { h: 9,  color: 0xe0a896 },  // pale coral peak
    { h: 12, color: 0xf2d6c4 }   // chalk peak
  ],

  // Maximum reticle reach in world units from camera
  reticleMaxDistance: 18,
  reticleColor: 0xfff2c4
};

export function getTerrainConfig() {
  return TERRAIN_CONFIG;
}
