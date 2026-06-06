# Security Features for Safe Crossplay

This document outlines the security measures implemented to ensure safe and fair crossplay gameplay.

## Overview

The multiplayer system has been optimized with comprehensive security measures to prevent cheating, ensure fair play, and protect against common multiplayer vulnerabilities.

## Security Features

### 1. Input Validation & Sanitization

All incoming data from clients is validated and sanitized before processing:

- **Position Validation**: Player positions are validated against arena bounds and checked for impossible teleportation
- **Speed Validation**: Movement speed is validated to prevent speed hacks
- **Rotation Validation**: Rotation values are normalized and validated
- **Damage Validation**: Damage values are clamped to valid ranges
- **Type Validation**: All data types are validated before processing

**Location**: `src/server/utils/validation.js`

### 2. Rate Limiting

Rate limiting prevents message spam and DoS attacks:

- **Player State**: Max 20 updates per second
- **Projectile Creation**: Max 5 per second
- **Projectile Updates**: Max 30 per second
- **Damage Events**: Max 10 per second
- **Character Changes**: Max 2 per second

Rate limits are enforced per socket connection and automatically cleaned up on disconnect.

**Location**: `src/server/utils/validation.js` (RateLimiter class)

### 3. Anti-Cheat Measures

#### Position Validation
- Maximum position delta per update: 10 units
- Arena bounds checking for all positions
- Y-axis validation (jump height limits)
- Previous position tracking to detect teleportation

#### Speed Validation
- Maximum movement speed: 15 units/second
- Velocity validation for projectiles
- Movement delta validation between updates

#### Damage Validation
- Health values clamped to valid ranges (0-100)
- Damage values validated against maximum limits
- Server-side health tracking

### 4. Room Security

- **Room Code Validation**: Room codes must match format `[A-Z0-9]{6}`
- **Room Capacity**: Maximum 4 players per room
- **Private Room Protection**: Private rooms cannot be joined without the code
- **Host Validation**: Only room hosts can update room settings

### 5. Data Sanitization

All string inputs are sanitized:
- HTML/script injection prevention
- Maximum length enforcement
- Special character filtering
- Character name whitelist validation

### 6. Client-Side Validation

Client-side validation helpers provide early validation before sending data:

**Location**: `src/utils/MultiplayerValidation.js`

Functions:
- `validateClientPosition()` - Validate player positions
- `validateClientPlayerState()` - Validate complete player state
- `validateClientProjectileData()` - Validate projectile data
- `validateClientDamageData()` - Validate damage data
- `validateClientCharacterName()` - Validate character names
- `validateClientRoomCode()` - Validate room codes

### 7. Error Handling

- Invalid data is silently rejected (not broadcast)
- Security warnings logged server-side
- No internal errors exposed to clients
- Graceful degradation on validation failures

## Implementation Details

### Server-Side Validation

All handlers in `src/server/handlers/` use validation:

- `playerHandler.js` - Validates player state, projectiles, damage
- `roomHandler.js` - Validates room codes, game states, capacity

### Validation Flow

1. **Rate Limiting Check**: First check if rate limit allows the request
2. **Data Validation**: Validate and sanitize all input data
3. **State Tracking**: Update server-side state tracking (positions, health)
4. **Broadcast**: Only broadcast validated data to other players

### Security Constants

Located in `src/server/utils/validation.js`:

```javascript
VALIDATION_LIMITS = {
  MAX_POSITION_DELTA: 10,
  MAX_SPEED: 15,
  MAX_ROTATION_DELTA: Math.PI * 2,
  MIN_HEALTH: 0,
  MAX_HEALTH: 100,
  MAX_DAMAGE: 100,
  MAX_PROJECTILE_SPEED: 30,
  MAX_Y_POSITION: 20,
  MIN_Y_POSITION: -5
}
```

## Best Practices

### For Developers

1. **Always validate on server**: Never trust client data
2. **Use validation utilities**: Use provided validation functions
3. **Log security events**: Log validation failures for monitoring
4. **Update limits as needed**: Adjust validation limits based on game balance

### For Players

- Fair play is enforced automatically
- Cheating attempts are detected and prevented
- All players experience consistent gameplay

## Monitoring

Security events are logged with `[Security]` prefix:
- Rate limit violations
- Invalid data attempts
- Validation failures

Monitor server logs for security warnings to identify potential issues.

## Future Enhancements

Potential future security improvements:

1. **Server-Side Physics**: Full server-side physics simulation
2. **Lag Compensation**: Better handling of network latency
3. **Cheat Detection**: Machine learning-based cheat detection
4. **Player Reputation**: Track and flag suspicious players
5. **Encryption**: End-to-end encryption for sensitive data

## Testing

To test security features:

1. **Rate Limiting**: Send rapid messages to test limits
2. **Position Validation**: Try sending invalid positions
3. **Damage Validation**: Test invalid damage values
4. **Room Security**: Test room code validation

All invalid requests should be silently rejected without affecting other players.


