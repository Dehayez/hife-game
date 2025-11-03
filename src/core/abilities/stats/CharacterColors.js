/**
 * CharacterColors.js
 * 
 * Centralized character color definitions.
 * This is the single source of truth for character colors throughout the codebase.
 */

/**
 * Character Color Configuration
 * 
 * All character colors defined here to avoid duplication.
 */
export const CHARACTER_COLORS = {
  lucy: {
    hex: 0x9c57b6,           // Purple color (hex number for Three.js)
    css: '#9c57b6',          // CSS hex string
    rgb: '156, 87, 182'      // RGB string for CSS rgba()
  },
  herald: {
    hex: 0xf5ba0b,           // Gold color (hex number for Three.js)
    css: '#f5ba0b',          // CSS hex string
    rgb: '245, 186, 11'      // RGB string for CSS rgba()
  }
};

/**
 * Get character color as hex number (for Three.js)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {number} Color as hex number
 */
export function getCharacterColorHex(characterName) {
  return CHARACTER_COLORS[characterName]?.hex || CHARACTER_COLORS.lucy.hex;
}

/**
 * Get character color as CSS hex string
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {string} Color as CSS hex string
 */
export function getCharacterColorCss(characterName) {
  return CHARACTER_COLORS[characterName]?.css || CHARACTER_COLORS.lucy.css;
}

/**
 * Get character color as RGB string
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {string} Color as RGB string (e.g., '156, 87, 182')
 */
export function getCharacterColorRgb(characterName) {
  return CHARACTER_COLORS[characterName]?.rgb || CHARACTER_COLORS.lucy.rgb;
}

/**
 * Get character color values object (for UI styling)
 * @param {string} characterName - Character name ('lucy' or 'herald')
 * @returns {{color: string, rgb: string}} Color hex and RGB values
 */
export function getCharacterColorValues(characterName) {
  const colors = CHARACTER_COLORS[characterName] || CHARACTER_COLORS.lucy;
  return {
    color: colors.css,
    rgb: colors.rgb
  };
}

