# Abilities System Documentation

## 📁 Folder Structure

```
src/core/abilities/
├── projectile/                  # Regular projectile shots (normal shots)
│   ├── Bolt.js                 # Main export file
│   ├── BoltCreation.js         # Creation logic
│   ├── BoltUpdate.js           # Update logic (cursor tracking, speed, position)
│   ├── BoltRemoval.js          # Removal logic
│   └── BoltCollision.js        # Collision detection
│
├── mortar/                      # Mortar projectile system (arc shots + splash areas)
│   ├── BaseMortar.js           # ⭐ Base implementation (general logic)
│   ├── MortarCharacterConfig.js # ⭐ Character-specific configs (EDIT HERE)
│   ├── Mortar.js                # Main mortar module
│   ├── MortarArcPreview.js     # Visual arc preview
│   └── SplashArea.js           # Splash areas after mortar impact
│
├── particles/                    # Particle calculations
│   ├── ParticleCalculationConfig.js  # ⭐ ALL PARTICLE NUMBERS HERE
│   └── ParticleCalculation.js
│
├── stats/                       # Stats configuration
│   ├── GlobalCharacterStats.js # Base stats for all characters
│   ├── CharacterStats.js       # Stats merger
│   └── characters/
│       ├── Lucy.js              # ⭐ Lucy's multipliers/overrides
│       └── Herald.js            # ⭐ Herald's multipliers/overrides
│
├── collision/                   # Collision detection
│   └── CollisionHandler.js
│
└── ProjectileManager.js         # Main coordinator
```

## 🎯 How to Customize

### 1. **Projectile Logic**
- **Bolts (normal shots)**: `projectile/Bolt*.js` - Modular files for different concerns
- **Mortars (arc shots)**: `mortar/Mortar*.js` - Modular files for different concerns
- Each ability is split into focused, small files

### 2. **Character Stats** ⭐ EDIT STATS HERE
- **File**: `stats/characters/Lucy.js` or `Herald.js`
- Edit multipliers/overrides for:
  - Damage
  - Cooldown
  - Speed
  - Size
  - And more...

### 3. **Particle Calculations** ⭐ EDIT PARTICLE NUMBERS HERE
- **File**: `particles/ParticleCalculationConfig.js`
- Contains ALL particle count and spread radius settings
- Edit `BOLT_PARTICLES` and `MORTAR_PARTICLES` objects

## 🔧 How It Works

1. **Base Implementation** provides general logic
2. **Character Config** applies character-specific customizations
3. **Stats** provide numerical values (damage, speed, etc.)
4. Everything merges together for the final projectile

## ✨ Benefits

- **DRY**: No duplicate code - base logic shared
- **Easy to customize**: Edit config files, not core logic
- **Extensible**: Add new behaviors easily
- **Maintainable**: Clear separation of concerns

