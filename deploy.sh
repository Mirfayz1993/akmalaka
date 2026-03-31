#!/bin/bash
set -e

echo "=== Wood ERP Deploy ==="

# 1. Dependencies
echo "[1/4] npm install..."
npm install

# 2. Build
echo "[2/4] next build..."
npm run build

# 3. DB migration
echo "[3/4] DB migration..."
npx drizzle-kit migrate

# 4. PM2 restart
echo "[4/4] PM2 restart..."
pm2 reload ecosystem.config.js --update-env || pm2 start ecosystem.config.js

echo "=== Deploy tugadi ==="
pm2 status
