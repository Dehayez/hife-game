# DigitalOcean WebSocket Server Setup Guide

Complete guide to deploy the WebSocket server on your DigitalOcean droplet for multiplayer at https://hife.be

## Prerequisites

- DigitalOcean droplet running Ubuntu
- SSH access to your droplet
- Domain name (hife.be) with DNS control
- Netlify account for frontend deployment

## Step 1: SSH into Your Droplet

```bash
ssh root@your-droplet-ip
```

Or if you have a non-root user:
```bash
ssh your-user@your-droplet-ip
```

## Step 2: Install Node.js

Check if Node.js is already installed:
```bash
node --version
```

If not installed, install Node.js 20.x (LTS):
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
```

Verify installation:
```bash
node --version
npm --version
```

## Step 3: Install Yarn (if needed)

```bash
npm install -g yarn
```

## Step 4: Clone or Upload Your Project

### Option A: Clone from GitHub (recommended)

```bash
cd /var/www  # or wherever you want to store it
git clone https://github.com/your-username/Hife-game.git
cd Hife-game
```

### Option B: Upload files via SCP (from your local machine)

From your local terminal:
```bash
scp -r /Users/Dehayez/Sites/Hife-game root@your-droplet-ip:/var/www/hife-game
```

Then on the server:
```bash
cd /var/www/hife-game
```

## Step 5: Install Dependencies

```bash
yarn install
# or
npm install
```

## Step 6: Set Up Environment Variables

Create a `.env` file:
```bash
nano .env
```

Add these variables:
```
PORT=3001
ALLOWED_ORIGINS=https://hife.be,https://www.hife.be
NODE_ENV=production
```

Save and exit (Ctrl+X, then Y, then Enter)

## Step 7: Test the Server (Optional)

Test if the server runs:
```bash
node server.js
```

You should see: `WebSocket server running on port 3001`

Press Ctrl+C to stop it.

## Step 8: Install PM2 (Process Manager)

PM2 keeps your server running and restarts it if it crashes:

```bash
npm install -g pm2
```

## Step 9: Start Server with PM2

```bash
pm2 start server.js --name hife-websocket
```

Save PM2 configuration:
```bash
pm2 save
```

Make PM2 start on boot:
```bash
pm2 startup
```

Follow the command it outputs (usually something like `sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u your-user --hp /home/your-user`)

Verify it's running:
```bash
pm2 status
pm2 logs hife-websocket
```

## Step 10: Configure Firewall

Allow port 3001 through the firewall:
```bash
sudo ufw allow 3001/tcp
sudo ufw reload
```

## Step 11: Install and Configure Nginx

Install nginx:
```bash
sudo apt update
sudo apt install nginx -y
```

Start nginx:
```bash
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Step 12: Configure Nginx as Reverse Proxy

Create nginx configuration for WebSocket:

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
        proxy_pass http://localhost:3001;
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

Save and exit.

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/
```

Test nginx configuration:
```bash
sudo nginx -t
```

If successful, reload nginx:
```bash
sudo systemctl reload nginx
```

## Step 13: Set Up SSL with Let's Encrypt

Install Certbot:
```bash
sudo apt install certbot python3-certbot-nginx -y
```

Get SSL certificate:
```bash
sudo certbot --nginx -d ws.hife.be
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

Certbot will automatically:
- Get SSL certificate
- Update nginx config
- Set up auto-renewal

## Step 14: Configure DNS

Go to your domain DNS provider (where you manage hife.be DNS records) and add:

**Type:** A or CNAME  
**Name:** `ws`  
**Value:** Your droplet IP address (if A record) or droplet hostname (if CNAME)  
**TTL:** 3600 (or default)

Wait a few minutes for DNS propagation.

Test DNS:
```bash
ping ws.hife.be
```

You should see your droplet IP address.

## Step 15: Verify WebSocket Server

Test the connection:
```bash
curl -i -N -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" -H "Sec-WebSocket-Key: test" https://ws.hife.be/socket.io/
```

Or open in browser: `https://ws.hife.be/socket.io/`

You should see Socket.io connection info (might show 400 Bad Request which is normal for direct browser access).

## Step 16: Configure Netlify Environment Variable

1. Go to https://app.netlify.com
2. Select your site (hife.be)
3. Go to: **Site settings** → **Environment variables**
4. Click **Add a variable**
5. Add:
   - **Key:** `VITE_WEBSOCKET_URL`
   - **Value:** `https://ws.hife.be`
6. Click **Save**
7. **Trigger a new deploy** (push a commit or use "Trigger deploy" button)

## Step 17: Test Multiplayer

1. Open https://hife.be in two different browsers
2. Switch to "Shooting" mode
3. Create a room in one browser
4. Join the room in the other browser
5. Test character movement, projectiles, etc.

## Troubleshooting

### Server not running
```bash
pm2 status
pm2 logs hife-websocket
pm2 restart hife-websocket
```

### Nginx errors
```bash
sudo nginx -t
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
```

### Firewall issues
```bash
sudo ufw status
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3001/tcp
```

### DNS not working
Wait a few minutes for propagation, or check DNS:
```bash
nslookup ws.hife.be
dig ws.hife.be
```

### SSL certificate renewal
Certbot auto-renews, but you can test:
```bash
sudo certbot renew --dry-run
```

## Maintenance Commands

**View server logs:**
```bash
pm2 logs hife-websocket
```

**Restart server:**
```bash
pm2 restart hife-websocket
```

**Stop server:**
```bash
pm2 stop hife-websocket
```

**Update server (after pulling new code):**
```bash
cd /var/www/hife-game  # or your project path
git pull  # if using git
yarn install  # or npm install
pm2 restart hife-websocket
```

## Security Notes

- Keep your server updated: `sudo apt update && sudo apt upgrade`
- Use strong SSH keys, disable password login
- Keep PM2 and nginx updated
- Monitor logs regularly
- Consider setting up fail2ban for additional security

## Summary

After completing these steps:
- ✅ WebSocket server running on your droplet (port 3001)
- ✅ PM2 keeping it alive and restarting on reboot
- ✅ Nginx reverse proxy handling HTTPS at ws.hife.be
- ✅ SSL certificate from Let's Encrypt
- ✅ DNS configured for ws.hife.be
- ✅ Netlify configured to use ws.hife.be
- ✅ Multiplayer should work on https://hife.be

Your WebSocket server URL: **https://ws.hife.be**



