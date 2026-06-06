# 3D Characters Setup Guide

## Quick Start

### 1. File Format Recommendation

**Use GLB format** - It's the best choice for web games:
- Single binary file (easier to manage)
- Efficient loading
- Smaller file size
- Includes textures, materials, and animations in one file

### 2. File Placement

Place your 3D model files here:

```
public/assets/characters/
├── lucy/
│   └── lucy.glb          ← Place your 3D model here
└── herald/
    └── herald.glb        ← Place your 3D model here
```

**Naming Convention**: `{characterName}.glb`
- Must match the character name exactly
- Example: `lucy.glb` for Lucy, `herald.glb` for Herald

### 3. Enable 3D Mode

Edit `src/config/character/CharacterRenderMode.js`:

```javascript
export const CHARACTER_RENDER_MODES = {
  lucy: RENDER_MODE.MODEL_3D,    // Use 3D model
  herald: RENDER_MODE.MODEL_3D   // Use 3D model
};
```

Or set globally:

```javascript
export const DEFAULT_RENDER_MODE = RENDER_MODE.MODEL_3D;
```

### 4. Configure Model Scale (Optional)

Edit `src/utils/Character3DLoader.js`:

```javascript
const CHARACTER_MODEL_CONFIGS = {
  lucy: {
    scale: 1.0,           // Adjust if model is wrong size
    animationSpeed: 1.0   // Animation playback speed
  }
};
```

## File Structure Summary

```
public/assets/characters/
├── lucy/
│   ├── lucy.glb              ← 3D model (GLB format)
│   ├── idle_front.png        ← 2D sprites (fallback/optional)
│   ├── walk_front_0.png
│   └── ... (other sprite files)
└── herald/
    ├── herald.glb            ← 3D model (GLB format)
    └── ... (sprite files)
```

## Model Requirements

1. **Format**: GLB (binary GLTF)
2. **Scale**: Should match sprite height (configurable)
3. **Animations**: Optional, but recommended
   - `idle`, `walk`, `run`, `jump`, `hit`, `death`, `spawn`
4. **Materials**: PBR materials (Metallic-Roughness)
5. **Performance**: 1000-5000 triangles recommended

## How It Works

1. **CharacterRenderMode.js**: Configures which characters use 3D vs 2D
2. **Character3DLoader.js**: Handles loading and managing 3D models
3. **CharacterManager.js**: Automatically switches between 2D/3D based on config
4. **Fallback**: If 3D model fails to load, automatically uses 2D sprites

## Testing

1. Place your `.glb` file in the character directory
2. Update `CharacterRenderMode.js` to enable 3D mode
3. Run `yarn dev`
4. Select the character in-game
5. Verify the 3D model loads and displays correctly

## Troubleshooting

- **Model not showing**: Check file name matches `{characterName}.glb`
- **Wrong size**: Adjust `scale` in `Character3DLoader.js`
- **No animations**: Verify animations are exported with GLB
- **Performance issues**: Reduce polygon count or use sprite fallback

## More Information

See `public/assets/characters/README_3D_MODELS.md` for detailed documentation.


