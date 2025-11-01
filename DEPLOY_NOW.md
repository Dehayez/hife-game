# 🚀 Deploy Now - Step by Step

## Step 1: Push to GitHub (if not already pushed)

First, make sure your code is on GitHub:

```bash
cd /Users/Dehayez/Sites/Hife-game
git add .
git commit -m "Add WebSocket server deployment files"
git push origin main
```

## Step 2: SSH into Your Droplet

SSH into your droplet:

```bash
ssh root@174.138.4.195
```

(Or use `ssh your-user@174.138.4.195` if you use a non-root user)

## Step 3: Clone from GitHub

Once you're SSH'd into your droplet, clone your repository:

```bash
cd /var/www
git clone https://github.com/Dehayez/hife-game.git hife-game
cd hife-game
```

**Note:** Using your GitHub repo: https://github.com/Dehayez/hife-game

Or if you have SSH keys set up, use SSH:
```bash
git clone git@github.com:Dehayez/hife-game.git hife-game
```

## Step 4: Run the Deployment Script

Once you're in the project directory, run:

```bash
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

This will:
- Check/install Node.js
- Check/install PM2  
- Install dependencies
- Create .env file
- Start your server

Watch the output - it will tell you if anything needs attention.

## Step 5: Configure Nginx

After the script finishes, set up nginx:

```bash
# Copy nginx config
sudo cp /var/www/hife-game/nginx-hife-websocket.conf /etc/nginx/sites-available/hife-websocket

# Enable it
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/

# Test nginx config
sudo nginx -t

# If test passes, reload nginx
sudo systemctl reload nginx
```

## Step 6: Set Up SSL

```bash
# Install Certbot if not installed
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d ws.hife.be
```

Follow the prompts:
- Enter your email
- Agree to terms
- Redirect HTTP to HTTPS? (Yes)

## Step 7: Configure DNS

Go to wherever you manage DNS for `hife.be` and add:

**Type:** A  
**Name:** `ws`  
**Value:** `174.138.4.195`  
**TTL:** 3600

Save and wait 5-10 minutes for DNS propagation.

Test DNS:
```bash
ping ws.hife.be
```

Should show your droplet IP.

## Step 8: Configure Netlify

1. Go to https://app.netlify.com
2. Click on your site (hife.be)
3. Go to: **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `VITE_WEBSOCKET_URL`
   - **Value:** `https://ws.hife.be`
6. Click **Save**
7. **Trigger a new deploy** (Deploys → Trigger deploy, or push a code change)

## Step 9: Test Everything

1. **Test WebSocket server:**
   ```bash
   curl https://ws.hife.be/socket.io/
   ```
   Should connect (might show 400 which is normal).

2. **Test in browser:**
   - Visit https://hife.be
   - Open browser console (F12)
   - Switch to "Shooting" mode
   - Create a room
   - Check console for connection errors

3. **Test multiplayer:**
   - Open https://hife.be in two different browsers
   - Create room in one
   - Join room in the other
   - Test movement, projectiles, etc.

## Quick Commands Reference

**On your droplet:**
```bash
# View server logs
pm2 logs hife-websocket

# Restart server
pm2 restart hife-websocket

# Check server status
pm2 status

# Test nginx
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check if port is listening
sudo lsof -i :3001
```

## If Something Goes Wrong

**Server not starting?**
```bash
pm2 logs hife-websocket
pm2 restart hife-websocket
```

**Nginx errors?**
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

**Can't connect from browser?**
- Check DNS: `ping ws.hife.be`
- Check server is running: `pm2 status`
- Check firewall: `sudo ufw status`
- Check Netlify env var is set correctly

**Rollback (if needed):**
```bash
pm2 stop hife-websocket
sudo rm /etc/nginx/sites-enabled/hife-websocket
sudo systemctl reload nginx
# Your Lyrikal Empire will still work fine
```

## Need Help?

- Full detailed guide: `DIGITALOCEAN_EXISTING_DROPLET.md`
- Checklist: `DEPLOYMENT_CHECKLIST.md`
- Quick reference: `QUICK_START.md`

