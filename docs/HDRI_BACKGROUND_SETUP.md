# HDRI Background Setup Guide

This guide explains how to install and use HDRI backgrounds in your Three.js scene, similar to how Blender handles environment maps.

## Overview

HDRI (High Dynamic Range Image) backgrounds provide realistic lighting and reflections, just like in Blender. They can be used to:
- Set realistic scene backgrounds
- Provide environment-based lighting
- Add realistic reflections to materials

## Supported Formats

- **.hdr** (RGBE format) - Most common HDRI format
- **.exr** (OpenEXR format) - High-quality format with better dynamic range

## Getting HDRI Files

You can download free HDRI files from:
- [Poly Haven](https://polyhaven.com/hdris) - High-quality, CC0 licensed HDRIs
- [HDRI Haven](https://hdrihaven.com/) - Free HDRIs
- [3D Model Haven](https://3dmodelhaven.com/) - Various HDRI collections

Recommended HDRIs for game environments:
- Forest/outdoor scenes
- Sky/cloud environments
- Studio lighting setups
- Night environments

## Installation Steps

### 1. Add HDRI File to Project

Place your HDRI file in the `public/assets/environments/` directory:

```
public/
  assets/
    environments/
      forest_sky.hdr
      night_sky.exr
      studio.hdr
```

### 2. Load Environment Map in Code

After initializing your scene manager, call `loadEnvironmentMap()`:

```javascript
// Example: In your game initialization code
import { initializeManagers } from './core/ManagerInitializer.js';

// Initialize managers
const { sceneManager } = initializeManagers(canvas, 'standard');

// Load HDRI background (after scene is initialized)
try {
  await sceneManager.loadEnvironmentMap('/assets/environments/forest_sky.hdr');
} catch (error) {
  console.error('Failed to load environment:', error);
}
```

### 3. Configuration Options

You can customize how the environment map is used:

```javascript
await sceneManager.loadEnvironmentMap('/assets/environments/studio.hdr', {
  useAsBackground: true,    // Set as scene background (default: true)
  useAsEnvironment: true,    // Use for reflections/lighting (default: true)
  pmremSize: 256            // PMREM texture size (default: 256)
});
```

**Options:**
- `useAsBackground`: If `true`, sets the HDRI as the scene background
- `useAsEnvironment`: If `true`, uses the HDRI for environment lighting and reflections
- `pmremSize`: Size of the prefiltered environment map (higher = better quality, slower)

## Usage Examples

### Basic Usage

```javascript
// Load environment map after scene initialization
const { sceneManager } = initializeManagers(canvas, 'standard');

// Load HDRI background
await sceneManager.loadEnvironmentMap('/assets/environments/forest_sky.hdr');
```

### Background Only (No Reflections)

```javascript
await sceneManager.loadEnvironmentMap('/assets/environments/sky.hdr', {
  useAsBackground: true,
  useAsEnvironment: false  // Don't use for reflections
});
```

### Environment Only (No Background)

```javascript
await sceneManager.loadEnvironmentMap('/assets/environments/studio.hdr', {
  useAsBackground: false,   // Keep default background color
  useAsEnvironment: true   // Use for reflections only
});
```

### Remove Environment Map

```javascript
// Restore default background
sceneManager.removeEnvironmentMap(); // Uses default color 0x0a1a1f

// Or specify custom default color
sceneManager.removeEnvironmentMap(0x000000); // Black background
```

## How It Works

1. **Loading**: The `EnvironmentLoader` loads the HDRI file using `RGBELoader` or `EXRLoader`
2. **Processing**: A `PMREMGenerator` creates a prefiltered environment map for realistic reflections
3. **Application**: The environment map is applied to:
   - `scene.background` - Visible background
   - `scene.environment` - Used for reflections and environment lighting

## Performance Considerations

- **File Size**: HDRI files can be large (several MB). Consider using compressed formats or lower resolution files for web
- **PMREM Size**: Higher values (512, 1024) provide better quality but take longer to generate
- **Caching**: Environment maps are cached automatically to prevent reloading

## Tips

1. **Match Your Scene**: Choose HDRIs that match your game's aesthetic (forest, night, studio, etc.)
2. **File Size**: For web games, use compressed HDRIs or lower resolution versions
3. **Lighting**: Environment maps affect scene lighting. You may need to adjust existing lights
4. **Materials**: Materials with `metalness` and `roughness` will reflect the environment map
5. **Fog**: Environment maps work with fog, but you may want to disable fog for clearer backgrounds

## Troubleshooting

### Environment Map Not Loading
- Check file path is correct (relative to `public/` directory)
- Verify file format is `.hdr` or `.exr`
- Check browser console for errors

### Performance Issues
- Reduce `pmremSize` (try 128 or 256)
- Use lower resolution HDRI files
- Consider using background only (`useAsEnvironment: false`)

### Background Not Visible
- Ensure `useAsBackground: true` in options
- Check that scene is initialized before loading
- Verify HDRI file loaded successfully (check console)

## Example: Complete Setup

```javascript
import { initializeManagers } from './core/ManagerInitializer.js';

async function initGame() {
  const canvas = document.getElementById('app-canvas');
  const { sceneManager } = initializeManagers(canvas, 'standard');
  
  // Load HDRI background
  try {
    await sceneManager.loadEnvironmentMap('/assets/environments/magical_forest.hdr', {
      useAsBackground: true,
      useAsEnvironment: true,
      pmremSize: 256
    });
    console.log('HDRI background loaded successfully!');
  } catch (error) {
    console.error('Failed to load HDRI:', error);
    // Fallback to default background
  }
  
  // Continue with game initialization...
}

initGame();
```

## Advanced: Dynamic Environment Switching

You can switch environments at runtime:

```javascript
// Load different environment for different game modes
async function switchToNightMode() {
  await sceneManager.loadEnvironmentMap('/assets/environments/night_sky.hdr');
}

async function switchToDayMode() {
  await sceneManager.loadEnvironmentMap('/assets/environments/day_sky.hdr');
}

// Remove environment for default background
function resetToDefault() {
  sceneManager.removeEnvironmentMap();
}
```

## See Also

- [Three.js Environment Maps Documentation](https://threejs.org/docs/#api/en/scenes/Scene.environment)
- [PMREMGenerator Documentation](https://threejs.org/docs/#api/en/extras/PMREMGenerator)
- [RGBELoader Documentation](https://threejs.org/docs/#examples/en/loaders/RGBELoader)


