# 🚀 Deploy Now - Using GitHub

Since you already uploaded via SCP, you can continue. But for future updates, here's how to use GitHub:

## Your GitHub Repository

**Repository:** https://github.com/Dehayez/hife-game

## Option 1: Continue with Already Uploaded Files

You've already uploaded files via SCP. Continue with:

```bash
ssh root@174.138.4.195
cd /var/www/hife-game
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

## Option 2: Use GitHub (For Updates Later)

If you want to use GitHub for future updates:

### On Your Droplet:

```bash
cd /var/www
git clone https://github.com/Dehayez/hife-game.git hife-game
cd hife-game
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

## After Deployment Script

Continue with these steps:

### Step 1: Configure Nginx

```bash
sudo cp /var/www/hife-game/nginx-hife-websocket.conf /etc/nginx/sites-available/hife-websocket
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Step 2: Set Up SSL

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d ws.hife.be
```

### Step 3: Configure DNS

Add to your DNS provider:

**Type:** A  
**Name:** `ws`  
**Value:** `174.138.4.195`  
**TTL:** 3600

### Step 4: Configure Netlify

1. Go to https://app.netlify.com
2. Select hife.be site
3. Site settings → Environment variables
4. Add: `VITE_WEBSOCKET_URL=https://ws.hife.be`
5. Trigger deploy

### Step 5: Test

```bash
curl https://ws.hife.be/socket.io/
```

Visit https://hife.be and test multiplayer!


