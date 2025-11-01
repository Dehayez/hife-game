# ✅ Files Uploaded - What to Do Next

You've uploaded the files! Now continue with these steps:

## Step 1: SSH into Your Droplet

```bash
ssh root@174.138.4.195
```

## Step 2: Navigate to Project Directory

```bash
cd /var/www/hife-game
```

Verify files are there:
```bash
ls -la
```

You should see:
- `server.js`
- `package.json`
- `deploy-to-server.sh`
- `nginx-hife-websocket.conf`
- etc.

## Step 3: Run the Deployment Script

Make the script executable and run it:

```bash
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

**Watch the output!** The script will:
- Check/install Node.js
- Check/install PM2
- Install dependencies (this may take a minute)
- Create .env file
- Check port 3001
- Configure firewall
- Start server with PM2

It will tell you if anything needs attention.

## Step 4: After Script Completes

The script will output some information. Note down:
- Whether Node.js was installed
- Whether PM2 was installed
- Whether the server started successfully
- The PM2 startup command (if shown)

## Step 5: Verify Server is Running

Check PM2 status:
```bash
pm2 status
```

You should see `hife-websocket` in the list with status "online".

View server logs:
```bash
pm2 logs hife-websocket
```

You should see: `WebSocket server running on port 3001`

## Step 6: Set Up PM2 Startup (if needed)

If the script showed a PM2 startup command, run it:
```bash
# It will be something like:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u root --hp /root
```

Then save:
```bash
pm2 save
```

## Step 7: Configure Nginx

Copy nginx config:
```bash
sudo cp /var/www/hife-game/nginx-hife-websocket.conf /etc/nginx/sites-available/hife-websocket
```

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/
```

Test nginx config:
```bash
sudo nginx -t
```

**Important:** If you see any errors, fix them before proceeding!

If test passes, reload nginx:
```bash
sudo systemctl reload nginx
```

## Step 8: Verify Your Existing Site Still Works

**Important:** Check that Lyrikal Empire still works:
- Visit https://lyrikalempire.com
- Make sure it loads correctly

If it doesn't work, check nginx:
```bash
sudo nginx -t
sudo systemctl status nginx
```

## Step 9: Set Up SSL

Install Certbot (if not installed):
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
- Redirect HTTP to HTTPS? (Yes)

## Step 10: Configure DNS

Go to your DNS provider (where you manage hife.be) and add:

**Type:** A  
**Name:** `ws`  
**Value:** `174.138.4.195`  
**TTL:** 3600

Save and wait 5-10 minutes.

Test DNS:
```bash
ping ws.hife.be
```

Should show your droplet IP (174.138.4.195).

## Step 11: Configure Netlify

1. Go to https://app.netlify.com
2. Select your site (hife.be)
3. Go to: **Site settings** → **Environment variables**
4. Add:
   - **Key:** `VITE_WEBSOCKET_URL`
   - **Value:** `https://ws.hife.be`
5. Click **Save**
6. **Trigger a new deploy** (Deploys → Trigger deploy, or push a code change)

## Step 12: Test Everything

Test WebSocket server:
```bash
curl https://ws.hife.be/socket.io/
```

Should connect (might show 400 which is normal).

Test in browser:
1. Visit https://hife.be
2. Open browser console (F12)
3. Switch to "Shooting" mode
4. Create a room
5. Check console for errors

## Current Status

✅ Files uploaded to droplet  
⏳ Next: SSH into droplet and run deployment script

## Quick Commands (once SSH'd in)

```bash
cd /var/www/hife-game
chmod +x deploy-to-server.sh
./deploy-to-server.sh
```

Then continue with nginx setup, SSL, DNS, and Netlify!


