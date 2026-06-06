import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { TREE_STAGE, getTreeConfig } from '../../../config/entity/TreeConfig.js';

/**
 * Tree
 *
 * A single planted tree. Stage-driven mesh swap; chops yield wood by stage.
 */
export class Tree {
  constructor({ id, ix, iz, worldX, worldZ, baseY }) {
    this.id = id;
    this.ix = ix;
    this.iz = iz;
    this.worldX = worldX;
    this.worldZ = worldZ;
    this.baseY = baseY;
    this.stage = TREE_STAGE.SAPLING;
    this.stageAge = 0;
    this.chopHitsRemaining = getTreeConfig().chopHits[this.stage];
    this.alive = true;

    this.group = new THREE.Group();
    this.group.position.set(worldX, baseY, worldZ);
    this._buildMesh();
  }

  _buildMesh() {
    if (this.trunk) {
      this.group.remove(this.trunk);
      this.trunk.geometry.dispose();
      this.trunk.material.dispose();
    }
    if (this.leaves) {
      this.group.remove(this.leaves);
      this.leaves.geometry.dispose();
      this.leaves.material.dispose();
    }
    const cfg = getTreeConfig();
    const v = cfg.visual[this.stage];

    const trunkGeo = new THREE.CylinderGeometry(v.trunkR * 0.85, v.trunkR, v.trunkH, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: cfg.trunkColor, roughness: 0.95 });
    this.trunk = new THREE.Mesh(trunkGeo, trunkMat);
    this.trunk.position.y = v.trunkH * 0.5;
    this.trunk.castShadow = true;
    this.group.add(this.trunk);

    if (v.leafR > 0.01) {
      // Stacked spheres for a pastel canopy
      const leafGeo = new THREE.SphereGeometry(v.leafR, 12, 10);
      const leafMat = new THREE.MeshStandardMaterial({
        color: v.color,
        roughness: 0.8,
        flatShading: true
      });
      this.leaves = new THREE.Mesh(leafGeo, leafMat);
      this.leaves.position.y = v.trunkH + v.leafR * 0.6;
      this.leaves.castShadow = true;
      this.group.add(this.leaves);
    } else {
      this.leaves = null;
    }
  }

  /** Advance lifecycle. Returns the new stage if it changed, else null. */
  update(dt) {
    if (!this.alive) return null;
    const cfg = getTreeConfig();
    this.stageAge += dt;
    const dur = cfg.stageDurations[this.stage];
    if (this.stageAge < dur) return null;

    const next = this._nextStage(this.stage);
    if (next === null) {
      // DEAD stage timed out → tree disappears.
      this.alive = false;
      return TREE_STAGE.DEAD;
    }
    this.stage = next;
    this.stageAge = 0;
    this.chopHitsRemaining = cfg.chopHits[this.stage];
    this._buildMesh();
    return this.stage;
  }

  _nextStage(s) {
    switch (s) {
      case TREE_STAGE.SAPLING:   return TREE_STAGE.YOUNG;
      case TREE_STAGE.YOUNG:     return TREE_STAGE.MATURE;
      case TREE_STAGE.MATURE:    return TREE_STAGE.WITHERING;
      case TREE_STAGE.WITHERING: return TREE_STAGE.DEAD;
      case TREE_STAGE.DEAD:      return null;
      default: return null;
    }
  }

  /** Hit once. Returns { wood, fell } where fell=true means tree should be removed. */
  chop() {
    if (!this.alive) return { wood: 0, fell: false };
    this.chopHitsRemaining -= 1;
    if (this.chopHitsRemaining > 0) return { wood: 0, fell: false };
    const cfg = getTreeConfig();
    const wood = cfg.woodYield[this.stage] || 0;
    this.alive = false;
    return { wood, fell: true };
  }

  /** Snapshot for network sync. */
  serialize() {
    return {
      id: this.id,
      ix: this.ix,
      iz: this.iz,
      worldX: this.worldX,
      worldZ: this.worldZ,
      baseY: this.baseY,
      stage: this.stage,
      stageAge: this.stageAge
    };
  }

  /** Force-apply a snapshot from the network. */
  applyState({ stage, stageAge }) {
    if (stage && stage !== this.stage) {
      this.stage = stage;
      const cfg = getTreeConfig();
      this.chopHitsRemaining = cfg.chopHits[this.stage];
      this._buildMesh();
    }
    if (typeof stageAge === 'number') this.stageAge = stageAge;
  }

  dispose() {
    if (this.trunk) {
      this.trunk.geometry.dispose();
      this.trunk.material.dispose();
    }
    if (this.leaves) {
      this.leaves.geometry.dispose();
      this.leaves.material.dispose();
    }
  }
}
