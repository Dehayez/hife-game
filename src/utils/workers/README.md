# Web Worker Optimization System

This directory contains Web Worker implementations for optimizing asset loading and data processing in parallel without blocking the main thread.

## Overview

Web Workers allow the game to perform heavy operations (file existence checks, JSON loading, asset prefetching) in parallel on a separate thread, keeping the main thread responsive for rendering and user interactions.

## Files

### AssetPreloadWorker.js
The Web Worker that handles:
- **File existence checks** - Parallel HEAD requests to check if files exist
- **JSON loading** - Parallel loading of JSON configuration files
- **Asset prefetching** - Warming browser cache by prefetching assets
- **Animation metadata processing** - Parallel processing of animation metadata

### WorkerManager.js
The main interface for using Web Workers:
- `initWorker()` - Initialize the worker (called automatically)
- `checkFilesExist(paths)` - Check multiple files in parallel
- `loadJsonFiles(paths)` - Load multiple JSON files in parallel
- `prefetchAssets(paths)` - Prefetch assets to warm cache
- `processAnimationMetadata(basePaths)` - Process animation metadata in parallel
- `terminateWorker()` - Clean up worker (for testing/debugging)

## Usage

### Basic Usage

```javascript
import { checkFilesExist, loadJsonFiles } from './utils/workers/WorkerManager.js';

// Check multiple files in parallel
const fileExists = await checkFilesExist([
  '/assets/audio/sound1.wav',
  '/assets/audio/sound2.wav',
  '/assets/audio/sound3.wav'
]);

// Load multiple JSON files in parallel
const jsonData = await loadJsonFiles([
  '/assets/animations/idle.json',
  '/assets/animations/walk.json'
]);
```

### Integration with Loaders

The worker system is automatically integrated into:
- **AudioLoader** - Uses workers for parallel format fallback checking
- **TextureLoader** - Uses workers for parallel JSON metadata loading

### Fallback Behavior

If Web Workers are unavailable (older browsers, security restrictions), the system automatically falls back to sequential operations on the main thread, ensuring compatibility.

## Performance Benefits

1. **Parallel Processing** - Multiple file checks/loads happen simultaneously
2. **Non-blocking** - Main thread stays responsive during asset loading
3. **Cache Warming** - Assets can be prefetched in background
4. **Faster Load Times** - Reduced total loading time through parallelism

## Browser Support

Web Workers are supported in all modern browsers. The system includes fallback mechanisms for environments where workers aren't available.

## Best Practices

- Use batch operations when possible (checking/loading multiple files)
- Workers are initialized early in `main.js` for optimal performance
- Workers automatically handle timeouts and errors gracefully
- Results are cached to avoid redundant worker calls

