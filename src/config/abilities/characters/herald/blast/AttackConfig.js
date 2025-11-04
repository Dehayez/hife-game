/**
 * Herald Blast Attack Config
 * Herald-specific blast ability stats and multipliers.
 * Blows all characters in radius far away.
 */
export const HERALD_BLAST_ATTACK_CONFIG = {
  radius: 4.0,              // Radius of the blast effect
  horizontalVelocity: 15.0, // Horizontal velocity to push characters away (farther)
  verticalVelocity: 12.0,   // Vertical velocity to launch characters up (same height)
  velocityDecay: 0.95,      // Velocity decay per frame (0.95 = 5% decay per frame)
  bounceRestitution: 0.6,  // Bounce restitution (0.6 = 60% of velocity retained on bounce)
  minBounceVelocity: 0.5,  // Minimum vertical velocity to trigger bounce (stop bouncing when slower)
  cooldown: 5.0,            // Cooldown in seconds
  animationDuration: 0.8,   // Animation duration in seconds
};

