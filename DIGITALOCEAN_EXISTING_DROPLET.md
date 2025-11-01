# Adding Hife Game to Existing DigitalOcean Droplet

Guide to safely add the Hife game WebSocket server to your existing droplet that's running Lyrikal Empire.

## Your Current Setup

- **Droplet IP:** `174.138.4.195`
- **Lyrikal Empire:** Running on port `4000`
- **Domain:** `lyrikalempire.com` / `www.lyrikalempire.com`
- **Hife Game:** Will use port `3001` (safe, won't conflict with port 4000)
- **Hife Domain:** `hife.be` with subdomain `ws.hife.be`

## Prerequisites

- Existing droplet running Lyrikal Empire on port 4000
- nginx already configured for lyrikalempire.com
- SSH access to your droplet
- Domain control for hife.be DNS

## Step 1: Check Current Setup

SSH into your droplet:
```bash
ssh your-user@174.138.4.195
# or
ssh root@174.138.4.195
```

Check what ports are in use:
```bash
sudo netstat -tulpn | grep LISTEN
# or
sudo ss -tulpn | grep LISTEN
```

Check what services are running:
```bash
pm2 list  # if you use PM2
systemctl list-units --type=service --state=running
```

## Step 2: Verify Port 3001 is Available

Since Lyrikal Empire uses port 4000, port 3001 should be free. Verify:
```bash
sudo lsof -i :3001
sudo lsof -i :4000  # Check your existing service
```

If port 3001 is taken, you can use port 3002 or 5000. For now, we'll use 3001.

## Step 3: Clone from GitHub (Recommended)

First, push your code to GitHub if not already:

```bash
cd /Users/Dehayez/Sites/Hife-game
git add .
git commit -m "Add WebSocket server deployment files"
git push origin main
```

Then on your droplet, clone the repository:

```bash
cd /var/www
git clone https://github.com/Dehayez/hife-game.git hife-game
cd hife-game
```

**Your GitHub repo:** https://github.com/Dehayez/hife-game

**For private repos (if you make it private later):**
- Use SSH: `git clone git@github.com:Dehayez/hife-game.git hife-game`
- Or set up GitHub credentials on your droplet

### Alternative: Upload via SCP (if not using GitHub)

If you prefer not to use GitHub:

```bash
# From your local machine:
scp -r /Users/Dehayez/Sites/Hife-game root@174.138.4.195:/var/www/hife-game
```

Then on the server:
```bash
cd /var/www/hife-game
```

## Step 4: Install Node.js (if not installed)

Check if Node.js is installed:
```bash
node --version
```

If not installed, install Node.js 20.x:
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify:
```bash
node --version
npm --version
```

## Step 5: Install Dependencies

```bash
cd /var/www/hife-game  # or your project path
npm install
# or if you use yarn
yarn install
```

## Step 6: Create Environment File

Create `.env` file:
```bash
nano .env
```

Add:
```
PORT=3001
ALLOWED_ORIGINS=https://hife.be,https://www.hife.be
NODE_ENV=production
```

Save and exit (Ctrl+X, Y, Enter)

**Note:** If port 3001 is taken, use a different port like 3002:
```
PORT=3002
```

## Step 7: Test the Server (Optional)

Test if it runs without conflicts:
```bash
node server.js
```

You should see: `WebSocket server running on port 3001` (or your chosen port)

Press Ctrl+C to stop.

## Step 8: Install PM2 (if not installed)

Check if PM2 is installed:
```bash
pm2 --version
```

If not installed:
```bash
npm install -g pm2
```

## Step 9: Start Hife Server with PM2

Start the server with a unique name:
```bash
pm2 start server.js --name hife-websocket
```

Verify it's running:
```bash
pm2 status
```

You should see both your existing services AND `hife-websocket` in the list.

## Step 10: Configure Firewall (if needed)

Check firewall status:
```bash
sudo ufw status
```

Allow your WebSocket port:
```bash
sudo ufw allow 3001/tcp
# or if you used a different port:
sudo ufw allow 3002/tcp
```

Reload firewall:
```bash
sudo ufw reload
```

## Step 11: Configure Nginx for Subdomain

Now we'll add a new nginx configuration for `ws.hife.be` without affecting your existing Lyrikal Empire setup.

Check your existing nginx configs:
```bash
ls -la /etc/nginx/sites-available/
ls -la /etc/nginx/sites-enabled/
```

Create new nginx config for Hife WebSocket:
```bash
sudo nano /etc/nginx/sites-available/hife-websocket
```

Add this configuration:
```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    listen 80;
    server_name ws.hife.be;

    location / {
        proxy_pass http://localhost:3001;  # or 3002 if you used different port
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket specific timeouts
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
    }
}
```

**Important:** Replace `localhost:3001` with your actual port if you used a different one.

Save and exit (Ctrl+X, Y, Enter)

## Step 12: Enable the Nginx Site

Enable the new config:
```bash
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/
```

**Test nginx configuration** (important - this checks for conflicts):
```bash
sudo nginx -t
```

If you see any errors, fix them before proceeding.

If successful, reload nginx:
```bash
sudo systemctl reload nginx
```

**Verify your existing site still works:**
- Check your Lyrikal Empire site - it should still be accessible
- Check nginx status: `sudo systemctl status nginx`

## Step 13: Set Up SSL for ws.hife.be

Install Certbot if not installed:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

Get SSL certificate for the subdomain:
```bash
sudo certbot --nginx -d ws.hife.be
```

This will:
- Get SSL certificate for ws.hife.be
- Update the nginx config automatically
- NOT affect your existing certificates

Follow the prompts:
- Enter your email
- Agree to terms
- Choose redirect HTTP to HTTPS (recommended: Yes)

## Step 14: Configure DNS

Go to your DNS provider (where you manage hife.be) and add:

**Type:** A  
**Name:** `ws`  
**Value:** `174.138.4.195` (your droplet IP)  
**TTL:** 3600 (or default)

Wait a few minutes for DNS propagation.

Test DNS:
```bash
ping ws.hife.be
```

## Step 15: Verify Your Existing Services

**Important:** Before proceeding, verify your Lyrikal Empire still works:
- Visit https://lyrikalempire.com or https://www.lyrikalempire.com
- Check PM2 status: `pm2 list`
- You should see your existing Lyrikal Empire services still running

## Step 16: Save PM2 Configuration

Make PM2 start automatically on reboot:
```bash
pm2 save
pm2 startup
```

Follow the command it outputs (usually starts with `sudo env PATH=$PATH:/usr/bin`)

## Step 17: Verify Everything Works

Test the WebSocket server:
```bash
curl -i https://ws.hife.be/socket.io/
```

Check PM2 status:
```bash
pm2 status
```

You should see:
- Your existing Lyrikal Empire services (still running)
- `hife-websocket` (running)

Check nginx:
```bash
sudo systemctl status nginx
```

## Step 18: Configure Netlify

1. Go to https://app.netlify.com
2. Select your site (hife.be)
3. Go to: **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `VITE_WEBSOCKET_URL`
   - **Value:** `https://ws.hife.be`
6. Click **Save**
7. **Trigger a new deploy**

## Step 19: Test Both Services

1. **Test Lyrikal Empire:** Make sure it still works
2. **Test Hife Game:** 
   - Open https://hife.be
   - Switch to "Shooting" mode
   - Create/join a room
   - Test multiplayer

## Multiple Services on One Droplet - Summary

Your droplet will now run:

```
Droplet (€8/month - IP: 174.138.4.195)
├── nginx (reverse proxy)
│   ├── lyrikalempire.com → Lyrikal Empire (port 4000)
│   └── ws.hife.be → Hife WebSocket server (port 3001)
├── Lyrikal Empire (port 4000)
└── Hife WebSocket server (port 3001)
```

**Ports in use:**
- Port 4000: Lyrikal Empire (existing)
- Port 3001: Hife Game WebSocket server (new)
- Port 80/443: nginx (handles both domains)

## Maintenance Commands

**View Hife server logs:**
```bash
pm2 logs hife-websocket
```

**View all services:**
```bash
pm2 list
pm2 logs
```

**Restart Hife server:**
```bash
pm2 restart hife-websocket
```

**Restart all services:**
```bash
pm2 restart all
```

**Update Hife server (after code changes):**
```bash
cd /var/www/hife-game
git pull  # if using git
npm install  # or yarn install
pm2 restart hife-websocket
```

## Troubleshooting

### Check if ports conflict:
```bash
sudo lsof -i :3001
```

### Check if services are running:
```bash
pm2 list
systemctl list-units --type=service
```

### Check nginx for errors:
```bash
sudo nginx -t
sudo tail -f /var/log/nginx/error.log
```

### Check if existing site still works:
- Visit your Lyrikal Empire site
- Check nginx configs: `ls -la /etc/nginx/sites-enabled/`

### If something breaks:

1. **Disable Hife nginx config temporarily:**
   ```bash
   sudo rm /etc/nginx/sites-enabled/hife-websocket
   sudo nginx -t
   sudo systemctl reload nginx
   ```

2. **Stop Hife server:**
   ```bash
   pm2 stop hife-websocket
   ```

3. **Your existing services should still work normally**

## Safety Notes

✅ **Your existing Lyrikal Empire setup remains untouched:**
- Your existing nginx configs stay as-is
- Your existing services continue running
- We only ADD new configurations

✅ **Isolation:**
- Hife uses its own PM2 process
- Hife uses its own nginx config
- Hife uses its own subdomain (ws.hife.be)

✅ **Easy to remove:**
- Remove nginx config: `sudo rm /etc/nginx/sites-enabled/hife-websocket`
- Stop server: `pm2 stop hife-websocket`
- No impact on existing services

## Summary

After completing these steps:
- ✅ Lyrikal Empire continues running (unaffected)
- ✅ Hife WebSocket server running on port 3001
- ✅ nginx routing ws.hife.be to Hife server
- ✅ SSL certificate for ws.hife.be
- ✅ Netlify configured to use ws.hife.be
- ✅ Both services running on one droplet (€8/month)

**Your WebSocket server URL:** `https://ws.hife.be`


