# Sound File Naming Convention Guide

This document explains where to place custom sound files and how to name them. All sounds will fallback to procedural sounds if custom files are not found.

## Folder Structure

```
public/assets/audio/
├── abilities/
│   ├── bolt/
│   │   ├── bolt_shot.wav          # Bolt projectile launch sound
│   │   ├── bolt_hit.wav           # Bolt projectile impact sound
│   │   └── bolt_reload.wav        # Bolt reload/recharge sound
│   ├── mortar/
│   │   ├── mortar_charging.wav   # Mortar charging sound (when holding RB)
│   │   ├── mortar_launch.wav      # Mortar launch sound
│   │   ├── mortar_arc.wav        # Mortar flight whoosh sound
│   │   └── mortar_explosion.wav  # Mortar explosion impact sound
│   ├── melee/
│   │   ├── melee_swing.wav        # Melee attack swing sound
│   │   ├── melee_hit.wav          # Melee attack hit sound
│   │   └── melee_poison.wav       # Melee poison effect sound
│   └── healing/
│       ├── healing_start.wav      # Healing start sound
│       ├── healing_loop.wav       # Healing loop sound (continuous)
│       └── healing_end.wav        # Healing end sound
├── core/
│   ├── character/
│   │   ├── character_swap.wav    # Character swap sound
│   │   ├── respawn.wav            # Respawn sound
│   │   ├── death.wav              # Death sound
│   │   └── take_damage.wav        # Take damage sound
│   └── ui/
│       ├── ui_click.wav           # UI button click
│       ├── ui_hover.wav           # UI button hover
│       └── ui_select.wav         # UI selection sound
└── characters/
    └── [character_name]/
        ├── footstep.wav           # Character footstep (already exists)
        ├── footstep_obstacle.wav  # Character obstacle footstep (already exists)
        ├── jump.wav               # Character jump sound (already exists)
        └── jump_obstacle.wav      # Character obstacle jump sound (already exists)
```

## File Naming Rules

### General Rules
- Use lowercase with underscores: `sound_name.wav`
- Supported formats: `.wav`, `.mp3`, `.ogg`, `.m4a`
- File names are case-sensitive

### Character-Specific Sounds
- Character-specific sounds go in: `public/assets/audio/characters/[character_name]/`
- Examples: `lucy`, `herald`
- If character-specific sound doesn't exist, falls back to generic procedural sound

### Ability Sounds
- Ability sounds go in: `public/assets/audio/abilities/[ability_name]/`
- Ability names: `bolt`, `mortar`, `melee`, `healing`
- If ability sound doesn't exist, falls back to procedural sound

### Core Sounds
- Core game sounds go in: `public/assets/audio/core/[category]/`
- Categories: `character`, `ui`

## Sound Loading Priority

1. **Custom Sound File** (if exists in correct path)
2. **Procedural Sound** (generated via Web Audio API)

The system will automatically:
- Try to load custom sound file first
- Fall back to procedural sound if file doesn't exist or fails to load
- Never throw errors if sound files are missing

## Examples

### Example 1: Custom Bolt Shot Sound
**File Path:** `public/assets/audio/abilities/bolt/bolt_shot.wav`
**Usage:** Automatically loaded when bolt projectile is created
**Fallback:** Procedural whoosh sound if file missing

### Example 2: Character-Specific Melee Sound
**File Path:** `public/assets/audio/abilities/melee/melee_swing.wav`
**Usage:** Plays when melee attack is triggered
**Fallback:** Procedural slash sound if file missing

### Example 3: Mortar Charging Sound
**File Path:** `public/assets/audio/abilities/mortar/mortar_charging.wav`
**Usage:** Continuous loop while holding RB for mortar
**Fallback:** Procedural low-frequency rumble if file missing

## Adding New Sounds

To add a new sound type:
1. Place the sound file in the appropriate folder
2. Use the exact naming convention shown above
3. The SoundManager will automatically detect and load it
4. No code changes needed if following the naming convention

## Current Sound Files

### Already Implemented:
- `characters/lucy/footstep.wav`
- `characters/lucy/footstep_obstacle.wav`
- `characters/herald/footstep.wav`
- `characters/herald/footstep_obstacle.wav`
- `sounds/jump.wav` (moved to characters folder structure)

### To Be Added (with procedural fallback):
- All ability sounds (bolt, mortar, melee, healing)
- All core sounds (character swap, respawn, death, damage, UI)

## Notes

- All sounds are loaded asynchronously and won't block gameplay
- Missing sound files are handled gracefully
- Procedural sounds are generated in real-time using Web Audio API
- Volume is controlled by the sound effects volume setting

