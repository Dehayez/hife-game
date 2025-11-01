# 🚀 Quick Start - Deploy Hife Game WebSocket Server

## Your Server Details

- **Droplet IP:** `174.138.4.195`
- **Existing Service:** Lyrikal Empire (port 4000) - Don't touch!
- **New Service:** Hife Game WebSocket (port 3001)
- **Subdomain:** `ws.hife.be`

## Step 1: Upload Files to Your Droplet

From your local machine (Mac), run:

```bash
scp -r /Users/Dehayez/Sites/Hife-game root@174.138.4.195:/var/www/hife-game
```

Or if you use a non-root user:

```bash
scp -r /Users/Dehayez/Sites/Hife-game your-user@174.138.4.195:/var/www/hife-game
```

## Step 2: SSH into Your Droplet

```bash
ssh root@174.138.4.195
# or
ssh your-user@174.138.4.195
```

## Step 3: Run Automated Deployment Script

```bash
cd /var/www/hife-game
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

This script will:
- ✅ Install Node.js (if needed)
- ✅ Install PM2 (if needed)
- ✅ Install dependencies
- ✅ Create .env file
- ✅ Check port 3001
- ✅ Configure firewall
- ✅ Start server with PM2

## Step 5: Configure Nginx

Copy nginx config:

```bash
sudo cp /var/www/hife-game/nginx-hife-websocket.conf /etc/nginx/sites-available/hife-websocket
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/
sudo nginx -t  # Test config
sudo systemctl reload nginx  # Reload if test passes
```

## Step 6: Set Up SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ws.hife.be
```

Follow the prompts!

## Step 7: Configure DNS

Go to your DNS provider and add:

**Type:** A  
**Name:** `ws`  
**Value:** `174.138.4.195`  
**TTL:** 3600

Wait 5-10 minutes for DNS propagation.

## Step 8: Configure Netlify

1. Go to https://app.netlify.com
2. Select your `hife.be` site
3. Go to **Site settings** → **Environment variables**
4. Add: `VITE_WEBSOCKET_URL=https://ws.hife.be`
5. **Trigger a new deploy**

## Step 9: Test!

1. Visit https://ws.hife.be/socket.io/ (should work)
2. Visit https://hife.be
3. Create a room in "Shooting" mode
4. Test multiplayer with another browser

## Troubleshooting

**Server not running?**
```bash
pm2 status
pm2 logs hife-websocket
pm2 restart hife-websocket
```

**Nginx errors?**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**DNS not working?**
```bash
ping ws.hife.be
nslookup ws.hife.be
```

## Files You Have

- ✅ `deploy-to-server.sh` - Automated deployment script
- ✅ `nginx-hife-websocket.conf` - Nginx config template
- ✅ `DIGITALOCEAN_EXISTING_DROPLET.md` - Full detailed guide
- ✅ `DEPLOYMENT_CHECKLIST.md` - Step-by-step checklist
- ✅ `server.js` - WebSocket server (ready for production)

## Full Guide

For complete instructions, see: **`DIGITALOCEAN_EXISTING_DROPLET.md`**

