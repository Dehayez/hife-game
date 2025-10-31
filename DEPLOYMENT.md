# Deployment Guide for hife.be

## Quick Setup Steps

1. **Deploy WebSocket Server** (Railway/Render/Fly.io)
2. **Set Environment Variable** in Netlify: `VITE_WEBSOCKET_URL`
3. **Update Config** (if needed): `src/config/multiplayer.js`

## WebSocket Server Deployment Options

Since Netlify (your current hosting) only serves static files, you need to deploy the WebSocket server separately. Here are the best options:

### Option 1: Railway (Recommended - Easy & Free tier available)

1. Sign up at [railway.app](https://railway.app)
2. Create a new project
3. Connect your GitHub repo (or deploy from local)
4. Add a new service:
   - Select "Empty Service"
   - Add `server.js` as the entry point
5. Set environment variables:
   - `PORT` = 3001 (or Railway will auto-assign)
   - `ALLOWED_ORIGINS` = `https://hife.be,https://www.hife.be`
   - `NODE_ENV` = `production`
6. Railway will give you a URL like `https://your-app.railway.app`
7. Copy this URL

### Option 2: Render (Free tier available)

1. Sign up at [render.com](https://render.com)
2. Create a new Web Service
3. Connect your GitHub repo
4. Settings:
   - Build Command: (leave empty or `yarn install`)
   - Start Command: `node server.js`
   - Environment: `Node`
5. Add environment variables:
   - `ALLOWED_ORIGINS` = `https://hife.be,https://www.hife.be`
   - `NODE_ENV` = `production`
6. Render will give you a URL like `https://your-app.onrender.com`

### Option 3: Fly.io (More control)

1. Install flyctl: `curl -L https://fly.io/install.sh | sh`
2. Run `fly launch` in your project directory
3. Follow prompts to create app
4. Set environment variables:
   - `ALLOWED_ORIGINS` = `https://hife.be,https://www.hife.be`
5. Deploy: `fly deploy`

### Option 4: Use a Subdomain (Best for production)

If you want to use `ws.hife.be` or `api.hife.be`:

1. Deploy server to Railway/Render/Fly.io (get the URL)
2. Add a CNAME record in your DNS provider:
   - Type: CNAME
   - Name: `ws` (or `api`)
   - Value: `your-server.railway.app` (or your deployment URL)
   - TTL: 3600
3. Wait for DNS propagation (5-30 minutes)
4. Use `https://ws.hife.be` as your server URL

## Configure Netlify Environment Variable

After deploying your server:

1. Go to your Netlify dashboard
2. Navigate to: Site settings → Environment variables
3. Add a new variable:
   - Key: `VITE_WEBSOCKET_URL`
   - Value: Your server URL (e.g., `https://your-server.railway.app` or `https://ws.hife.be`)
4. Redeploy your site

## Alternative: Update Config File Directly

If you prefer not to use environment variables, edit `src/config/multiplayer.js`:

```javascript
export const WEBSOCKET_SERVER_URL = 'https://your-server.railway.app';
```

Then rebuild and redeploy.

## Testing Locally

1. Start your WebSocket server: `yarn server`
2. Create `.env.local` file:
   ```
   VITE_WEBSOCKET_URL=http://localhost:3001
   ```
3. Start frontend: `yarn dev`
4. Test multiplayer connection

## Production Checklist

- [ ] WebSocket server deployed (Railway/Render/Fly.io)
- [ ] Server URL copied
- [ ] Environment variable `VITE_WEBSOCKET_URL` set in Netlify
- [ ] Server CORS configured with `ALLOWED_ORIGINS` including `https://hife.be`
- [ ] Frontend rebuilt and redeployed
- [ ] Test multiplayer on https://hife.be

## Troubleshooting

- **CORS errors**: Make sure `ALLOWED_ORIGINS` includes your exact domain (`https://hife.be`)
- **Connection failed**: Check that `VITE_WEBSOCKET_URL` is set correctly in Netlify
- **502 errors**: Server might be sleeping (Render free tier), or check server logs
- **WebSocket connection refused**: Verify server is running and accessible from browser

## Server Environment Variables

Set these in your server deployment:

- `PORT` - Server port (usually auto-assigned by hosting)
- `ALLOWED_ORIGINS` - Comma-separated list: `https://hife.be,https://www.hife.be`
- `NODE_ENV` - Set to `production`

## Example Railway Setup

```yaml
# railway.json (optional)
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "node server.js",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

Environment variables in Railway dashboard:
- `ALLOWED_ORIGINS` = `https://hife.be,https://www.hife.be`
- `NODE_ENV` = `production`

