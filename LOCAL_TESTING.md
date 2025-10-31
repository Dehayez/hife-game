# Local Testing Guide

## Quick Start (Local Testing)

### Step 1: Install Dependencies
```bash
yarn install
```

### Step 2: Start WebSocket Server (Terminal 1)
```bash
yarn server
```

You should see:
```
WebSocket server running on port 3001
Environment: development
```

### Step 3: Start Frontend (Terminal 2)
```bash
yarn dev
```

You should see:
```
VITE v5.x.x  ready in xxx ms
➜  Local:   http://localhost:5173/
```

### Step 4: Open Game in Browser
1. Open `http://localhost:5173` in your browser
2. Switch to "Shooting" game mode (top right)
3. Click "Create Room" - you'll get a room code like "ABC123"

### Step 5: Test Multiplayer (Same Computer)
You can test multiplayer in two ways:

**Option A: Multiple Browser Windows**
1. Open `http://localhost:5173` in a second browser window (or incognito mode)
2. Switch to "Shooting" mode
3. Click "Join Room" and enter the room code from Step 4
4. You should see both players!

**Option B: Multiple Browser Tabs**
1. Open `http://localhost:5173` in a new tab
2. Switch to "Shooting" mode  
3. Click "Join Room" and enter the room code
4. Both players should be visible

## Testing Checklist

- [ ] Server is running on port 3001 (Terminal 1)
- [ ] Frontend is running on port 5173 (Terminal 2)
- [ ] Game loads in browser
- [ ] Can switch to "Shooting" mode
- [ ] Can create a room and get a room code
- [ ] Can join room from second window/tab
- [ ] Both players appear in the game
- [ ] Players can move (positions sync)
- [ ] Players can shoot projectiles (left click for firebolt, right click for mortar)
- [ ] Projectiles appear for both players
- [ ] Players can take damage from projectiles

## Troubleshooting

**Server won't start:**
- Make sure port 3001 is not already in use
- Check if `socket.io` is installed: `yarn install`

**Can't connect:**
- Check browser console (F12) for errors
- Make sure server is running on port 3001
- Verify the server shows "Player connected" when you join

**Players don't appear:**
- Check browser console for errors
- Make sure both windows are in "Shooting" mode
- Try refreshing both windows

**Projectiles don't sync:**
- Check browser console for errors
- Verify both players are in the same room
- Make sure you're clicking (not just pressing keys)

## What You Should See

1. **Player 1 (Creator):**
   - Create room → Get room code (e.g., "ABC123")
   - See your character moving around
   - See Player 2 join and appear

2. **Player 2 (Joiner):**
   - Join room → Enter room code "ABC123"
   - See your character and Player 1's character
   - Both characters should move smoothly

3. **Shooting:**
   - Left click: Firebolt projectile (straight line)
   - Right click: Mortar projectile (arc trajectory)
   - Both players should see each other's projectiles
   - Projectiles should damage players

## Testing on Different Devices

To test on different devices on the same network:

1. Find your computer's local IP:
   - Mac: `ifconfig | grep "inet "` or System Preferences → Network
   - Windows: `ipconfig` in command prompt
   - Linux: `ip addr` or `hostname -I`
   
2. Update `src/config/multiplayer.js` temporarily:
   ```javascript
   export const WEBSOCKET_SERVER_URL = 'http://YOUR_LOCAL_IP:3001';
   ```

3. Or use the same IP in both places:
   - Server: `http://192.168.1.XXX:3001`
   - Frontend: `http://192.168.1.XXX:5173` (if accessible)

4. Make sure firewall allows connections on ports 3001 and 5173

## Next Steps After Testing

Once local testing works:
1. Deploy server to Railway/Render (see DEPLOYMENT.md)
2. Set `VITE_WEBSOCKET_URL` in Netlify
3. Deploy frontend to Netlify
4. Test on https://hife.be

