/**
 * Herald Blast Attack Config
 * Herald-specific blast ability stats and multipliers.
 * Blows all characters in radius far away.
 */
export const HERALD_BLAST_ATTACK_CONFIG = {
  radius: 2.0,              // Radius of the blast effect
  horizontalVelocity: 20.0, // Horizontal velocity to push characters away (farther)
  verticalVelocity: 10.0,    // Vertical velocity to launch characters up (0 = no bounce, just slide)
  velocityDecay: 0.98,      // Velocity decay per frame (0.98 = 2% decay per frame, more sustained)
  bounceRestitution: 0.1,   // Bounce restitution (not used when verticalVelocity is 0)
  minBounceVelocity: 0.5,   // Minimum vertical velocity to trigger bounce (stop bouncing when slower)
  cooldown: 12,            // Cooldown in seconds
  animationDuration: 0.8,   // Animation duration in seconds
};

