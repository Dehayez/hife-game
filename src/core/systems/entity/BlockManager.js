import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { BLOCK_TYPE, getBlockConfig } from '../../../config/entity/BlockConfig.js';

/**
 * BlockManager
 *
 * Owns all placed cubes in the cottage scene. Cubes are 1×1×1, aligned to
 * the terrain grid in X/Z, and stacked in Y in whole units above the
 * terrain height of their cell.
 *
 * Key invariants:
 *  - At most one block per (ix, iz, iy) slot.
 *  - The cube's center sits at y = terrainHeight(ix,iz) + 0.5 + iy.
 */
export class BlockManager {
  constructor({ scene, terrain, worldEventSink = null }) {
    this.scene = scene;
    this.terrain = terrain;
    this.worldEventSink = worldEventSink;
    this.blocks = new Map(); // "ix,iz,iy" → { mesh, type, ix, iz, iy }
    this._meshes = []; // for raycast
  }

  setWorldEventSink(sink) { this.worldEventSink = sink; }

  _key(ix, iz, iy) { return `${ix},${iz},${iy}`; }

  hasBlock(ix, iz, iy) { return this.blocks.has(this._key(ix, iz, iy)); }

  /** Highest occupied iy at this cell, or -1 if none. */
  topYAt(ix, iz) {
    let top = -1;
    for (const b of this.blocks.values()) {
      if (b.ix === ix && b.iz === iz && b.iy > top) top = b.iy;
    }
    return top;
  }

  /**
   * World-y of the top surface of the highest block at world (x, z),
   * or null if no block is at that cell.
   */
  topWorldYAt(x, z) {
    const { ix, iz } = this.terrain.worldToCell(x, z);
    const iy = this.topYAt(ix, iz);
    if (iy < 0) return null;
    const baseY = this.terrain.getHeight(ix, iz);
    // Top surface of the top block: baseY + 1 + iy
    return baseY + 1 + iy;
  }

  /** Place a block on top of the stack at (ix, iz). Returns the new block or null. */
  placeOnTop(ix, iz, type, { broadcast = true } = {}) {
    if (!this.terrain.inBounds(ix, iz)) return null;
    const iy = this.topYAt(ix, iz) + 1;
    return this._placeAt(ix, iz, iy, type, broadcast);
  }

  /** Seed a specific (ix, iz, iy) without broadcasting — for prebuilt structures. */
  seedAt(ix, iz, iy, type) {
    return this._placeAt(ix, iz, iy, type, false);
  }

  _placeAt(ix, iz, iy, type, broadcast) {
    const key = this._key(ix, iz, iy);
    if (this.blocks.has(key)) return null;
    const cfg = getBlockConfig(type);
    if (!cfg) return null;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: cfg.color,
      roughness: cfg.roughness,
      metalness: cfg.metalness,
      flatShading: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    const wp = this.terrain.cellToWorld(ix, iz);
    const baseY = this.terrain.getHeight(ix, iz);
    mesh.position.set(wp.x, baseY + 0.5 + iy, wp.z);
    mesh.userData.block = { ix, iz, iy, type };

    this.scene.add(mesh);
    const entry = { mesh, type, ix, iz, iy };
    this.blocks.set(key, entry);
    this._meshes.push(mesh);

    if (broadcast && this.worldEventSink) {
      this.worldEventSink.sendWorldEvent('block-place', { ix, iz, iy, type });
    }
    return entry;
  }

  /** Remove a block at (ix, iz, iy). Returns true if removed. */
  remove(ix, iz, iy, { broadcast = true } = {}) {
    const key = this._key(ix, iz, iy);
    const entry = this.blocks.get(key);
    if (!entry) return false;
    this.scene.remove(entry.mesh);
    entry.mesh.geometry.dispose();
    entry.mesh.material.dispose();
    this.blocks.delete(key);
    const idx = this._meshes.indexOf(entry.mesh);
    if (idx >= 0) this._meshes.splice(idx, 1);
    if (broadcast && this.worldEventSink) {
      this.worldEventSink.sendWorldEvent('block-remove', { ix, iz, iy });
    }
    return true;
  }

  /** Raycast against placed blocks. Returns { entry, hit } or null. */
  raycastBlockUnderReticle(raycaster) {
    if (this._meshes.length === 0) return null;
    const hits = raycaster.intersectObjects(this._meshes, false);
    if (hits.length === 0) return null;
    const mesh = hits[0].object;
    const meta = mesh.userData.block;
    if (!meta) return null;
    const entry = this.blocks.get(this._key(meta.ix, meta.iz, meta.iy));
    if (!entry) return null;
    return { entry, hit: hits[0] };
  }

  // -------- network handlers --------

  applyRemotePlace({ ix, iz, iy, type }) {
    if (this.hasBlock(ix, iz, iy)) return;
    this._placeAt(ix, iz, iy, type, false);
  }

  applyRemoteRemove({ ix, iz, iy }) {
    this.remove(ix, iz, iy, { broadcast: false });
  }

  serialize() {
    return Array.from(this.blocks.values()).map(b => ({
      ix: b.ix, iz: b.iz, iy: b.iy, type: b.type
    }));
  }

  applySnapshot(arr) {
    for (const key of Array.from(this.blocks.keys())) {
      const e = this.blocks.get(key);
      this.scene.remove(e.mesh);
      e.mesh.geometry.dispose();
      e.mesh.material.dispose();
    }
    this.blocks.clear();
    this._meshes.length = 0;
    for (const b of arr) this._placeAt(b.ix, b.iz, b.iy, b.type, false);
  }
}

export { BLOCK_TYPE };
