/**
 * Baby Herald Bolt Particle Config
 * Baby Herald uses the same fire-style trail as Herald, but tinted white
 * to read as pure spore-light rather than flame.
 */
import { HERALD_BOLT_PARTICLE_CONFIG } from '../../herald/bolt/ParticleConfig.js';

export const BABY_HERALD_BOLT_PARTICLE_CONFIG = {
  ...HERALD_BOLT_PARTICLE_CONFIG,
  fireColors: {
    core: 0xffffff,
    mid: 0xffffff,
    outer: 0xffffff,
    smoke: 0xcccccc
  }
};
