/**
 * DamageNumberManager.js
 * 
 * Manages floating damage numbers that appear when entities take damage.
 */

import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class DamageNumberManager {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.damageNumbers = [];
    this.canvas = null;
    this.context = null;
    this.texture = null;
    this.spriteMaterial = null;
  }

  /**
   * Initialize canvas for text rendering
   */
  _initCanvas() {
    if (this.canvas) return;
    
    this.canvas = document.createElement('canvas');
    this.canvas.width = 256;
    this.canvas.height = 128;
    this.context = this.canvas.getContext('2d');
    
    // Create sprite material
    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.needsUpdate = true;
    this.spriteMaterial = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      alphaTest: 0.1,
      depthWrite: false
    });
  }

  /**
   * Create damage number sprite
   * @param {number} damage - Damage value
   * @param {THREE.Vector3} position - World position
   * @param {number} color - Hex color (optional)
   * @returns {THREE.Sprite} Damage number sprite
   */
  _createDamageSprite(damage, position, color = 0xff0000) {
    this._initCanvas();
    
    // Clear canvas
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw damage number
    this.context.font = 'bold 48px Arial';
    this.context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
    this.context.strokeStyle = '#000000';
    this.context.lineWidth = 4;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    
    const text = Math.round(damage).toString();
    const x = this.canvas.width / 2;
    const y = this.canvas.height / 2;
    
    // Draw stroke (outline)
    this.context.strokeText(text, x, y);
    // Draw fill
    this.context.fillText(text, x, y);
    
    this.texture.needsUpdate = true;
    
    // Create sprite
    const sprite = new THREE.Sprite(this.spriteMaterial.clone());
    sprite.scale.set(1, 0.5, 1);
    sprite.position.copy(position);
    sprite.position.y += 0.5; // Offset above entity
    
    // Store damage number data
    sprite.userData = {
      lifetime: 0,
      maxLifetime: 1.0,
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.5,
        1.5 + Math.random() * 0.5,
        (Math.random() - 0.5) * 0.5
      ),
      initialPosition: position.clone()
    };
    
    return sprite;
  }

  /**
   * Show damage number
   * @param {number} damage - Damage value
   * @param {THREE.Vector3} position - World position
   * @param {number} color - Hex color (optional, default: red)
   */
  showDamage(damage, position, color = 0xff0000) {
    const sprite = this._createDamageSprite(damage, position, color);
    this.scene.add(sprite);
    this.damageNumbers.push(sprite);
    
    // Limit number of simultaneous damage numbers
    if (this.damageNumbers.length > 20) {
      const oldest = this.damageNumbers.shift();
      this.scene.remove(oldest);
      oldest.material.dispose();
      oldest.material.map.dispose();
    }
  }

  /**
   * Update all damage numbers
   * @param {number} dt - Delta time in seconds
   */
  update(dt) {
    for (let i = this.damageNumbers.length - 1; i >= 0; i--) {
      const sprite = this.damageNumbers[i];
      const data = sprite.userData;
      
      // Update lifetime
      data.lifetime += dt;
      
      // Remove if expired
      if (data.lifetime >= data.maxLifetime) {
        this.scene.remove(sprite);
        sprite.material.dispose();
        sprite.material.map.dispose();
        this.damageNumbers.splice(i, 1);
        continue;
      }
      
      // Update position
      sprite.position.add(data.velocity.clone().multiplyScalar(dt));
      
      // Fade out
      const lifeProgress = data.lifetime / data.maxLifetime;
      sprite.material.opacity = 1 - lifeProgress;
      
      // Scale up slightly then fade
      const scale = 1 + lifeProgress * 0.5;
      sprite.scale.set(scale, scale * 0.5, 1);
      
      // Make sprite face camera
      sprite.lookAt(this.camera.position);
    }
  }

  /**
   * Set camera reference
   * @param {THREE.Camera} camera - Camera reference
   */
  setCamera(camera) {
    this.camera = camera;
  }

  /**
   * Clear all damage numbers
   */
  clear() {
    for (const sprite of this.damageNumbers) {
      this.scene.remove(sprite);
      sprite.material.dispose();
      sprite.material.map.dispose();
    }
    this.damageNumbers = [];
  }
}

