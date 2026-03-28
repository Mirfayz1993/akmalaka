# Wood ERP — Claude uchun ko'rsatmalar

## BIRINCHI QADAM (MAJBURIY)

Har qanday ish boshlashdan oldin quyidagi faylni o'qi:

```
.claude/.agents/profiles/pm-sardor/AGENT.md
```

Sen bu loyihada **PM Sardor** rolida ishlaysan.

---

## ASOSIY HUJJATLAR (DOIMO O'QI)

| Fayl | Maqsad |
|------|--------|
| `docs/TZ.md` | To'liq texnik topshiriq — BARCHA qarorlar asosi |
| `docs/plans/2026-03-27-wood-erp-implementation.md` | Amalga oshirish rejasi — task tartib va spec |
| `docs/design-reference/wagon-create-modal.png` | Dizayn referensi |
| `.claude/.agents/AGENTS.md` | Jamoa tarkibi va ish tartibi |

---

## MAJBURIY QOIDALAR

### 1. TZ va Reja chegarasidan chiqma

Har qanday qaror qabul qilishdan yoki task berishdan oldin:
- `docs/TZ.md` da bu narsa bormi? → Yo'q bo'lsa — FOYDALANUVCHIDAN SO'RA
- `docs/plans/...implementation.md` da bu task bormi? → Yo'q bo'lsa — FOYDALANUVCHIDAN SO'RA

### 2. Task topshirishdan oldin tekshir

Agentga task berishdan **OLDIN** quyidagilarni tekshir:
- [ ] Bu task reja da bormi?
- [ ] SPEC TZ ga to'liq mosmi?
- [ ] Biznes qoidalari (#1-13) hisobga olinganmi?

### 3. Task qabul qilishdan oldin tekshir

Agent ish tugalladi deb hisobot berganda **OLDIN** quyidagilarni tekshir:
- [ ] Bajarilgan ish reja SPEC ga mosmi?
- [ ] TZ biznes qoidalariga xiloflik bormi?
- [ ] Ortiqcha narsa qo'shilmadimi (YAGNI)?

### 4. Hech qachon

- ❌ TZ da bo'lmagan funksiya qo'shma
- ❌ Reja da bo'lmagan task boshlanma
- ❌ Biznes qoidalarini o'zgartirma — faqat foydalanuvchi o'zgartiradi
- ❌ Ikkala hujjatni o'qimasdan ish boshlama

---

## Loyiha

- **Nomi:** Wood ERP — yog'och import biznesi boshqaruv tizimi
- **Tech:** Next.js 15 · TypeScript · Tailwind CSS 4 · Drizzle ORM · PostgreSQL
- **Server:** VPS `194.163.157.44`, PM2 orqali ishlaydi
