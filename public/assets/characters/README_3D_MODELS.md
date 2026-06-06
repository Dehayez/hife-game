# 3D Character Models Guide

This guide explains how to add and use 3D character models in the game.

## File Format

**Recommended Format: GLB (Binary GLTF)**

- **GLB** is the recommended format for web games:
  - Single binary file (easier to manage than GLTF + separate textures)
  - Efficient loading and smaller file size
  - Widely supported by Three.js
  - Can include animations, textures, and materials in one file

- **GLTF** (text-based) is also supported but less efficient:
  - Requires separate texture files
  - Larger file size
  - More complex loading

## File Placement

Place 3D model files in the character's directory:

```
public/assets/characters/
├── lucy/
│   ├── lucy.glb          ← 3D model file (GLB format)
│   ├── idle_front.png    ← 2D sprites (fallback/optional)
│   └── ...
└── herald/
    ├── herald.glb        ← 3D model file (GLB format)
    ├── idle_front.png    ← 2D sprites (fallback/optional)
    └── ...
```

### Naming Convention

- **3D Model File**: `{characterName}.glb`
  - Example: `lucy.glb`, `herald.glb`
  - Must match the character name exactly

## Model Requirements

### Recommended Specifications

1. **Scale**: Models should be sized appropriately for the game world
   - Default scale is 1.0, but can be adjusted per character in `Character3DLoader.js`
   - Character height should match the sprite height (configured in `CharacterStats.js`)

2. **Animations**: Models can include animations
   - Animation names should follow conventions:
     - `idle` - Idle animation
     - `walk` - Walking animation
     - `run` - Running animation
     - `jump` - Jumping animation
     - `hit` - Hit/damage animation
     - `death` - Death animation
     - `spawn` - Spawn animation

3. **Materials**: 
   - Use PBR materials (Metallic-Roughness workflow) for best results
   - Textures should be embedded in GLB or referenced properly
   - Ensure proper shadow casting/receiving

4. **Geometry**:
   - Optimize polygon count for web performance
   - Recommended: 1000-5000 triangles per character
   - Use LOD (Level of Detail) if needed

## Enabling 3D Models

### Method 1: Per-Character Configuration

Edit `src/config/character/CharacterRenderMode.js`:

```javascript
export const CHARACTER_RENDER_MODES = {
  lucy: RENDER_MODE.MODEL_3D,  // Use 3D model
  herald: RENDER_MODE.SPRITE    // Use 2D sprites
};
```

### Method 2: Global Default

Change the default render mode:

```javascript
export const DEFAULT_RENDER_MODE = RENDER_MODE.MODEL_3D;
```

## Model Configuration

Adjust model scale and animation speed in `src/utils/Character3DLoader.js`:

```javascript
const CHARACTER_MODEL_CONFIGS = {
  lucy: {
    scale: 1.0,           // Scale multiplier
    animationSpeed: 1.0   // Animation speed multiplier
  },
  herald: {
    scale: 1.2,           // Larger scale
    animationSpeed: 1.2   // Faster animations
  }
};
```

## Creating GLB Files

### Using Blender

1. Model your character
2. Set up materials and textures
3. Create animations (if needed)
4. Export as GLB:
   - File → Export → glTF 2.0 (.glb)
   - Settings:
     - Format: GLB (binary)
     - Include: Selected Objects, Animations, Materials & Textures
     - Transform: +Y Up
     - Geometry: Apply Modifiers

### Using Other Tools

- **Maya**: Use glTF exporter plugin
- **3ds Max**: Use glTF exporter plugin
- **Online Converters**: Various tools can convert OBJ/FBX to GLB

## Testing

1. Place your `.glb` file in the character directory
2. Update `CharacterRenderMode.js` to use `RENDER_MODE.MODEL_3D`
3. Run the game: `yarn dev`
4. Select the character and verify the model loads correctly

## Troubleshooting

### Model doesn't appear
- Check file path matches naming convention (`{characterName}.glb`)
- Verify file is in `public/assets/characters/{characterName}/`
- Check browser console for loading errors

### Model is wrong size
- Adjust scale in `CHARACTER_MODEL_CONFIGS` in `Character3DLoader.js`
- Check model's original scale in your 3D software

### Animations not working
- Verify animations are exported with the GLB file
- Check animation names match expected conventions
- Ensure animation mixer is set up correctly

### Performance issues
- Reduce polygon count
- Optimize textures (use compressed formats)
- Use LOD models for distant characters
- Consider using sprite fallback for low-end devices

## Fallback Behavior

The game will automatically fall back to 2D sprites if:
- 3D model file is not found
- Model fails to load
- Render mode is set to `RENDER_MODE.SPRITE`

This ensures the game remains playable even if 3D assets are missing.


