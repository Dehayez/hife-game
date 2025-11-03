# Abilities Folder Reorganization - Status

## ✅ Completed

### Config Structure Created
- ✅ `config/base/BaseStats.js` - Global base stats
- ✅ `config/base/BoltAttackConfig.js` - Base bolt visual/physics config
- ✅ `config/base/BoltParticleConfig.js` - Base bolt particle config
- ✅ `config/base/MortarAttackConfig.js` - Base mortar visual/physics config (includes SPLASH_AREA_CONFIG)
- ✅ `config/base/MortarParticleConfig.js` - Base mortar particle config
- ✅ `config/base/MeleeAttackConfig.js` - General ability config
- ✅ `config/base/MeleeParticleConfig.js` - Melee particle config
- ✅ `config/CharacterColors.js` - Character color definitions

### Character Configs Created
- ✅ `config/characters/lucy/bolt/AttackConfig.js`
- ✅ `config/characters/lucy/bolt/ParticleConfig.js`
- ✅ `config/characters/lucy/mortar/AttackConfig.js`
- ✅ `config/characters/lucy/mortar/ParticleConfig.js`
- ✅ `config/characters/lucy/melee/AttackConfig.js`
- ✅ `config/characters/lucy/melee/ParticleConfig.js`
- ✅ `config/characters/herald/bolt/AttackConfig.js`
- ✅ `config/characters/herald/bolt/ParticleConfig.js`
- ✅ `config/characters/herald/mortar/AttackConfig.js`
- ✅ `config/characters/herald/mortar/ParticleConfig.js`
- ✅ `config/characters/herald/melee/AttackConfig.js`
- ✅ `config/characters/herald/melee/ParticleConfig.js`

### Implementation Files Moved
- ✅ All files moved to `implementation/` folder:
  - `bolt/` → `implementation/bolt/`
  - `mortar/` → `implementation/mortar/`
  - `particles/` → `implementation/particles/`
  - `collision/` → `implementation/collision/`
  - `utils/` → `implementation/utils/`
  - `ProjectileManager.js` → `implementation/ProjectileManager.js`
  - `CharacterAbilityStats.js` → `implementation/CharacterAbilityStats.js`
  - `AbilityConfig.js` → `implementation/AbilityConfig.js` (kept for backwards compatibility during transition)

### External Import Paths Updated
- ✅ `src/core/gameloop/GameLoop.js`
- ✅ `src/main.js`
- ✅ `src/core/particle/ParticleManager.js`
- ✅ `src/core/bot/BotManager.js`
- ✅ `src/core/character/CharacterManager.js`
- ✅ `src/ui/CooldownIndicator.js`
- ✅ `src/core/utils/DeathFadeUtils.js`
- ✅ `src/ui/CharacterSwitcher.js`

### Implementation Files Updated
- ✅ `implementation/CharacterAbilityStats.js` - Now uses new config structure
- ✅ `implementation/mortar/BaseMortar.js` - Uses `MORTAR_ATTACK_CONFIG`
- ✅ `implementation/bolt/BoltCreation.js` - Uses `BOLT_ATTACK_CONFIG` and updated imports

## ⚠️ Remaining Work

### Internal Implementation Imports
The following files in `implementation/` still reference old paths/configs:

**Files using BOLT_CONFIG:**
- `implementation/bolt/BoltCursorFollowing.js`
- `implementation/bolt/BoltCursorTracking.js`
- `implementation/bolt/BoltSpeedCalculation.js`
- `implementation/bolt/BoltVisualEffects.js`
- `implementation/bolt/BoltPositionUpdate.js`

**Files using MORTAR_CONFIG:**
- `implementation/mortar/Mortar.js`
- `implementation/mortar/MortarCharacterConfig.js`

**Files using SPLASH_AREA_CONFIG:**
- `implementation/mortar/SplashArea.js`
- `implementation/mortar/SplashAreaAnimation.js`
- `implementation/mortar/SplashAreaParticles.js`

**Files importing from AbilityConfig.js:**
- All the above files need imports updated to:
  - `BOLT_CONFIG` → `BOLT_ATTACK_CONFIG` from `../../config/base/BoltAttackConfig.js`
  - `MORTAR_CONFIG` → `MORTAR_ATTACK_CONFIG` from `../../config/base/MortarAttackConfig.js`
  - `SPLASH_AREA_CONFIG` from `../../config/base/MortarAttackConfig.js`
  - `GENERAL_ABILITY_CONFIG` from `../../config/base/MeleeAttackConfig.js`

## Quick Fix Script

To complete the remaining imports, search and replace:
1. `from '../AbilityConfig.js'` → `from '../../config/base/[appropriate config].js'`
2. `BOLT_CONFIG` → `BOLT_ATTACK_CONFIG`
3. `MORTAR_CONFIG` → `MORTAR_ATTACK_CONFIG`
4. `SPLASH_AREA_CONFIG` → import from `MortarAttackConfig.js`

## Final Cleanup
- Remove old `implementation/AbilityConfig.js` once all imports are updated
- Remove old `stats/` folder (already removed ✓)

## New Structure
```
src/core/abilities/
├── config/
│   ├── base/
│   │   ├── BaseStats.js
│   │   ├── BoltAttackConfig.js
│   │   ├── BoltParticleConfig.js
│   │   ├── MortarAttackConfig.js
│   │   ├── MortarParticleConfig.js
│   │   ├── MeleeAttackConfig.js
│   │   └── MeleeParticleConfig.js
│   ├── characters/
│   │   ├── lucy/
│   │   │   ├── bolt/
│   │   │   ├── mortar/
│   │   │   └── melee/
│   │   └── herald/
│   │       ├── bolt/
│   │       ├── mortar/
│   │       └── melee/
│   └── CharacterColors.js
│
└── implementation/
    ├── bolt/
    ├── mortar/
    ├── particles/
    ├── collision/
    ├── utils/
    ├── ProjectileManager.js
    └── CharacterAbilityStats.js
```

