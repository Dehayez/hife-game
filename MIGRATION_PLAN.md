# Abilities Folder Reorganization - Migration Plan

## New Structure

```
src/core/abilities/
├── config/
│   ├── base/
│   │   ├── BaseStats.js (attack stats)
│   │   ├── BoltAttackConfig.js (visual/physics)
│   │   ├── BoltParticleConfig.js (particles)
│   │   ├── MortarAttackConfig.js (visual/physics)
│   │   ├── MortarParticleConfig.js (particles)
│   │   ├── MeleeAttackConfig.js (visual/physics)
│   │   └── MeleeParticleConfig.js (particles)
│   └── characters/
│       ├── lucy/
│       │   ├── bolt/
│       │   │   ├── AttackConfig.js ✓
│       │   │   └── ParticleConfig.js ✓
│       │   ├── mortar/
│       │   │   ├── AttackConfig.js ✓
│       │   │   └── ParticleConfig.js
│       │   └── melee/
│       │       ├── AttackConfig.js ✓
│       │       └── ParticleConfig.js
│       └── herald/
│           ├── bolt/
│           │   ├── AttackConfig.js ✓
│           │   └── ParticleConfig.js
│           ├── mortar/
│           │   ├── AttackConfig.js ✓
│           │   └── ParticleConfig.js
│           └── melee/
│               ├── AttackConfig.js ✓
│               └── ParticleConfig.js
│
└── implementation/
    ├── bolt/ (all bolt implementation files)
    ├── mortar/ (all mortar implementation files)
    ├── particles/ (particle calculation files)
    ├── collision/ (collision handlers)
    ├── utils/ (utility functions)
    ├── ProjectileManager.js
    └── CharacterAbilityStats.js (merger/helper)
```

## Remaining Tasks

1. Create remaining base config files (MortarAttackConfig, MortarParticleConfig, MeleeAttackConfig, MeleeParticleConfig)
2. Create remaining character-specific ParticleConfig.js files
3. Move all implementation files to implementation/ folder
4. Update all import paths throughout codebase
5. Create backwards-compatible index files if needed

## Files to Move to Implementation/

### Bolt files:
- bolt/Bolt.js
- bolt/BoltCollision.js
- bolt/BoltCreation.js
- bolt/BoltCursorFollowing.js
- bolt/BoltCursorTracking.js
- bolt/BoltPositionUpdate.js
- bolt/BoltRemoval.js
- bolt/BoltSpeedCalculation.js
- bolt/BoltUpdate.js
- bolt/BoltVisualEffects.js

### Mortar files:
- mortar/BaseMortar.js
- mortar/Mortar.js
- mortar/MortarArcPreview.js
- mortar/SplashArea.js
- mortar/SplashAreaAnimation.js
- mortar/SplashAreaParticles.js

### Particles:
- particles/ParticleCalculation.js

### Collision:
- collision/CollisionHandler.js

### Utils:
- utils/CleanupUtils.js
- utils/GeometryUtils.js
- utils/LightUtils.js
- utils/VectorUtils.js

### Root:
- ProjectileManager.js
- AbilityConfig.js (remove - split into base configs)
- stats/CharacterAbilityStats.js (keep as merger, move to implementation/)

