# Three.js Character Demo (Minimal)

A minimal browser-only Three.js scene with a small arena, a cube character, arrow-key movement, simple collision, and a following camera.

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

- Arrow keys
- WASD (QWERTY)
- ZQSD (AZERTY)

## Notes

- Minimal dependencies and small, focused files.
- BEM-like class names for UI overlay.
- Scene and logic live in `src/main.js`.

## Customize

- Walls: edit `addWall(...)` calls in `src/main.js`.
- Arena size: change `arenaSize`.
- Speed: change `moveSpeed`.
