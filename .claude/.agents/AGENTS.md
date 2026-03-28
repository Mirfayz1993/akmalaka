# Wood ERP — Agent Team

## Jamoa tarkibi

```
┌─────────────────────────────────────────────────────┐
│                PM SARDOR (Opus)                      │
│           Boshqaruvchi / Controller                  │
├──────────┬──────────┬───────────┬────────┬──────────┤
│ Backend  │ Frontend │ Reviewer  │ QA     │ Bughunter│
│ BOTIR    │ FARID    │ RAVSHAN   │ QADIR  │ BAHODIR  │
│ (Sonnet) │ (Sonnet) │ (Haiku)   │(Sonnet)│ (Sonnet) │
└──────────┴──────────┴───────────┴────────┴──────────┘
```

## Ish tartibi (har task uchun)

```
PM Sardor
  │
  ├── 1. Backend Botir → implement → hisobot
  │   └── 2. Reviewer Ravshan → spec check → ✅/❌
  │       └── (❌ bo'lsa → Botir tuzatadi → Ravshan qayta tekshiradi)
  │
  ├── 3. Frontend Farid → implement → hisobot
  │   └── 4. Reviewer Ravshan → spec check → ✅/❌
  │       └── (❌ bo'lsa → Farid tuzatadi → Ravshan qayta tekshiradi)
  │
  ├── 5. QA Qadir → code quality + build verify → ✅/❌
  │   └── (❌ bo'lsa → tegishli agent tuzatadi → Qadir qayta tekshiradi)
  │
  └── 6. Bughunter Bahodir → moliyaviy logic + silent failures → ✅/❌
      └── (❌ bo'lsa → tegishli agent tuzatadi → Bahodir qayta tekshiradi)
          └── ✅ TASK COMPLETE
```

## Agent fayllari

| Agent | Profil | Skills |
|-------|--------|--------|
| PM Sardor | `.claude/.agents/profiles/pm-sardor/AGENT.md` | subagent-driven-development, writing-plans, executing-plans, dispatching-parallel-agents |
| Backend Botir | `.claude/.agents/profiles/backend-botir/AGENT.md` | architecture-patterns |
| Frontend Farid | `.claude/.agents/profiles/frontend-farid/AGENT.md` | folder-structure-blueprint-generator |
| Reviewer Ravshan | `.claude/.agents/profiles/reviewer-ravshan/AGENT.md` | verification-before-completion |
| QA Qadir | `.claude/.agents/profiles/qa-qadir/AGENT.md` | verification-before-completion |
| Bughunter Bahodir | `.claude/.agents/profiles/bughunter-bahodir/AGENT.md` | business logic, moliyaviy hisob-kitob, silent failures |

## Dispatch qoidalari

1. **Bir vaqtda faqat 1 ta implementer** ishlaydi (conflict oldini olish)
2. **Backend → Frontend** ketma-ketlikda (frontend backend ga bog'liq)
3. **Review o'tkazilmasa** — keyingi qadamga o'tish MUMKIN EMAS
4. **3 marta qaytarish** — PM taskni maydalaydi yoki insonga murojaat qiladi
5. **BLOCKED** — PM hal qiladi yoki insonga murojaat qiladi

## Loyiha ma'lumotlari

- **TZ:** `docs/TZ.md` — TO'LIQ texnik topshiriq
- **Dizayn referensi:** `docs/design-reference/wagon-create-modal.png`
- **Tech:** Next.js 15 + TypeScript + Tailwind CSS 4 + Drizzle ORM + PostgreSQL
- **DB:** `src/db/schema.ts` (yangi schema — TZ ga asosan yoziladi)
- **i18n:** O'zbekcha asosiy (`src/i18n/uz.ts`)
- **9 modul** — ketma-ketlikda bajariladi (TZ bo'lim 6)

## Modullar ustuvorligi (TZ bo'lim 6)

| Tartib | Modul | Vazifa |
|--------|-------|--------|
| 1 | Sidebar + Layout | Boshqa hamma narsa shunga bog'liq |
| 2 | Vagonlar | Asosiy biznes jarayoni (vagon + yuk mashinasi) |
| 3 | Kodlar | KZ, UZ, Afg'on — sotib olish, ishlatish, sotish |
| 4 | Hamkorlar | 9 tur + balans tizimi |
| 5 | Kassa | $ va RUB, weighted average kurs |
| 6 | Savdo | Vagonlar + Hamkorlar ko'prigi |
| 7 | Omborxona | Sotilmagan yog'ochlar |
| 8 | Hisobotlar | Barcha modullar tayyor bo'lgandan keyin |
| 9 | Dashboard | Eng oxirida |
