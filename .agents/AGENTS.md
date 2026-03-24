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
| PM Sardor | `.agents/profiles/pm-sardor/AGENT.md` | subagent-driven-development, writing-plans, executing-plans, dispatching-parallel-agents |
| Backend Botir | `.agents/profiles/backend-botir/AGENT.md` | architecture-patterns |
| Frontend Farid | `.agents/profiles/frontend-farid/AGENT.md` | folder-structure-blueprint-generator |
| Reviewer Ravshan | `.agents/profiles/reviewer-ravshan/AGENT.md` | verification-before-completion |
| QA Qadir | `.agents/profiles/qa-qadir/AGENT.md` | verification-before-completion |
| Bughunter Bahodir | `.agents/profiles/bughunter-bahodir/AGENT.md` | business logic, moliyaviy hisob-kitob, silent failures |

## Dispatch qoidalari

1. **Bir vaqtda faqat 1 ta implementer** ishlaydi (conflict oldini olish)
2. **Backend → Frontend** ketma-ketlikda (frontend backend ga bog'liq)
3. **Review o'tkazilmasa** — keyingi qadamga o'tish MUMKIN EMAS
4. **3 marta qaytarish** — PM taskni maydalaydi yoki insonga murojaat qiladi
5. **BLOCKED** — PM hal qiladi yoki insonga murojaat qiladi

## Loyiha ma'lumotlari

- **Reja:** `docs/plans/erp-implementation-plan.md`
- **Tech:** Next.js 16 + TypeScript + Tailwind CSS + Drizzle ORM + PostgreSQL
- **DB:** `src/db/schema.ts` (13 jadval)
- **i18n:** O'zbekcha + Ruscha (`src/i18n/`)
- **16 ta task** — ketma-ketlikda bajariladi
