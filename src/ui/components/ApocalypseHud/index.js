/**
 * ApocalypseHud
 *
 * Lightweight DOM overlay for the Apocalypse Cottage gamemode. Shows
 * wood / stone / mushroom / comfort, the active block type, and an acid
 * sprinkle warning band.
 *
 * Driven directly from the GameModeManager's modeState every frame, so it
 * stays in sync with whatever the controller / world events have applied.
 */
export class ApocalypseHud {
  constructor({ gameModeManager }) {
    this.gameModeManager = gameModeManager;
    this.root = document.createElement('div');
    this.root.className = 'apoc-hud';
    this.root.style.cssText = `
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 10px;
      padding: 8px 12px;
      background: rgba(40, 25, 30, 0.55);
      color: #ffeede;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      border-radius: 12px;
      border: 1px solid rgba(255, 200, 170, 0.25);
      z-index: 50;
      pointer-events: none;
      backdrop-filter: blur(6px);
    `;
    document.body.appendChild(this.root);

    this._chips = {
      wood: this._chip('🪵', 'Wood'),
      stone: this._chip('🪨', 'Stone'),
      mushroom: this._chip('🍄', 'Shroom'),
      comfort: this._chip('☕', 'Comfort'),
      block: this._chip('🧱', 'Block')
    };
    Object.values(this._chips).forEach(c => this.root.appendChild(c.el));

    this.acidBanner = document.createElement('div');
    this.acidBanner.style.cssText = `
      position: fixed;
      top: 70px;
      left: 50%;
      transform: translateX(-50%);
      padding: 6px 14px;
      background: rgba(180, 70, 90, 0.78);
      color: #ffeede;
      font-family: system-ui, sans-serif;
      font-size: 13px;
      letter-spacing: 0.04em;
      border-radius: 10px;
      z-index: 50;
      pointer-events: none;
      display: none;
    `;
    this.acidBanner.textContent = '☂  Acid sprinkle — take shelter';
    document.body.appendChild(this.acidBanner);

    this.visible = false;
    this.setVisible(false);
  }

  _chip(icon, label) {
    const el = document.createElement('div');
    el.style.cssText = `
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      background: rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      min-width: 60px;
    `;
    const i = document.createElement('span');
    i.textContent = icon;
    i.style.fontSize = '15px';
    const v = document.createElement('span');
    v.textContent = label;
    v.style.fontVariantNumeric = 'tabular-nums';
    el.appendChild(i);
    el.appendChild(v);
    return { el, label: v };
  }

  setVisible(v) {
    this.visible = v;
    this.root.style.display = v ? 'flex' : 'none';
    if (!v) this.acidBanner.style.display = 'none';
  }

  setAcidActive(active) {
    this.acidBanner.style.display = (this.visible && active) ? 'block' : 'none';
  }

  update() {
    if (!this.visible) return;
    const s = this.gameModeManager?.modeState;
    if (!s) return;
    this._chips.wood.label.textContent = String(s.wood || 0);
    this._chips.stone.label.textContent = String(s.stone || 0);
    this._chips.mushroom.label.textContent = String(s.mushroom || 0);
    this._chips.comfort.label.textContent = String(Math.max(0, Math.round(s.comfort ?? 100)));
    this._chips.block.label.textContent = s.selectedBlockType || 'wood';
  }

  dispose() {
    this.root.remove();
    this.acidBanner.remove();
  }
}
