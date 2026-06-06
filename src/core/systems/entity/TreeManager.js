import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { Tree } from './Tree.js';
import { TREE_STAGE } from '../../../config/entity/TreeConfig.js';

let nextTreeId = 1;

/**
 * TreeManager
 *
 * Owns all live trees in the cottage scene. Plants on grid cells, advances
 * lifecycle, supports chop targeting via raycast, and broadcasts world events
 * for plant / stage / chop changes.
 */
export class TreeManager {
  constructor({ scene, terrain, worldEventSink = null }) {
    this.scene = scene;
    this.terrain = terrain;
    this.worldEventSink = worldEventSink;
    this.trees = new Map(); // id → Tree
    this._cellIndex = new Map(); // "ix,iz" → tree id (to prevent overplanting)
    this._windPhase = 0;
  }

  setWorldEventSink(sink) {
    this.worldEventSink = sink;
  }

  _cellKey(ix, iz) {
    return `${ix},${iz}`;
  }

  hasTreeAt(ix, iz) {
    return this._cellIndex.has(this._cellKey(ix, iz));
  }

  /** Plant a sapling on a cell. Returns the new Tree or null if occupied. */
  plantAt(ix, iz, { broadcast = true, id = null } = {}) {
    if (!this.terrain.inBounds(ix, iz)) return null;
    if (this.hasTreeAt(ix, iz)) return null;
    const wp = this.terrain.cellToWorld(ix, iz);
    const baseY = this.terrain.getHeight(ix, iz);
    const tree = new Tree({
      id: id || `t_${nextTreeId++}`,
      ix, iz,
      worldX: wp.x,
      worldZ: wp.z,
      baseY
    });
    this.trees.set(tree.id, tree);
    this._cellIndex.set(this._cellKey(ix, iz), tree.id);
    this.scene.add(tree.group);

    if (broadcast && this.worldEventSink) {
      this.worldEventSink.sendWorldEvent('tree-plant', {
        id: tree.id, ix, iz
      });
    }
    return tree;
  }

  /** Tick lifecycle. */
  update(dt) {
    this._windPhase += dt;
    const toRemove = [];
    for (const tree of this.trees.values()) {
      // Gentle wind sway on the canopy (cottagecore polish)
      if (tree.leaves) {
        const phase = this._windPhase * 0.9 + tree.worldX * 0.13 + tree.worldZ * 0.17;
        tree.leaves.rotation.z = Math.sin(phase) * 0.06;
        tree.leaves.rotation.x = Math.cos(phase * 0.7) * 0.04;
      }
      const newStage = tree.update(dt);
      if (newStage) {
        if (this.worldEventSink) {
          this.worldEventSink.sendWorldEvent('tree-stage', {
            id: tree.id, stage: tree.stage
          });
        }
        if (!tree.alive) toRemove.push(tree.id);
      }
    }
    for (const id of toRemove) this._removeTree(id);
  }

  /** Raycast to the nearest tree group hit by the camera ray. */
  raycastTreeUnderReticle(raycaster) {
    let best = null;
    let bestDist = Infinity;
    for (const tree of this.trees.values()) {
      const hits = raycaster.intersectObject(tree.group, true);
      if (hits.length > 0 && hits[0].distance < bestDist) {
        bestDist = hits[0].distance;
        best = tree;
      }
    }
    return best;
  }

  /** Chop a tree by id. Returns wood collected (0 if not felled). */
  chop(id, { broadcast = true } = {}) {
    const tree = this.trees.get(id);
    if (!tree) return 0;
    const { wood, fell } = tree.chop();
    if (broadcast && this.worldEventSink) {
      this.worldEventSink.sendWorldEvent('tree-chop', { id, fell });
    }
    if (fell) this._removeTree(id);
    return wood;
  }

  _removeTree(id) {
    const tree = this.trees.get(id);
    if (!tree) return;
    this.scene.remove(tree.group);
    tree.dispose();
    this.trees.delete(id);
    this._cellIndex.delete(this._cellKey(tree.ix, tree.iz));
  }

  /** Apply a remote plant event from the network. */
  applyRemotePlant({ id, ix, iz }) {
    if (this.hasTreeAt(ix, iz)) return;
    this.plantAt(ix, iz, { broadcast: false, id });
  }

  /** Apply a remote stage change. */
  applyRemoteStage({ id, stage }) {
    const tree = this.trees.get(id);
    if (!tree) return;
    tree.applyState({ stage, stageAge: 0 });
    if (!tree.alive) this._removeTree(id);
  }

  /** Apply a remote chop. */
  applyRemoteChop({ id, fell }) {
    const tree = this.trees.get(id);
    if (!tree) return;
    if (fell) {
      this._removeTree(id);
      return;
    }
    tree.chopHitsRemaining = Math.max(0, tree.chopHitsRemaining - 1);
  }

  /** Snapshot for new joiners. */
  serialize() {
    return Array.from(this.trees.values()).map(t => t.serialize());
  }

  /** Reset to snapshot. */
  applySnapshot(arr) {
    for (const id of Array.from(this.trees.keys())) this._removeTree(id);
    for (const data of arr) {
      const tree = this.plantAt(data.ix, data.iz, { broadcast: false, id: data.id });
      if (tree) tree.applyState({ stage: data.stage, stageAge: data.stageAge });
    }
  }
}

export { TREE_STAGE };
