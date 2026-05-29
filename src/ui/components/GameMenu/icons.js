// Inline SVG icons for the menu section pills.
// Lucide-style 24x24 stroked icons; stroke uses currentColor so the active
// state can recolor them via CSS.

const wrap = (paths) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths}</svg>`;

export const MenuIcons = {
  // Gamepad — Current Game Mode
  currentGameMode: wrap(`
    <line x1="6" y1="11" x2="10" y2="11" />
    <line x1="8" y1="9" x2="8" y2="13" />
    <line x1="15" y1="12" x2="15.01" y2="12" />
    <line x1="18" y1="10" x2="18.01" y2="10" />
    <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
  `),

  // Target — Game Mode
  gameMode: wrap(`
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  `),

  // Map — Arena
  arena: wrap(`
    <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6" />
    <line x1="9" y1="3" x2="9" y2="18" />
    <line x1="15" y1="6" x2="15" y2="21" />
  `),

  // Sliders — Controls
  controls: wrap(`
    <line x1="4" y1="21" x2="4" y2="14" />
    <line x1="4" y1="10" x2="4" y2="3" />
    <line x1="12" y1="21" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12" y2="3" />
    <line x1="20" y1="21" x2="20" y2="16" />
    <line x1="20" y1="12" x2="20" y2="3" />
    <line x1="1" y1="14" x2="7" y2="14" />
    <line x1="9" y1="8" x2="15" y2="8" />
    <line x1="17" y1="16" x2="23" y2="16" />
  `),

  // Keyboard — Input Mode
  inputMode: wrap(`
    <rect x="2" y="6" width="20" height="12" rx="2" ry="2" />
    <line x1="6" y1="10" x2="6" y2="10" />
    <line x1="10" y1="10" x2="10" y2="10" />
    <line x1="14" y1="10" x2="14" y2="10" />
    <line x1="18" y1="10" x2="18" y2="10" />
    <line x1="6" y1="14" x2="6" y2="14" />
    <line x1="18" y1="14" x2="18" y2="14" />
    <line x1="9" y1="14" x2="15" y2="14" />
  `),

  // Volume — Audio Settings
  audioSettings: wrap(`
    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
    <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
  `),

  // Door — Rooms
  rooms: wrap(`
    <path d="M4 21V5a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v16" />
    <line x1="2" y1="21" x2="22" y2="21" />
    <line x1="13" y1="12" x2="13.01" y2="12" />
  `),

  // Bot — Bot Control
  botControl: wrap(`
    <rect x="4" y="8" width="16" height="12" rx="2" />
    <path d="M12 8V4" />
    <circle cx="12" cy="3" r="1" />
    <circle cx="9" cy="13" r="1" />
    <circle cx="15" cy="13" r="1" />
    <line x1="9" y1="17" x2="15" y2="17" />
    <line x1="2" y1="14" x2="4" y2="14" />
    <line x1="20" y1="14" x2="22" y2="14" />
  `),

  // Trending up — Bot Learning Progress
  learning: wrap(`
    <polyline points="3 17 9 11 13 15 21 7" />
    <polyline points="14 7 21 7 21 14" />
  `),
};
