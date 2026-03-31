# Wood ERP — Deploy qo'llanmasi

**Server:** `194.163.157.44`
**Domen:** `akmalaka.biznesjon.uz`
**Port:** `3001`
**Yo'l:** `/var/www/wood-erp`

---

## Birinchi marta deploy (Initial Setup)

### 1. Serverga ulan

```bash
ssh root@194.163.157.44
```

### 2. Loyihani klonla

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/Mirfayz1993/akmalaka.git wood-erp
cd wood-erp
```

### 3. `.env` faylini yaratish

```bash
cp .env.example .env
nano .env
```

`.env` ichiga:
```
DATABASE_URL=postgresql://postgres:20262026@localhost:5432/wood_erp
```

### 4. Dependencies o'rnatish va build

```bash
npm ci
npm run build
```

### 5. DB migration

```bash
npx drizzle-kit migrate
```

### 6. PM2 bilan ishga tushirish

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 7. Nginx config

```bash
cp nginx.akmalaka.conf /etc/nginx/sites-available/akmalaka
ln -s /etc/nginx/sites-available/akmalaka /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

### 8. SSL (ixtiyoriy)

```bash
certbot --nginx -d akmalaka.biznesjon.uz
```

---

## Yangilanish (Update/Redeploy)

Mahalliy kompyuterda:
```bash
git add -A && git commit -m "..." && git push origin master
```

Serverda:
```bash
cd /var/www/wood-erp && git pull && bash deploy.sh
```

---

## Foydali buyruqlar

```bash
pm2 status           # barcha processlar holati
pm2 logs wood-erp    # loglarni ko'rish
pm2 restart wood-erp # qayta ishga tushirish
pm2 stop wood-erp    # to'xtatish
```

---

## Muammo chiqsa

**Port band bo'lsa:**
```bash
lsof -i :3001
kill -9 <PID>
```

**Build xato bo'lsa:**
```bash
rm -rf .next && npm run build
```

**DB ulanmasa:**
```bash
psql -U postgres -d wood_erp -c "\dt"
```
