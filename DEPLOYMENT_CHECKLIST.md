# Hife Game Deployment Checklist

Use this checklist when deploying to DigitalOcean droplet.

## Pre-Deployment (Local)

- [ ] Code is tested locally
- [ ] All files are committed to git
- [ ] Server.js is production-ready
- [ ] Environment variables are documented

## Server Setup

- [ ] SSH into droplet (174.138.4.195)
- [ ] Node.js 20.x installed (`node --version`)
- [ ] PM2 installed (`pm2 --version`)
- [ ] nginx installed (`nginx -v`)
- [ ] Firewall configured (port 3001 allowed)

## Upload Files

- [ ] Files uploaded to droplet (via git clone or SCP)
- [ ] Files in correct directory (`/var/www/hife-game` or similar)
- [ ] Run `deploy-to-server.sh` script (or manually follow steps)

## Server Configuration

- [ ] `.env` file created with correct values:
  - [ ] `PORT=3001`
  - [ ] `ALLOWED_ORIGINS=https://hife.be,https://www.hife.be`
  - [ ] `NODE_ENV=production`
- [ ] Dependencies installed (`npm install` or `yarn install`)
- [ ] Server tested (runs without errors)
- [ ] Port 3001 verified available

## PM2 Setup

- [ ] Server started with PM2: `pm2 start server.js --name hife-websocket`
- [ ] PM2 status shows server running: `pm2 status`
- [ ] PM2 save: `pm2 save`
- [ ] PM2 startup configured: `pm2 startup` (and ran the command it showed)
- [ ] Server logs checked: `pm2 logs hife-websocket`

## Nginx Configuration

- [ ] Nginx config created: `/etc/nginx/sites-available/hife-websocket`
- [ ] Config file enabled: `sudo ln -s /etc/nginx/sites-available/hife-websocket /etc/nginx/sites-enabled/`
- [ ] Nginx config tested: `sudo nginx -t` (no errors)
- [ ] Nginx reloaded: `sudo systemctl reload nginx`
- [ ] Existing Lyrikal Empire site still works (verify!)

## SSL Certificate

- [ ] DNS configured (ws.hife.be → 174.138.4.195)
- [ ] DNS propagated (check with `ping ws.hife.be`)
- [ ] Certbot installed: `sudo apt install certbot python3-certbot-nginx -y`
- [ ] SSL certificate obtained: `sudo certbot --nginx -d ws.hife.be`
- [ ] SSL test successful: Visit https://ws.hife.be/socket.io/

## Netlify Configuration

- [ ] Logged into Netlify dashboard
- [ ] Navigated to Site settings → Environment variables
- [ ] Added variable: `VITE_WEBSOCKET_URL=https://ws.hife.be`
- [ ] Saved environment variable
- [ ] Triggered new deploy (or pushed code change)

## Testing

- [ ] Server accessible: `curl https://ws.hife.be/socket.io/`
- [ ] Lyrikal Empire still works (https://lyrikalempire.com)
- [ ] Hife game loads (https://hife.be)
- [ ] WebSocket connects in browser console (no errors)
- [ ] Can create room in Hife game
- [ ] Can join room from another browser
- [ ] Multiplayer features work (player movement, projectiles)

## Troubleshooting

If something doesn't work:

- [ ] Check server logs: `pm2 logs hife-websocket`
- [ ] Check nginx logs: `sudo tail -f /var/log/nginx/error.log`
- [ ] Check if server is running: `pm2 status`
- [ ] Check if port is listening: `sudo lsof -i :3001`
- [ ] Test nginx config: `sudo nginx -t`
- [ ] Check firewall: `sudo ufw status`
- [ ] Verify DNS: `nslookup ws.hife.be` or `dig ws.hife.be`

## Quick Reference Commands

```bash
# View server logs
pm2 logs hife-websocket

# Restart server
pm2 restart hife-websocket

# Check PM2 status
pm2 status

# Test nginx config
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx

# Check if server is listening
sudo lsof -i :3001

# Test WebSocket server
curl https://ws.hife.be/socket.io/
```

## Rollback (if needed)

- [ ] Stop Hife server: `pm2 stop hife-websocket`
- [ ] Disable nginx config: `sudo rm /etc/nginx/sites-enabled/hife-websocket`
- [ ] Reload nginx: `sudo systemctl reload nginx`
- [ ] Verify Lyrikal Empire still works

## Success Criteria

✅ Server running on port 3001  
✅ PM2 managing the process  
✅ Nginx routing ws.hife.be → localhost:3001  
✅ SSL certificate working (HTTPS)  
✅ Netlify configured  
✅ Can create and join rooms  
✅ Multiplayer features work  
✅ Lyrikal Empire unaffected  


