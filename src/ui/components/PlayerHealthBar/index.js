/**
 * PlayerHealthBar
 *
 * Bottom-left HUD healthbar for the local player. Polls every frame from
 * the CharacterManager so it tracks heal/damage without needing event wiring.
 * Tinted with the active character's accent color so swaps re-skin it.
 */

import { getCSSColor } from '../../../config/abilities/CharacterColors.js';

export class PlayerHealthBar {
  constructor({ characterManager }) {
    this.characterManager = characterManager;
    this.lastHealth = null;
    this.lastMax = null;
    this.lastCharacter = null;
    this._damageFlashUntil = 0;

    this.root = document.createElement('div');
    this.root.className = 'player-healthbar';
    this.root.style.cssText = `
      position: fixed;
      left: 18px;
      bottom: 18px;
      width: 240px;
      padding: 10px 12px;
      background: rgba(18, 14, 20, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.12);
      border-radius: 12px;
      backdrop-filter: blur(6px);
      font-family: system-ui, sans-serif;
      color: #fff;
      z-index: 45;
      pointer-events: none;
      transition: transform 120ms ease;
    `;

    this.label = document.createElement('div');
    this.label.style.cssText = `
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      opacity: 0.85;
      margin-bottom: 6px;
    `;
    const left = document.createElement('span');
    left.textContent = 'HP';
    const right = document.createElement('span');
    right.style.fontVariantNumeric = 'tabular-nums';
    right.textContent = '— / —';
    this.label.appendChild(left);
    this.label.appendChild(right);
    this._right = right;

    this.track = document.createElement('div');
    this.track.style.cssText = `
      position: relative;
      width: 100%;
      height: 12px;
      background: rgba(0, 0, 0, 0.55);
      border-radius: 6px;
      overflow: hidden;
      box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.6);
    `;

    this.fillBack = document.createElement('div');
    this.fillBack.style.cssText = `
      position: absolute;
      left: 0; top: 0;
      height: 100%;
      width: 100%;
      background: rgba(255, 90, 90, 0.55);
      transition: width 280ms cubic-bezier(0.25, 1, 0.5, 1);
    `;

    this.fill = document.createElement('div');
    this.fill.style.cssText = `
      position: absolute;
      left: 0; top: 0;
      height: 100%;
      width: 100%;
      background: linear-gradient(90deg, #4ddc7a 0%, #6dea93 100%);
      transition: width 140ms ease, background 280ms ease;
      box-shadow: 0 0 8px rgba(110, 234, 147, 0.55) inset;
    `;

    this.track.appendChild(this.fillBack);
    this.track.appendChild(this.fill);
    this.root.appendChild(this.label);
    this.root.appendChild(this.track);
    document.body.appendChild(this.root);
  }

  setVisible(v) {
    this.root.style.display = v ? 'block' : 'none';
  }

  update() {
    const cm = this.characterManager;
    if (!cm || typeof cm.getHealth !== 'function') return;
    const hp = Math.max(0, cm.getHealth());
    const max = Math.max(1, cm.getMaxHealth());
    const name = cm.getCharacterName ? cm.getCharacterName() : null;

    // Restyle accent when character changes
    if (name && name !== this.lastCharacter) {
      const accent = getCSSColor(name);
      this.fill.style.background = `linear-gradient(90deg, ${accent} 0%, ${this._lighten(accent, 0.18)} 100%)`;
      this.fill.style.boxShadow = `0 0 10px ${this._withAlpha(accent, 0.55)} inset`;
      this.lastCharacter = name;
    }

    const ratio = Math.max(0, Math.min(1, hp / max));
    const pct = (ratio * 100).toFixed(1) + '%';
    this.fill.style.width = pct;
    // Backfill lags behind fill to show a damage-tear.
    if (this.lastHealth !== null && hp < this.lastHealth) {
      this._damageFlashUntil = performance.now() + 380;
    } else {
      // Backfill catches up when not actively losing HP.
      this.fillBack.style.width = pct;
    }
    if (performance.now() > this._damageFlashUntil) {
      this.fillBack.style.width = pct;
    }

    // Critical-HP pulse
    if (ratio < 0.25) {
      const t = (Math.sin(performance.now() / 220) + 1) * 0.5;
      this.root.style.boxShadow = `0 0 ${10 + t * 14}px rgba(255, 80, 80, ${0.35 + t * 0.35})`;
    } else {
      this.root.style.boxShadow = 'none';
    }

    if (hp !== this.lastHealth || max !== this.lastMax) {
      this._right.textContent = `${Math.round(hp)} / ${Math.round(max)}`;
      this.lastHealth = hp;
      this.lastMax = max;
    }
  }

  _withAlpha(hex, a) {
    const m = /^#?([a-f\d]{6})$/i.exec(hex);
    if (!m) return `rgba(255,255,255,${a})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
  }

  _lighten(hex, amt) {
    const m = /^#?([a-f\d]{6})$/i.exec(hex);
    if (!m) return hex;
    const n = parseInt(m[1], 16);
    const r = Math.min(255, Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * amt));
    const g = Math.min(255, Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * amt));
    const b = Math.min(255, Math.round((n & 255) + (255 - (n & 255)) * amt));
    return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
  }

  dispose() {
    this.root.remove();
  }
}
