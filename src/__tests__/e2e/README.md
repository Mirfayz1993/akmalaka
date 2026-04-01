# E2E Testlar (Playwright)

## O'rnatish

```bash
npm install -D @playwright/test
npx playwright install chromium
```

## Ishga tushirish

```bash
# Barcha E2E testlarni ishga tushirish
npx playwright test

# Faqat bitta fayl
npx playwright test src/__tests__/e2e/auth.spec.ts

# UI rejimida (ko'rib turish uchun)
npx playwright test --ui

# Debug rejimida
npx playwright test --debug
```

## Test fayllari

- `auth.spec.ts` — Login/logout oqimlari
- `wagons.spec.ts` — Vagon yaratish va boshqarish
- `partners.spec.ts` — Hamkor CRUD
- `cash.spec.ts` — Naqd pul operatsiyalari
