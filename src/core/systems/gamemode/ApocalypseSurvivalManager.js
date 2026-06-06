/**
 * ApocalypseSurvivalManager
 *
 * Ticks the Apocalypse Cottage survival mechanics:
 *  - Comfort meter slowly drains; below 0 leaks health.
 *  - Periodic acid sprinkle windows: exposed player takes damage; standing
 *    under any block or tree canopy is sheltered.
 */
export class ApocalypseSurvivalManager {
  constructor({ gameModeManager, characterManager, blockManager, treeManager, hud = null }) {
    this.gameModeManager = gameModeManager;
    this.characterManager = characterManager;
    this.blockManager = blockManager;
    this.treeManager = treeManager;
    this.hud = hud;

    // Comfort drains 1.0/s of meter; below 0 leaks 4 HP/s.
    this.comfortDrainPerSec = 1.0;
    this.healthLeakPerSec = 4.0;

    // Acid sprinkle cycle
    this.cyclePeriod = 180;     // seconds between sprinkles
    this.windowDuration = 25;   // seconds the sprinkle lasts
    this.cycleAge = 0;
    this.acidActive = false;
    this.acidDamagePerSec = 3.0;
  }

  setHud(hud) { this.hud = hud; }

  update(dt) {
    const state = this.gameModeManager?.modeState;
    if (!state) return;

    // Comfort drain
    state.comfort = Math.max(0, (state.comfort ?? 100) - this.comfortDrainPerSec * dt);

    // Acid sprinkle cycle
    this.cycleAge += dt;
    const previousAcid = this.acidActive;
    this.acidActive = this.cycleAge > (this.cyclePeriod - this.windowDuration);
    if (this.acidActive && this.cycleAge >= this.cyclePeriod) {
      this.cycleAge = 0;
      this.acidActive = false;
    }
    if (this.hud && previousAcid !== this.acidActive) {
      this.hud.setAcidActive(this.acidActive);
    }

    // Damage tick: low comfort → slow drain; acid + exposed → bigger drain.
    let dmg = 0;
    if (state.comfort <= 0) {
      dmg += this.healthLeakPerSec * dt;
    }
    if (this.acidActive && !this._isSheltered()) {
      dmg += this.acidDamagePerSec * dt;
    }
    if (dmg > 0) {
      this._applyDamage(dmg);
    }
  }

  _isSheltered() {
    const player = this.characterManager?.getPlayer?.();
    if (!player) return true;
    const px = player.position.x;
    const pz = player.position.z;
    const py = player.position.y;

    // A block roof above the player's head shelters.
    if (this.blockManager) {
      const top = this.blockManager.topWorldYAt(px, pz);
      if (top !== null && top > py + 0.5) {
        return true;
      }
    }
    // A nearby mature tree canopy shelters (cheap radial check).
    if (this.treeManager) {
      for (const tree of this.treeManager.trees.values()) {
        if (tree.stage !== 'mature' && tree.stage !== 'young') continue;
        const dx = tree.worldX - px;
        const dz = tree.worldZ - pz;
        if (dx * dx + dz * dz < 2.0 * 2.0) {
          return true;
        }
      }
    }
    return false;
  }

  _applyDamage(amount) {
    const player = this.characterManager?.getPlayer?.();
    if (!player) return;
    const ud = player.userData;
    if (typeof ud.health === 'number') {
      ud.health = Math.max(0, ud.health - amount);
    }
    const state = this.gameModeManager.modeState;
    if (typeof state.health === 'number') {
      state.health = Math.max(0, state.health - amount);
    }
  }
}
