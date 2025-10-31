import * as THREE from 'https://unpkg.com/three@0.160.1/build/three.module.js';

export class ParticleManager {
  constructor(scene) {
    this.scene = scene;
    this.smokeParticles = [];
    this.maxParticles = 50;
  }

  spawnSmokeParticle(position) {
    // Create smoke particle geometry and material
    const size = 0.12 + Math.random() * 0.08;
    const geometry = new THREE.PlaneGeometry(size, size);
    
    // Smoke color - grayish white with slight variation
    const grayValue = 0.7 + Math.random() * 0.2;
    const smokeColor = new THREE.Color(grayValue, grayValue, grayValue);
    
    const material = new THREE.MeshBasicMaterial({
      color: smokeColor,
      transparent: true,
      opacity: 0.5 + Math.random() * 0.3,
      side: THREE.DoubleSide,
      alphaTest: 0.05,
      depthWrite: false // Allow overlapping particles
    });

    const particle = new THREE.Mesh(geometry, material);
    
    // Position particle at character's feet
    particle.position.copy(position);
    particle.position.y = 0.1; // Slightly above ground
    
    // Random horizontal offset for variety
    particle.position.x += (Math.random() - 0.5) * 0.3;
    particle.position.z += (Math.random() - 0.5) * 0.3;
    
    // Initialize particle properties
    particle.userData = {
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 0.4, // Horizontal spread
        0.4 + Math.random() * 0.4, // Upward drift
        (Math.random() - 0.5) * 0.4 // Horizontal spread
      ),
      lifetime: 0,
      maxLifetime: 1.0 + Math.random() * 0.5, // Longer lifetime for more visible trail
      initialSize: size,
      initialOpacity: material.opacity
    };

    this.scene.add(particle);
    this.smokeParticles.push(particle);

    // Remove oldest particles if we exceed max
    if (this.smokeParticles.length > this.maxParticles) {
      const oldest = this.smokeParticles.shift();
      this.scene.remove(oldest);
      oldest.geometry.dispose();
      oldest.material.dispose();
    }
  }

  update(dt) {
    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const particle = this.smokeParticles[i];
      const data = particle.userData;

      // Update lifetime
      data.lifetime += dt;

      // Check if particle should be removed
      if (data.lifetime >= data.maxLifetime) {
        this.scene.remove(particle);
        particle.geometry.dispose();
        particle.material.dispose();
        this.smokeParticles.splice(i, 1);
        continue;
      }

      // Update position
      particle.position.add(data.velocity.clone().multiplyScalar(dt));
      
      // Slow down over time (drag effect)
      data.velocity.multiplyScalar(0.995);

      // Fade out over time
      const lifeProgress = data.lifetime / data.maxLifetime;
      particle.material.opacity = data.initialOpacity * (1 - lifeProgress * lifeProgress); // Quadratic fade

      // Scale up as it rises (smoke expands)
      const scale = 1 + lifeProgress * 0.8;
      particle.scale.set(scale, scale, 1);

      // Make particle face camera by billboarding
      // This will be handled externally or we can add camera reference
    }

    // Billboard particles to camera (optional, can be done externally)
    // For now, particles are planes facing up
  }

  billboardToCamera(particles, camera) {
    if (!particles || !camera || particles.length === 0) return;
    
    const cameraWorldPos = new THREE.Vector3();
    camera.getWorldPosition(cameraWorldPos);
    
    for (const particle of particles) {
      // Make particle face camera by looking at camera position
      particle.lookAt(cameraWorldPos);
    }
  }

  clear() {
    for (const particle of this.smokeParticles) {
      this.scene.remove(particle);
      particle.geometry.dispose();
      particle.material.dispose();
    }
    this.smokeParticles = [];
  }
}

