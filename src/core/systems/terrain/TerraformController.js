import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getTerrainConfig } from '../../../config/terrain/TerrainConfig.js';
import { BLOCK_TYPE_BY_SLOT, getBlockConfig } from '../../../config/entity/BlockConfig.js';

/**
 * TerraformController
 *
 * Reads camera + cursor + input, raycasts onto the terrain mesh, draws a
 * pastel reticle at the targeted cell, and applies dig / raise / flatten
 * when the matching action edge fires.
 *
 * Emits world events through an optional sink: { sendWorldEvent(type, payload) }.
 */
export class TerraformController {
  constructor({ terrain, sceneManager, inputManager, characterManager, worldEventSink = null, treeManager = null, blockManager = null, resourceSink = null, gameModeState = null }) {
    this.terrain = terrain;
    this.sceneManager = sceneManager;
    this.inputManager = inputManager;
    this.characterManager = characterManager;
    this.worldEventSink = worldEventSink;
    this.treeManager = treeManager;
    this.blockManager = blockManager;
    this.resourceSink = resourceSink; // { addWood(n), addStone(n), addMushroom(n) }
    this.gameModeState = gameModeState; // mutated for selectedBlockType + spend

    this.cfg = getTerrainConfig();
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = this.cfg.reticleMaxDistance;
    this._ndc = new THREE.Vector2();

    this.targetCell = null;     // { ix, iz, worldPos: Vector3 } or null
    this._reticleTree = null;   // Tree under the reticle, or null
    this._reticleBlock = null;  // Block under the reticle, or null
    this._cooldownUntil = 0;
    this._chopCooldownUntil = 0;

    this._buildReticle();
  }

  _buildReticle() {
    const size = 1 / this.cfg.cellsPerUnit;
    const geo = new THREE.RingGeometry(size * 0.55, size * 0.75, 24);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshBasicMaterial({
      color: this.cfg.reticleColor,
      transparent: true,
      opacity: 0.85,
      depthTest: false,
      depthWrite: false
    });
    this.reticle = new THREE.Mesh(geo, mat);
    this.reticle.renderOrder = 999;
    this.reticle.visible = false;
    this.sceneManager.getScene().add(this.reticle);

    // Small dot in center so it reads even from far away
    const dotGeo = new THREE.CircleGeometry(size * 0.1, 12);
    dotGeo.rotateX(-Math.PI / 2);
    const dotMat = new THREE.MeshBasicMaterial({
      color: this.cfg.reticleColor,
      transparent: true,
      opacity: 0.95,
      depthTest: false,
      depthWrite: false
    });
    this.reticleDot = new THREE.Mesh(dotGeo, dotMat);
    this.reticleDot.renderOrder = 999;
    this.reticleDot.visible = false;
    this.sceneManager.getScene().add(this.reticleDot);
  }

  setWorldEventSink(sink) {
    this.worldEventSink = sink;
  }

  setTreeManager(tm) { this.treeManager = tm; }
  setBlockManager(bm) { this.blockManager = bm; }
  setResourceSink(sink) { this.resourceSink = sink; }
  setGameModeState(s) { this.gameModeState = s; }

  /** Called every frame from the game loop. */
  update(_dt) {
    this._updateTarget();
    this._handleActions();
  }

  _updateTarget() {
    const camera = this.sceneManager.getCamera();
    if (!camera) {
      this._hideReticle();
      return;
    }

    // Mouse in NDC. In FPV we aim straight ahead (center of screen).
    const mouse = this.inputManager.getMousePosition();
    const fp = typeof window !== 'undefined' && window.innerWidth && window.innerHeight;
    if (!fp) {
      this._hideReticle();
      return;
    }
    this._ndc.x = (mouse.x / window.innerWidth) * 2 - 1;
    this._ndc.y = -(mouse.y / window.innerHeight) * 2 + 1;
    // Clamp to a tighter window so wandering cursor near screen edges
    // doesn't dump the ray into the horizon.
    this._ndc.x = Math.max(-0.95, Math.min(0.95, this._ndc.x));
    this._ndc.y = Math.max(-0.95, Math.min(0.95, this._ndc.y));

    this.raycaster.setFromCamera(this._ndc, camera);

    // Reticle priority for chop/remove targeting: blocks > trees > terrain.
    // The targeted *cell* still tracks where the terrain ray lands, so plant
    // and dig actions stay grounded on the heightmap.
    const blockHit = this.blockManager
      ? this.blockManager.raycastBlockUnderReticle(this.raycaster)
      : null;
    this._reticleBlock = blockHit ? blockHit.entry : null;
    this._reticleTree = this.treeManager
      ? this.treeManager.raycastTreeUnderReticle(this.raycaster)
      : null;

    const hits = this.raycaster.intersectObject(this.terrain.mesh, false);
    if (hits.length === 0) {
      this._hideReticle();
      this.targetCell = null;
      return;
    }
    const hit = hits[0];
    const { ix, iz } = this.terrain.worldToCell(hit.point.x, hit.point.z);
    if (!this.terrain.inBounds(ix, iz)) {
      this._hideReticle();
      this.targetCell = null;
      return;
    }
    const wp = this.terrain.cellToWorld(ix, iz);
    const h = this.terrain.getHeight(ix, iz);
    this.targetCell = { ix, iz, worldPos: new THREE.Vector3(wp.x, h, wp.z) };
    this.reticle.position.set(wp.x, h + 0.06, wp.z);
    this.reticleDot.position.set(wp.x, h + 0.07, wp.z);
    this.reticle.visible = true;
    this.reticleDot.visible = true;
  }

  _hideReticle() {
    this.reticle.visible = false;
    this.reticleDot.visible = false;
  }

  _handleActions() {
    const inp = this.inputManager;

    // Block hotbar slot select (1/2/3).
    if (inp.consumeSelectBlock) {
      const slot = inp.consumeSelectBlock();
      if (slot !== 0 && this.gameModeState) {
        const type = BLOCK_TYPE_BY_SLOT[slot];
        if (type) this.gameModeState.selectedBlockType = type;
      }
    }

    // Plant tree on the targeted cell (single-shot).
    if (this.treeManager && this.targetCell && inp.consumePlantTreePressed && inp.consumePlantTreePressed()) {
      const { ix, iz } = this.targetCell;
      this.treeManager.plantAt(ix, iz);
    }

    // Place block on top of the targeted cell.
    if (this.blockManager && this.targetCell && inp.consumePlaceBlockPressed && inp.consumePlaceBlockPressed()) {
      this._tryPlaceBlock();
    }

    // F (melee) is overloaded for cottage actions when reticled on a target:
    //   block under reticle → remove block (breakable instantly)
    //   tree under reticle  → chop
    if (inp.isSwordSwingPressed && inp.isSwordSwingPressed()) {
      const now = performance.now();
      if (now >= this._chopCooldownUntil) {
        if (this.blockManager && this._reticleBlock) {
          const b = this._reticleBlock;
          this.blockManager.remove(b.ix, b.iz, b.iy);
          this._chopCooldownUntil = now + 220;
        } else if (this.treeManager && this._reticleTree) {
          const wood = this.treeManager.chop(this._reticleTree.id);
          if (wood > 0 && this.resourceSink && this.resourceSink.addWood) {
            this.resourceSink.addWood(wood);
          }
          this._chopCooldownUntil = now + 280;
        }
      }
    }

    // Terrain actions on the targeted cell.
    if (!this.targetCell) return;
    const now = performance.now();
    if (now < this._cooldownUntil) return;

    if (inp.isDigPressed && inp.isDigPressed()) {
      this._apply('dig');
    } else if (inp.isRaisePressed && inp.isRaisePressed()) {
      this._apply('raise');
    } else if (inp.isFlattenPressed && inp.isFlattenPressed()) {
      this._apply('flatten');
    }
  }

  _tryPlaceBlock() {
    const state = this.gameModeState;
    const type = state?.selectedBlockType || 'wood';
    const cfg = getBlockConfig(type);
    if (!cfg) return;
    // Check + spend resource cost
    if (state) {
      for (const [k, n] of Object.entries(cfg.cost)) {
        if ((state[k] || 0) < n) return; // can't afford
      }
      for (const [k, n] of Object.entries(cfg.cost)) {
        state[k] = (state[k] || 0) - n;
      }
    }
    const { ix, iz } = this.targetCell;
    // If a block is under the reticle, stack on top of it (its cell may be
    // the same as the terrain target — placeOnTop handles that).
    this.blockManager.placeOnTop(ix, iz, type);
  }

  _apply(kind) {
    const { ix, iz } = this.targetCell;
    if (kind === 'dig') {
      this.terrain.applyDig(ix, iz);
      this._broadcastCell(ix, iz);
    } else if (kind === 'raise') {
      this.terrain.applyRaise(ix, iz);
      this._broadcastCell(ix, iz);
    } else if (kind === 'flatten') {
      const player = this.characterManager?.getPlayer?.();
      const footY = player ? player.position.y - (this.characterManager.playerHeight || 0.9) * 0.5 : 0;
      this.terrain.applyFlatten(ix, iz, footY);
      // Broadcast the 3×3 patch
      for (let dz = -1; dz <= 1; dz++) {
        for (let dx = -1; dx <= 1; dx++) {
          this._broadcastCell(ix + dx, iz + dz);
        }
      }
    }
    this._cooldownUntil = performance.now() + this.cfg.actionCooldownMs;
  }

  _broadcastCell(ix, iz) {
    if (!this.worldEventSink || !this.terrain.inBounds(ix, iz)) return;
    const payload = this.terrain.serializeCell(ix, iz);
    this.worldEventSink.sendWorldEvent('terrain', payload);
  }

  dispose() {
    if (this.reticle) {
      this.sceneManager.getScene().remove(this.reticle);
      this.reticle.geometry.dispose();
      this.reticle.material.dispose();
    }
    if (this.reticleDot) {
      this.sceneManager.getScene().remove(this.reticleDot);
      this.reticleDot.geometry.dispose();
      this.reticleDot.material.dispose();
    }
  }
}
