# Projectile Rendering Performance Optimizations

## Current State

### Issues Found (Before Optimization)
When shooting many projectiles, the rendering was **NOT optimized** and could cause lag:

1. **Each projectile is a separate THREE.Mesh** - Results in N draw calls (one per projectile)
2. **Each projectile created its own material** - Wasted memory and prevented material batching
3. **Each projectile has its own trail light** - Point lights are expensive (especially many at once)
4. **No batching** - Each projectile is rendered individually

### Performance Impact (Before)
- **100 projectiles** = 100 draw calls + 100 materials + 100 lights
- This causes significant performance degradation, especially on lower-end devices

## Optimizations Implemented

### 1. Material Caching (✅ Completed)
- **What**: Shared materials by color instead of creating new material per projectile
- **Benefit**: Reduces memory usage and allows material batching by WebGL
- **File**: `MaterialCache.js`
- **Impact**: Medium - reduces memory but doesn't reduce draw calls
- **Status**: ✅ Active by default

### 2. InstancedMesh Renderer (✅ Completed & Integrated)
- **What**: Batches multiple projectiles with the same material into a single draw call
- **Benefit**: Reduces draw calls from N to 1 per material group
- **File**: `InstancedProjectileRenderer.js`
- **Impact**: High - significantly improves performance with many projectiles
- **Status**: ✅ Active by default (enabled in ProjectileManager)

## Current Performance

With both optimizations enabled:
- **Memory**: ✅ Reduced (shared materials)
- **Draw Calls**: ✅ Optimized (1-2 per material group instead of N)
- **Lights**: ⚠️ Still expensive (one per projectile, can be optimized further)

### Performance Gains
- **100 projectiles**: 
  - Before: 100 draw calls + 100 materials + 100 lights
  - After: 1-2 draw calls + 2 materials (shared) + 100 lights
  - **50-100x improvement in draw calls**

## Additional Optimizations (Future)

### Option 1: Disable Trail Lights When Many Projectiles Active
- Reduce light count dynamically based on active projectile count
- Could reduce from 100 lights to 10-20 lights when many projectiles active

### Option 2: Frustum Culling
- Only render projectiles visible on screen
- Reduces rendering overhead for off-screen projectiles

### Option 3: Reduce Geometry Complexity
- Use lower segment count for projectiles when many are active
- Dynamic LOD based on projectile count

## Usage

Both optimizations are **automatically enabled** by default in `ProjectileManager`.

### Configuration
Instanced rendering is enabled by default but can be disabled if needed:

```javascript
// Disable instanced rendering (fallback to traditional rendering)
const projectileManager = new ProjectileManager(
  scene,
  collisionManager,
  particleManager,
  soundManager,
  false // useInstancedRendering = false
);
```

### How It Works
1. **Material Caching**: Automatically shares materials by color
2. **Instanced Rendering**: 
   - Projectiles are grouped by material (color)
   - Each group uses a single InstancedMesh
   - Individual meshes are kept for collision detection but hidden
   - Instance matrices are updated each frame

## Testing

To test performance improvements:
1. Shoot many projectiles rapidly (e.g., Lucy's multi-projectile ability)
2. Monitor FPS in browser dev tools
3. Compare performance before/after optimizations

Expected results:
- Before: FPS drops significantly with many projectiles
- After (material cache): Slight improvement, still drops with many projectiles
- After (InstancedMesh): Minimal FPS drop even with many projectiles

