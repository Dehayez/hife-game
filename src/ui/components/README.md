# UI Components Structure

## Component Patterns

All UI components follow a consistent structure:

### React Components
- Use `.jsx` extension for React components
- Structure: `ComponentName/index.jsx` (main component) + `functions.js` (helper functions)
- Examples: `CharacterSwitcher`, `GameModeSwitcher`, `InputModeSwitcher`, `ControlsLegend`

### Vanilla JS Components
- Use `.js` extension for vanilla JavaScript components
- Structure: `ComponentName/index.js` (main component) + `functions.js` (helper functions)
- Examples: `ArenaSwitcher`, `BotControl`, `ConnectionStatus`, `CooldownIndicator`, `GameMenu`, `GameModeDisplay`, `RespawnOverlay`, `RoomManager`, `Scoreboard`, `StartButton`

### Complex Components
- Components with multiple sub-components use subdirectories
- Example: `XboxButton/` contains subdirectories for each button variant (A, B, X, Y, LB, RB, LT, RT)

## Naming Conventions

- **Component directories**: PascalCase (e.g., `GameMenu`, `CharacterSwitcher`)
- **Main component files**: `index.js` or `index.jsx`
- **Helper function files**: `functions.js`
- **Additional files**: Descriptive names (e.g., `navigation.js`, `helpers.js`)

## File Structure

```
ComponentName/
├── index.js/jsx      # Main component file
├── functions.js      # Helper functions (optional)
└── [other files]    # Additional component-specific files
```

## Integration

- React components are initialized via `reactAdapters.jsx`
- Vanilla JS components are initialized directly
- All components are integrated into the game menu system via `UIInitializer.js`

