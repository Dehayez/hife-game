/**
 * GeometryPool.js
 * 
 * Manages a pool of reusable geometries with durability tracking.
 * Supports Sphere, Octahedron, and Cone geometries.
 * Optimizes memory usage by reusing geometries instead of creating/disposing them.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

/**
 * Geometry pool entry with durability tracking
 */
class PoolEntry {
  constructor(geometry, maxDurability = 100) {
    this.geometry = geometry;
    this.maxDurability = maxDurability;
    this.currentDurability = maxDurability;
    this.inUse = false;
    this.useCount = 0;
  }

  /**
   * Check if geometry is available and has durability
   */
  isAvailable() {
    return !this.inUse && this.currentDurability > 0;
  }

  /**
   * Acquire geometry for use
   */
  acquire() {
    if (!this.isAvailable()) {
      return false;
    }
    this.inUse = true;
    this.useCount++;
    return true;
  }

  /**
   * Release geometry back to pool
   * @param {number} durabilityLoss - Amount of durability to lose (default: 1)
   */
  release(durabilityLoss = 1) {
    if (!this.inUse) {
      return;
    }
    this.inUse = false;
    this.currentDurability = Math.max(0, this.currentDurability - durabilityLoss);
    
    // If durability exhausted, dispose geometry
    if (this.currentDurability <= 0 && this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
  }

  /**
   * Force dispose geometry (when pool is cleared)
   */
  dispose() {
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    this.inUse = false;
    this.currentDurability = 0;
  }
}

/**
 * Geometry pool manager
 */
class GeometryPool {
  constructor(maxDurability = 100, initialPoolSize = 10) {
    this.maxDurability = maxDurability;
    this.initialPoolSize = initialPoolSize;
    this.pools = new Map(); // Map<key, PoolEntry[]>
    this.activeGeometries = new WeakMap(); // Track which mesh uses which geometry
  }

  /**
   * Generate pool key from geometry parameters
   * @param {string} type - Geometry type ('Sphere', 'Octahedron', 'Cone')
   * @param {number} radius - Geometry radius (or radiusTop for Cone)
   * @param {number} segments - Geometry segments (or radiusBottom for Cone)
   * @param {number} height - Height for Cone (optional)
   * @returns {string} Pool key
   */
  _getKey(type, radius, segments, height = null) {
    if (height !== null) {
      return `${type}_${radius.toFixed(3)}_${segments.toFixed(3)}_${height.toFixed(3)}`;
    }
    return `${type}_${radius.toFixed(3)}_${segments}`;
  }

  /**
   * Create a new geometry based on type
   * @param {string} type - Geometry type ('Sphere', 'Octahedron', 'Cone')
   * @param {number} radius - Geometry radius (or radiusTop for Cone)
   * @param {number} segments - Geometry segments (or radiusBottom for Cone)
   * @param {number} height - Height for Cone (optional)
   * @returns {THREE.BufferGeometry} Created geometry
   */
  _createGeometry(type, radius, segments, height = null) {
    switch (type) {
      case 'Sphere':
        return new THREE.SphereGeometry(radius, segments, segments);
      case 'Octahedron':
        return new THREE.OctahedronGeometry(radius, segments);
      case 'Cone':
        // ConeGeometry: radius, height, radialSegments
        // Parameters: radius, segments (radialSegments), height
        return new THREE.ConeGeometry(radius, height || segments, segments);
      default:
        throw new Error(`Unsupported geometry type: ${type}`);
    }
  }

  /**
   * Get or create pool for a specific key
   * @param {string} key - Pool key
   * @returns {Array<PoolEntry>} Pool array
   */
  _getPool(key) {
    if (!this.pools.has(key)) {
      this.pools.set(key, []);
    }
    return this.pools.get(key);
  }

  /**
   * Find available geometry in pool
   * @param {string} key - Pool key
   * @returns {PoolEntry|null} Available pool entry or null
   */
  _findAvailable(key) {
    const pool = this._getPool(key);
    return pool.find(entry => entry.isAvailable()) || null;
  }

  /**
   * Create new pool entry
   * @param {string} type - Geometry type
   * @param {number} radius - Geometry radius
   * @param {number} segments - Geometry segments
   * @param {number} height - Height for Cone (optional)
   * @returns {PoolEntry} New pool entry
   */
  _createPoolEntry(type, radius, segments, height = null) {
    const geometry = this._createGeometry(type, radius, segments, height);
    return new PoolEntry(geometry, this.maxDurability);
  }

  /**
   * Pre-allocate pool entries for a specific geometry configuration
   * @param {string} type - Geometry type ('Sphere', 'Octahedron', 'Cone')
   * @param {number} radius - Geometry radius
   * @param {number} segments - Geometry segments
   * @param {number} count - Number of entries to pre-allocate
   * @param {number} height - Height for Cone (optional)
   */
  preallocate(type, radius, segments, count = null, height = null) {
    const key = this._getKey(type, radius, segments, height);
    const pool = this._getPool(key);
    const targetCount = count || this.initialPoolSize;
    
    // Only add if pool is smaller than target
    while (pool.length < targetCount) {
      pool.push(this._createPoolEntry(type, radius, segments, height));
    }
  }

  /**
   * Acquire a sphere geometry from the pool
   * @param {number} radius - Sphere radius
   * @param {number} segments - Geometry segments
   * @returns {THREE.SphereGeometry} Geometry from pool
   */
  acquireSphere(radius, segments) {
    return this.acquire('Sphere', radius, segments);
  }

  /**
   * Acquire an octahedron geometry from the pool
   * @param {number} radius - Octahedron radius
   * @param {number} detail - Detail level (segments)
   * @returns {THREE.OctahedronGeometry} Geometry from pool
   */
  acquireOctahedron(radius, detail = 0) {
    return this.acquire('Octahedron', radius, detail);
  }

  /**
   * Acquire a cone geometry from the pool
   * @param {number} radius - Cone radius
   * @param {number} height - Cone height
   * @param {number} radialSegments - Radial segments
   * @returns {THREE.ConeGeometry} Geometry from pool
   */
  acquireCone(radius, height, radialSegments) {
    return this.acquire('Cone', radius, radialSegments, height);
  }

  /**
   * Acquire a geometry from the pool (or create new one if pool is empty)
   * @param {string} type - Geometry type ('Sphere', 'Octahedron', 'Cone')
   * @param {number} radius - Geometry radius (or radiusTop for Cone)
   * @param {number} segments - Geometry segments (or radiusBottom for Cone)
   * @param {number} height - Height for Cone (optional)
   * @returns {THREE.BufferGeometry} Geometry from pool
   */
  acquire(type, radius, segments, height = null) {
    const key = this._getKey(type, radius, segments, height);
    
    // Try to find available geometry in pool
    let entry = this._findAvailable(key);
    
    // If no available, create new entry
    if (!entry) {
      entry = this._createPoolEntry(type, radius, segments, height);
      this._getPool(key).push(entry);
    }
    
    // Acquire the entry
    entry.acquire();
    
    return entry.geometry;
  }

  /**
   * Release a geometry back to the pool
   * @param {THREE.BufferGeometry} geometry - Geometry to release
   * @param {number} durabilityLoss - Amount of durability to lose (default: 1)
   */
  release(geometry, durabilityLoss = 1) {
    if (!geometry) {
      return;
    }

    // Find the pool entry for this geometry
    for (const [key, pool] of this.pools.entries()) {
      const entry = pool.find(e => e.geometry === geometry);
      if (entry) {
        entry.release(durabilityLoss);
        return;
      }
    }
    
    // If not found in pool, dispose it (orphaned geometry)
    if (geometry.dispose) {
      geometry.dispose();
    }
  }

  /**
   * Release geometry from a mesh
   * @param {THREE.Mesh} mesh - Mesh to release geometry from
   * @param {number} durabilityLoss - Amount of durability to lose (default: 1)
   */
  releaseFromMesh(mesh, durabilityLoss = 1) {
    if (!mesh || !mesh.geometry) {
      return;
    }
    
    this.release(mesh.geometry, durabilityLoss);
    // Don't set mesh.geometry to null - let the mesh handle cleanup
  }

  /**
   * Release geometry from a group (recursively)
   * @param {THREE.Group} group - Group to release geometries from
   * @param {number} durabilityLoss - Amount of durability to lose (default: 1)
   */
  releaseFromGroup(group, durabilityLoss = 1) {
    if (!group) {
      return;
    }
    
    group.traverse((child) => {
      if (child.geometry) {
        this.release(child.geometry, durabilityLoss);
      }
    });
  }

  /**
   * Get pool statistics
   * @returns {Object} Statistics about pool usage
   */
  getStats() {
    const stats = {
      totalPools: this.pools.size,
      totalEntries: 0,
      availableEntries: 0,
      inUseEntries: 0,
      exhaustedEntries: 0,
      pools: {}
    };

    for (const [key, pool] of this.pools.entries()) {
      const poolStats = {
        total: pool.length,
        available: 0,
        inUse: 0,
        exhausted: 0
      };

      for (const entry of pool) {
        poolStats.total++;
        if (entry.inUse) {
          poolStats.inUse++;
        } else if (entry.currentDurability > 0) {
          poolStats.available++;
        } else {
          poolStats.exhausted++;
        }
      }

      stats.totalEntries += poolStats.total;
      stats.availableEntries += poolStats.available;
      stats.inUseEntries += poolStats.inUse;
      stats.exhaustedEntries += poolStats.exhausted;
      stats.pools[key] = poolStats;
    }

    return stats;
  }

  /**
   * Clear all pools and dispose all geometries
   */
  clear() {
    for (const [key, pool] of this.pools.entries()) {
      for (const entry of pool) {
        entry.dispose();
      }
      pool.length = 0;
    }
    this.pools.clear();
    this.activeGeometries = new WeakMap();
  }

  /**
   * Clean up exhausted geometries from pools
   * Removes entries with 0 durability and no active users
   */
  cleanup() {
    for (const [key, pool] of this.pools.entries()) {
      // Remove exhausted entries that are not in use
      for (let i = pool.length - 1; i >= 0; i--) {
        const entry = pool[i];
        if (!entry.inUse && entry.currentDurability <= 0) {
          entry.dispose();
          pool.splice(i, 1);
        }
      }
      
      // If pool is empty, remove it
      if (pool.length === 0) {
        this.pools.delete(key);
      }
    }
  }
}

// Create singleton instance
let geometryPoolInstance = null;

/**
 * Get the singleton geometry pool instance
 * @param {number} maxDurability - Maximum durability for geometries (default: 100)
 * @param {number} initialPoolSize - Initial pool size for pre-allocation (default: 10)
 * @returns {GeometryPool} Pool instance
 */
export function getGeometryPool(maxDurability = 100, initialPoolSize = 10) {
  if (!geometryPoolInstance) {
    geometryPoolInstance = new GeometryPool(maxDurability, initialPoolSize);
  }
  return geometryPoolInstance;
}

/**
 * Reset the singleton instance (useful for testing or game reset)
 */
export function resetGeometryPool() {
  if (geometryPoolInstance) {
    geometryPoolInstance.clear();
    geometryPoolInstance = null;
  }
}

