# Quick Deployment Guide

## For Your DigitalOcean Droplet (174.138.4.195)

### Quick Start

1. **Upload files to your droplet:**
   ```bash
   scp -r /Users/Dehayez/Sites/Hife-game root@174.138.4.195:/var/www/hife-game
   ```

2. **SSH into your droplet:**
   ```bash
   ssh root@174.138.4.195
   ```

3. **Run deployment script:**
   ```bash
   cd /var/www/hife-game
   chmod +x deploy-to-server.sh
   ./deploy-to-server.sh
   ```

4. **Follow remaining steps in:** `DIGITALOCEAN_EXISTING_DROPLET.md`

## Important Files

- **`DIGITALOCEAN_EXISTING_DROPLET.md`** - Complete step-by-step guide (use this!)
- **`deploy-to-server.sh`** - Automated setup script
- **`nginx-hife-websocket.conf`** - Nginx config template
- **`DEPLOYMENT_CHECKLIST.md`** - Deployment checklist

## Your Setup

- **Droplet IP:** 174.138.4.195
- **Lyrikal Empire:** Port 4000 (existing - don't touch)
- **Hife Game:** Port 3001 (new)
- **Domain:** ws.hife.be → 174.138.4.195

## Quick Commands Reference

```bash
# View server logs
pm2 logs hife-websocket

# Restart server
pm2 restart hife-websocket

# Check status
pm2 status

# Test nginx
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

## After Deployment

1. Set Netlify environment variable: `VITE_WEBSOCKET_URL=https://ws.hife.be`
2. Trigger Netlify deploy
3. Test multiplayer on https://hife.be

See `DIGITALOCEAN_EXISTING_DROPLET.md` for full instructions.


