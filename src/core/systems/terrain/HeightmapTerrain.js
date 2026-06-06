import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';
import { getTerrainConfig } from '../../../config/terrain/TerrainConfig.js';

/**
 * HeightmapTerrain
 *
 * Vertex-colored plane the player can dig / raise / flatten one cell at a time.
 *
 * Cells are square; vertex grid is (widthCells+1) × (depthCells+1).
 * heights[ix + iz * vertCountX] holds the y value for vertex (ix, iz).
 * World x = ix * cellSize - halfSize, world z = iz * cellSize - halfSize.
 *
 * After mutating, call rebuildVerticesAround(ix, iz, radius) to push the
 * affected slice to the GPU and recompute normals.
 */
export class HeightmapTerrain {
  constructor(arenaSize) {
    const cfg = getTerrainConfig();
    this.arenaSize = arenaSize;
    this.cellSize = 1 / cfg.cellsPerUnit;
    this.widthCells = Math.round(arenaSize * cfg.cellsPerUnit);
    this.depthCells = this.widthCells;
    this.vertCountX = this.widthCells + 1;
    this.vertCountZ = this.depthCells + 1;
    this.heights = new Float32Array(this.vertCountX * this.vertCountZ);
    this.step = cfg.step;
    this.minH = cfg.minHeight;
    this.maxH = cfg.maxHeight;
    this.paletteStops = cfg.paletteStops;

    this._buildMesh();
  }

  _buildMesh() {
    const geo = new THREE.PlaneGeometry(
      this.arenaSize,
      this.arenaSize,
      this.widthCells,
      this.depthCells
    );
    // Plane lies on XZ after rotation
    geo.rotateX(-Math.PI / 2);

    // Initial colors
    const colors = new Float32Array(geo.attributes.position.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: true
    });

    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.castShadow = false;
    this.mesh.name = 'apocalypse-cottage-terrain';

    this._refreshAllColors();
    geo.computeVertexNormals();
  }

  // -------- coordinate helpers --------

  worldToCell(x, z) {
    const half = this.arenaSize / 2;
    const ix = Math.round((x + half) / this.cellSize);
    const iz = Math.round((z + half) / this.cellSize);
    return { ix, iz };
  }

  cellToWorld(ix, iz) {
    const half = this.arenaSize / 2;
    return {
      x: ix * this.cellSize - half,
      z: iz * this.cellSize - half
    };
  }

  inBounds(ix, iz) {
    return ix >= 0 && iz >= 0 && ix < this.vertCountX && iz < this.vertCountZ;
  }

  // -------- height access --------

  getHeight(ix, iz) {
    if (!this.inBounds(ix, iz)) return 0;
    return this.heights[ix + iz * this.vertCountX];
  }

  setHeight(ix, iz, h) {
    if (!this.inBounds(ix, iz)) return;
    const clamped = Math.max(this.minH, Math.min(this.maxH, h));
    this.heights[ix + iz * this.vertCountX] = clamped;
  }

  /**
   * Sample interpolated height at world (x, z).
   * Used by gravity to make characters walk on the terrain.
   */
  sampleWorldHeight(x, z) {
    const half = this.arenaSize / 2;
    const fx = (x + half) / this.cellSize;
    const fz = (z + half) / this.cellSize;
    const ix0 = Math.floor(fx);
    const iz0 = Math.floor(fz);
    const ix1 = ix0 + 1;
    const iz1 = iz0 + 1;
    if (ix0 < 0 || iz0 < 0 || ix1 >= this.vertCountX || iz1 >= this.vertCountZ) {
      return 0;
    }
    const tx = fx - ix0;
    const tz = fz - iz0;
    const h00 = this.heights[ix0 + iz0 * this.vertCountX];
    const h10 = this.heights[ix1 + iz0 * this.vertCountX];
    const h01 = this.heights[ix0 + iz1 * this.vertCountX];
    const h11 = this.heights[ix1 + iz1 * this.vertCountX];
    const h0 = h00 * (1 - tx) + h10 * tx;
    const h1 = h01 * (1 - tx) + h11 * tx;
    return h0 * (1 - tz) + h1 * tz;
  }

  // -------- mutations --------

  applyDig(ix, iz) {
    this.setHeight(ix, iz, this.getHeight(ix, iz) - this.step);
    this._rebuildAround(ix, iz, 1);
  }

  applyRaise(ix, iz) {
    this.setHeight(ix, iz, this.getHeight(ix, iz) + this.step);
    this._rebuildAround(ix, iz, 1);
  }

  applyFlatten(ix, iz, targetH) {
    // Flatten a 3×3 area around the cell to targetH (snapped to step).
    const snapped = Math.round(targetH / this.step) * this.step;
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        this.setHeight(ix + dx, iz + dz, snapped);
      }
    }
    this._rebuildAround(ix, iz, 2);
  }

  /** Apply a remote terrain delta from the server / another player. */
  applyDelta({ ix, iz, h }) {
    this.setHeight(ix, iz, h);
    this._rebuildAround(ix, iz, 1);
  }

  /** Serialize the current cell so the network layer can broadcast it. */
  serializeCell(ix, iz) {
    return { ix, iz, h: this.getHeight(ix, iz) };
  }

  // -------- internal rebuild --------

  _rebuildAround(ix, iz, radius) {
    const geo = this.mesh.geometry;
    const positions = geo.attributes.position.array;
    const colors = geo.attributes.color.array;

    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const x = ix + dx;
        const z = iz + dz;
        if (!this.inBounds(x, z)) continue;
        const vi = x + z * this.vertCountX;
        const h = this.heights[vi];
        positions[vi * 3 + 1] = h;
        const c = this._colorForHeight(h);
        colors[vi * 3] = c.r;
        colors[vi * 3 + 1] = c.g;
        colors[vi * 3 + 2] = c.b;
      }
    }

    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
    geo.computeVertexNormals();
  }

  _refreshAllColors() {
    const geo = this.mesh.geometry;
    const colors = geo.attributes.color.array;
    const positions = geo.attributes.position.array;
    for (let i = 0; i < this.heights.length; i++) {
      const h = this.heights[i];
      positions[i * 3 + 1] = h;
      const c = this._colorForHeight(h);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.attributes.position.needsUpdate = true;
    geo.attributes.color.needsUpdate = true;
  }

  _colorForHeight(h) {
    const stops = this.paletteStops;
    if (h <= stops[0].h) return this._hexToRgb(stops[0].color);
    if (h >= stops[stops.length - 1].h) return this._hexToRgb(stops[stops.length - 1].color);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i];
      const b = stops[i + 1];
      if (h >= a.h && h <= b.h) {
        const t = (h - a.h) / (b.h - a.h);
        const ca = this._hexToRgb(a.color);
        const cb = this._hexToRgb(b.color);
        return {
          r: ca.r + (cb.r - ca.r) * t,
          g: ca.g + (cb.g - ca.g) * t,
          b: ca.b + (cb.b - ca.b) * t
        };
      }
    }
    return { r: 0.5, g: 0.5, b: 0.5 };
  }

  _hexToRgb(hex) {
    return {
      r: ((hex >> 16) & 255) / 255,
      g: ((hex >> 8) & 255) / 255,
      b: (hex & 255) / 255
    };
  }
}
