#!/bin/bash

# Deploy Hife Game WebSocket Server to DigitalOcean
# Run this script on your droplet after uploading files

set -e  # Exit on error

echo "🚀 Hife Game WebSocket Server Deployment Script"
echo "================================================"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running as root or with sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}Note: Some commands may need sudo. You may be prompted for password.${NC}"
fi

echo ""
echo "Step 1: Checking Node.js installation..."
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing Node.js 20.x...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo -e "${GREEN}✓ Node.js already installed: $(node --version)${NC}"
fi

echo ""
echo "Step 2: Checking PM2 installation..."
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing PM2...${NC}"
    sudo npm install -g pm2
else
    echo -e "${GREEN}✓ PM2 already installed: $(pm2 --version)${NC}"
fi

echo ""
echo "Step 3: Installing project dependencies..."
if [ -f "package.json" ]; then
    npm install
    echo -e "${GREEN}✓ Dependencies installed${NC}"
else
    echo -e "${YELLOW}⚠ package.json not found. Skipping...${NC}"
fi

echo ""
echo "Step 4: Checking .env file..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}.env file not found. Creating default .env...${NC}"
    cat > .env << EOF
PORT=3001
ALLOWED_ORIGINS=https://hife.be,https://www.hife.be
NODE_ENV=production
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
    echo -e "${YELLOW}⚠ Please review and update .env if needed${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi

echo ""
echo "Step 5: Checking if port 3001 is available..."
if sudo lsof -i :3001 &> /dev/null; then
    echo -e "${YELLOW}⚠ Port 3001 is already in use!${NC}"
    echo "Checking what's using it:"
    sudo lsof -i :3001
    echo -e "${YELLOW}⚠ You may need to use a different port or stop the existing service${NC}"
else
    echo -e "${GREEN}✓ Port 3001 is available${NC}"
fi

echo ""
echo "Step 6: Setting up firewall..."
if command -v ufw &> /dev/null; then
    echo "Allowing port 3001 through firewall..."
    sudo ufw allow 3001/tcp
    echo -e "${GREEN}✓ Firewall configured${NC}"
else
    echo -e "${YELLOW}⚠ ufw not found. Please configure firewall manually${NC}"
fi

echo ""
echo "Step 7: Testing server startup..."
if [ -f "server.js" ]; then
    echo "Testing server (will stop after 2 seconds)..."
    timeout 2 node server.js || true
    echo -e "${GREEN}✓ Server test completed${NC}"
else
    echo -e "${YELLOW}⚠ server.js not found${NC}"
fi

echo ""
echo "Step 8: Setting up PM2..."
if [ -f "server.js" ]; then
    # Check if already running
    if pm2 list | grep -q "hife-websocket"; then
        echo "Hife WebSocket already running in PM2. Restarting..."
        pm2 restart hife-websocket
    else
        echo "Starting server with PM2..."
        pm2 start server.js --name hife-websocket
    fi
    pm2 save
    echo -e "${GREEN}✓ Server started with PM2${NC}"
    echo ""
    echo "PM2 Status:"
    pm2 list
else
    echo -e "${YELLOW}⚠ server.js not found. Cannot start with PM2${NC}"
fi

echo ""
echo "Step 9: Setting up PM2 startup script..."
pm2 startup
echo -e "${GREEN}✓ PM2 startup configured${NC}"
echo -e "${YELLOW}⚠ Please run the command shown above to complete PM2 startup setup${NC}"

echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment script completed!${NC}"
echo ""
echo "Next steps:"
echo "1. Configure nginx (see DIGITALOCEAN_EXISTING_DROPLET.md)"
echo "2. Set up SSL with Certbot: sudo certbot --nginx -d ws.hife.be"
echo "3. Configure DNS: Add A record for ws.hife.be pointing to 174.138.4.195"
echo "4. Set Netlify environment variable: VITE_WEBSOCKET_URL=https://ws.hife.be"
echo ""
echo "View server logs: pm2 logs hife-websocket"
echo "View PM2 status: pm2 status"


