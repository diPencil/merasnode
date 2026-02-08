#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
echo "Installing Node 22..."
nvm install 22
nvm alias default 22
nvm use 22
node -v
npm -v

echo "Installing PM2 globally..."
npm install -g pm2
pm2 update

echo "Setting up MerasNode..."
cd ~/MerasNode
echo "Removing old node_modules..."
rm -rf node_modules
echo "Installing dependencies..."
npm install
echo "Generating Prisma client..."
npx prisma generate
echo "Building project..."
npm run build
echo "Restarting application..."
pm2 delete meras-node 2>/dev/null || true
pm2 start npm --name "meras-node" -- start
pm2 save
echo "Done!"
