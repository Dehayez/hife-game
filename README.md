# Hife - Magical Forest Adventure

A magical 3D browser game built with Three.js featuring a mystical forest environment, character movement, multiple game modes, and two distinct arena sizes.

## Features

- 🎮 **Two Arenas**: Choose between Forest Plaza (20x20) or Ancient Grove (40x40)
- 👥 **Two Characters**: Play as Lucy or Herald
- 🎯 **Multiple Game Modes**:
  - Forest Wander (Free Play)
  - Crystal Shrine (Time Trial)
  - Gem Gathering (Collection)
  - Shadow Escape (Survival)
- 🌲 **Diverse Obstacles**: Walls, platforms, pillars, bridges, and elevated structures
- 🎵 **Sound System**: Footsteps, jumps, landing sounds, and background music
- ✨ **Magical Atmosphere**: Glowing mushrooms, firefly particles, and moonlit forest

## Run

You have two options:

1) Open Directly
- Open `index.html` in a modern browser (Chrome, Edge, Firefox, Safari).

2) Dev Server (recommended)
- Install deps: `yarn`
- Start: `yarn dev` (or `yarn start`)
- Build: `yarn build`
- Preview build: `yarn preview`

## Controls

- Arrow keys / WASD / ZQSD - Move
- Hold Shift - Sprint
- Space - Jump

## Notes

- Minimal dependencies and small, focused files.
- BEM-like class names for UI overlay.
- Scene and logic live in `src/main.js`.

## URL Parameters

- `?char=lucy` or `?char=herald` - Select character
- `?arena=standard` or `?arena=large` - Select arena size
- `?mode=free-play` - Select game mode (free-play, time-trial, collection, survival)

## Arena Differences

### Forest Plaza (Standard)
- 20x20 arena size
- Compact obstacle layout
- Perfect for quick gameplay

### Ancient Grove (Large)
- 40x40 arena size
- Diverse obstacles including:
  - Corridor-style passageways
  - Central maze structures
  - Elevated platforms
  - Cylindrical pillars
  - Bridge structures
  - Multiple jumping challenges
- More trees and magical elements
- Excellent for exploration and extended gameplay

## Character sprites (GIFs)

You can use PNG sprite-sheets with adjustable FPS via a tiny JSON file.

Per-character folder structure (example):

- `public/assets/characters/lucy/idle_front.png`
- `public/assets/characters/lucy/idle_front.json` (optional metadata)
- `public/assets/characters/lucy/idle_back.png`
- `public/assets/characters/lucy/idle_back.json`
- EITHER sprite-sheets:
  - `public/assets/characters/lucy/walk_front.png` + `walk_front.json`
  - `public/assets/characters/lucy/walk_back.png` + `walk_back.json`
  - (and `idle_front.*`, `idle_back.*` similarly)
  
  OR numbered frames (no sheet):
  - `public/assets/characters/lucy/walk_front_0.png`
  - `public/assets/characters/lucy/walk_front_1.png`
  - `public/assets/characters/lucy/walk_front_2.png`
  - `public/assets/characters/lucy/walk_front_3.png`
  - (and `walk_back_*.png`, `idle_front_*.png`, `idle_back_*.png` if animated)

Sprite-sheet format:
- Frames laid out horizontally in a single PNG (same height, equal width per frame).
- Metadata JSON (optional) next to each PNG:

```json
{
  "frameCount": 6,
  "fps": 8
}
```

If the JSON is missing, the PNG is treated as a single-frame image (no animation).

Numbered frames (no JSON):
- Name frames with a `_0, _1, _2, ...` suffix.
- If no JSON exists for that animation, 4 frames are assumed for walking by default (you can add a `.json` with `frameCount` to change that).

Character selection:
- Choose character via URL param, e.g.: `?char=lucy` or `?char=herald`
- Default is `lucy` if the param is not provided.

The engine automatically switches between idle/walk and front/back depending on movement.
