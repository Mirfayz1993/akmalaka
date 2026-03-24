#!/bin/bash
set -e

# ======= VPS MA'LUMOTLARI =======
# IP: 194.163.157.44
# User: root
# Port: 3001
# GitHub: https://github.com/Mirfayz1993/akmalaka.git
# ESLATMA: VPS'da boshqa loyihalar ham bor!
#   - Faqat akmalaka.biznesjon.uz nginx blokini o'zgartir
#   - Faqat wood-erp PM2 processini restart qil
# ================================

echo "========================================="
echo "  Wood ERP — Deploy Script"
echo "  VPS: 194.163.157.44"
echo "  Domen: akmalaka.biznesjon.uz"
echo "  Port: 3001"
echo "========================================="

# ======= 1. DATABASE =======
echo ""
echo "[1/6] Database yaratilmoqda..."
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname = 'wood_erp'" | grep -q 1 || sudo -u postgres psql -c "CREATE DATABASE wood_erp;"
echo "✅ wood_erp database tayyor"

# ======= 2. NODE.JS TEKSHIRISH =======
echo ""
echo "[2/6] Node.js tekshirilmoqda..."
node -v
npm -v
echo "✅ Node.js tayyor"

# ======= 3. LOYIHANI TAYYORLASH =======
echo ""
echo "[3/6] Loyiha tayyorlanmoqda..."
cd /root/wood-erp

# .env yaratish
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://postgres:1234@localhost:5432/wood_erp
ENVEOF

npm install --production=false
echo "✅ Dependencies o'rnatildi"

# ======= 4. DRIZZLE PUSH + BUILD =======
echo ""
echo "[4/6] Database jadvallar va build..."
npx drizzle-kit push --force
echo "✅ 13 jadval yaratildi"

npm run build
echo "✅ Production build tayyor"

# ======= 5. PM2 =======
echo ""
echo "[5/6] PM2 bilan ishga tushirilmoqda..."
pm2 delete wood-erp 2>/dev/null || true
PORT=3001 pm2 start npm --name "wood-erp" -- start
pm2 save
echo "✅ PM2 ishga tushdi (port 3001)"

# ======= 6. NGINX + SSL =======
echo ""
echo "[6/6] Nginx sozlanmoqda..."

cat > /etc/nginx/sites-available/akmalaka.biznesjon.uz << 'NGINXEOF'
server {
    listen 80;
    server_name akmalaka.biznesjon.uz;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXEOF

ln -sf /etc/nginx/sites-available/akmalaka.biznesjon.uz /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
echo "✅ Nginx sozlandi"

# SSL
echo ""
echo "SSL sertifikat o'rnatilmoqda..."
certbot --nginx -d akmalaka.biznesjon.uz --non-interactive --agree-tos --email admin@biznesjon.uz --redirect 2>/dev/null || echo "⚠️  SSL xato — qo'lda qiling: certbot --nginx -d akmalaka.biznesjon.uz"

echo ""
echo "========================================="
echo "  ✅ DEPLOY TUGADI!"
echo "  https://akmalaka.biznesjon.uz"
echo "========================================="
echo ""
echo "Tekshirish:"
echo "  pm2 status"
echo "  pm2 logs wood-erp"
echo "  curl http://localhost:3001"
