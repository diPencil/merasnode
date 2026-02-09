#!/bin/bash
echo "Installing Chromium browser..."
sudo dnf install -y chromium

echo "Finding Chromium path..."
CHROME_PATH=$(which chromium-browser || which chromium)
echo "Chromium found at: $CHROME_PATH"

echo "Setting environment variable..."
export PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH

echo "Restarting WhatsApp service..."
cd ~/MerasNode
pm2 delete meras-whatsapp 2>/dev/null || true
pm2 start whatsapp-service/server-multi.js --name "meras-whatsapp" --env PUPPETEER_EXECUTABLE_PATH=$CHROME_PATH
pm2 save

echo "Done! Checking status..."
sleep 5
pm2 list
curl -s http://localhost:3001/health | head -20
