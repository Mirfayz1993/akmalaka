# Wood ERP — Claude Code Qoidalari

## Agent jamoasi tartibi

Bu loyihada `.agents/` papkasidagi **6 ta agent** ishlaydi. Har bir task quyidagi **majburiy ketma-ketlikda** bajarilishi kerak:

```
1. Backend Botir   → server actions, DB (src/lib/actions/, src/db/)
2. Reviewer Ravshan → spec muvofiqligini tekshiradi
3. Frontend Farid  → UI pages, components (src/app/, src/components/)
4. Reviewer Ravshan → spec muvofiqligini tekshiradi
5. QA Qadir        → build + lint + kod sifati
6. Bughunter Bahodir → biznes logika, moliyaviy xatolar
```

**Bu tartibni buzish MUMKIN EMAS.**

## Asosiy qoidalar

- **PM Sardor** boshqaradi — hech qachon kod yozmaydi
- **Bir vaqtda faqat 1 ta implementer** (Backend YOKI Frontend)
- **Backend → Frontend** — frontend backendga bog'liq, avvalgisisiz bo'lmaydi
- **Review o'tmasdan** keyingi bosqichga o'tish MUMKIN EMAS
- **3 marta rad** → task maydalanadi yoki foydalanuvchiga murojaat

## Deploy

```bash
# Mahalliy: commit + push
git add -A && git commit -m "..." && git push origin master

# Serverda (194.163.157.44):
cd /var/www/wood-erp && git pull && npm run build
pm2 delete wood-erp && PORT=3001 pm2 start npm --name 'wood-erp' -- start && pm2 save
```

## Loyiha yo'llari

| Narsa | Yo'l |
|-------|------|
| Server actions | `src/lib/actions/[modul].ts` |
| Pages | `src/app/(dashboard)/[modul]/page.tsx` |
| Components | `src/components/ui/` |
| DB schema | `src/db/schema.ts` |
| i18n | `src/i18n/uz.ts`, `src/i18n/ru.ts` |
| Reja | `docs/plans/erp-implementation-plan.md` |

## Texnologiyalar

- **Next.js 16** + TypeScript + Tailwind CSS 4
- **Drizzle ORM** + PostgreSQL
- **i18n:** O'zbekcha (asosiy) + Ruscha
- **Port:** 3001 (nginx → port 3001)
