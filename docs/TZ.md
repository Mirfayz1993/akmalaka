# Wood ERP — Texnik Topshiriq (TZ)

**Versiya:** 1.0
**Sana:** 26.03.2026
**Holat:** Tasdiqlangan ✅

---

## 0. DIZAYN REFERENSI

Barcha modal oynalar va formalar uchun dizayn asosi: [`docs/design-reference/wagon-create-modal.png`](design-reference/wagon-create-modal.png)

**Dizayn qoidalari (rasmdan):**
- Modal: oq fon, yumaloq burchaklar, scrollable
- Section sarlavhalar: kichik, qalin (Asosiy ma'lumotlar, Kodlar, Yog'ochlar...)
- Input fieldlar: to'liq kenglik, border, placeholder kulrang
- 2 ustunli layout: keng ekranda juft fieldlar yonma-yon
- Rang sxemasi: ko'k accent (`#3B82F6`), yashil summa, qora matn
- Tugmalar: "Bekor qilish" (kulrang outline) + "Yaratish" (ko'k, to'ldirilgan), o'ng pastda


## 1. LOYIHA MAQSADI

Yog'och import biznesi uchun to'liq boshqaruv tizimi. Asosiy vazifalar:
- Rossiyadan kelayotgan vagonlarni va yog'ochlarni kuzatish
- Hamkorlar bilan hisob-kitobni avtomatlashtirish
- Kassa oqimini ($ va RUB) nazorat qilish
- Har bir vagon bo'yicha foyda/zarar hisoblash

**Foydalanuvchi:** 1 kishi (biznes egasi)
**Til:** O'zbek
**Texnologiya:** Next.js · TypeScript · Tailwind CSS · Drizzle ORM · PostgreSQL

---

## 2. MODULLAR

### 2.1 VAGONLAR

#### Maqsad
Rossiyadan kelayotgan yog'och vagonlarini boshidan oxirigacha kuzatish.

#### Transport turlari

Vagonlar sahifasida ikki xil transport yaratish mumkin:

```
[+ Vagon yaratish]   [+ Yuk mashinasi yaratish]
```

**Farqi faqat bitta:**

| Xususiyat | Vagon | Yuk mashinasi |
|-----------|-------|---------------|
| Kod UZ | ✅ | ❌ |
| Kod KZ | ✅ | ❌ |
| Yuk mashinasi egasiga to'lov | ❌ | ✅ |
| Yog'ochlar (Rossiya/Toshkent/Mijoz soni) | ✅ | ✅ |
| Standart xarajatlar | ✅ | ✅ |
| Yopish jarayoni | ✅ | ✅ |
| Savdo, Ombor, Hisobot | ✅ | ✅ |

#### Vagon ma'lumotlari
| Maydon | Tur | Izoh |
|--------|-----|------|
| Vagon raqami | string (8 raqam) | Majburiy |
| Jo'natilgan sana | date | |
| Yetib kelgan sana | date | |
| Qayerdan | string | Masalan: Krasnoyarsk |
| Qayerga | string | Masalan: Toshkent |
| Tonnaj | decimal | tonna, xarajat hisoblash uchun |
| Status | enum | Yo'lda / Chegarada / Yetib keldi / Tushirildi |
| Hamkor | Rossiya ta'minotchisi | |
| Izoh | text | |

#### Yuk mashinasi ma'lumotlari
Vagon bilan bir xil, faqat:
- Kod UZ va Kod KZ o'rniga → **Yuk mashinasi egasi** (hamkordan tanlanadi) + **to'lov summasi ($)**
- Tonnaj maydoni ixtiyoriy (kodlar bo'lmagani uchun hisoblash shart emas)

#### Vagon hayot sikli
```
1. YARATISH     → Vagon raqami, jo'natilgan sana, hamkor kiritiladi
2. YOG'OCH      → Har bir turdagi yog'och: o'lcham + Rossiya soni
3. XARAJATLAR  → Kodlar, yog'och narxi (RUB), standart xarajatlar ($)
4. YETIB KELDI → Toshkent soni kiritiladi (har bir yog'och turi uchun)
5. SAVDO        → Mijozlarga jo'natiladi → Mijoz soni yig'iladi
6. YOPILDI      → Barcha hisob-kitoblar tugallangan
```

#### Yog'och jadvali (Timber)

Har bir vagon uchun bir nechta yog'och turi bo'lishi mumkin.

| Maydon | Izoh |
|--------|------|
| Qalinligi (mm) | |
| Eni (mm) | |
| Uzunligi (m) | |
| Rossiya soni (dona) | Vagon yaratilganda kiritiladi |
| Toshkent soni (dona) | Yetib kelgandan keyin kiritiladi |
| Mijoz soni (dona) | Savdolardan yig'iladi |

**Muhim qoidalar:**
- Toshkent bosqichida Rossiyada bo'lmagan yangi o'lchamlar qo'shilishi mumkin (Rossiya soni = 0)
- Mijoz bosqichida ham yangi o'lchamlar paydo bo'lishi mumkin
- Rossiya ta'minotchisi bilan hisob-kitob → **Toshkent soni** bo'yicha

**Jadval osti yig'indilari:**
```
Umumiy kub (Rossiya)  = Σ (qalinlik/1000 × en/1000 × uzunlik × rossiya_soni)
Umumiy kub (Toshkent) = Σ (qalinlik/1000 × en/1000 × uzunlik × toshkent_soni)
Umumiy kub (Mijoz)    = Σ (qalinlik/1000 × en/1000 × uzunlik × mijoz_soni)
```

#### Vagon xarajatlari

**A) Kodlar:**
| Kod turi | Hisoblash | Ta'minotchi |
|----------|-----------|-------------|
| Kod UZ | Vagon tonnaji (t) × $/t = jami $ | Alohida tanlanadi |
| Kod KZ | Vagon tonnaji (t) × $/t = jami $ | Alohida tanlanadi |

Yog'och kubiga hech qanday aloqasi yo'q — faqat **vagon umumiy og'irligi** ishlatiladi.

**B) Yog'och xaridi (RUB):**
- 1 kub narxi (RUB/m³) kiritiladi
- Jami RUB = Umumiy kub (Toshkent) × narx
- Kassa o'rtacha kursi bilan avtomatik $ ga aylantiriladi
- Bu $ miqdori vagon xarajatlarida aks etadi

**C) Standart xarajatlar ($):**

Har bir xarajat dollarda kiritiladi va bog'liq xizmat hamkasbi balansida **bizning qarzimiz** sifatida aks etadi.

| Xarajat turi | Hamkor |
|-------------|--------|
| NDS | Xizmat hamkasbi (tanlanadi) |
| Usluga | Xizmat hamkasbi (tanlanadi) |
| Tupik | Xizmat hamkasbi (tanlanadi) |
| Xrannei | Xizmat hamkasbi (tanlanadi) |
| Klentga ortish | Xizmat hamkasbi (tanlanadi) |
| Yerga tushurish | Xizmat hamkasbi (tanlanadi) |
| Qo'shimcha xarajat | nom + summa + hamkor (tanlanadi) |

**Qoida:** Xarajat kiritilganda → hamkor balansida qarz paydo bo'ladi. To'lov amalga oshirilganda → kassa dan chiqadi, hamkor balansi kamayadi.

#### Vagon yopish jarayoni

Vagon **qo'lda** yopiladi. Yopish tugmasi bosilganda:

```
QADAM 1 — Rossiya ta'minotchisiga to'lov:
  Toshkent soni bo'yicha jami kub × RUB/m³ = jami RUB
  → RUB kassasidan avtomatik ayiriladi
  → RUB kassasi tarixida ko'rinadi
  → Rossiya ta'minotchisi balansida qarz yopiladi

QADAM 2 — Ombor tekshiruvi:
  Sotilmagan yog'ochlar bormi?
  → Ha → "Omborga tushurasizmi?" dialog

QADAM 3 — Vagon yopiladi
  Status: Yopildi + sana yoziladi
```

#### Foyda/Zarar hisobi
```
Daromad  = Bu vagondan barcha mijozlarga sotilgan summalar yig'indisi
           (ombordan sotilganlar ham shu vagonning daromadiga qo'shiladi)
Xarajat  = Kodlar + Yog'och xaridi ($) + Standart xarajatlar + Qo'shimcha xarajatlar
Foyda    = Daromad − Xarajat
```

#### Vagon tarixi (Log)
Har bir o'zgarish avtomatik yoziladi:
```
26.03.2026 10:15 — Vagon yaratildi
28.03.2026 14:30 — Toshkent soni kiritildi: 50×100×6m → 95 dona
01.04.2026 09:00 — Mijozga jo'natildi: 20 dona (Hamidov Jamshid)
```

---

### 2.2 KODLAR

#### Maqsad
Bojxona o'tkazish kodlarini sotib olish, omborda saqlash va sotish yoki o'z vagonlarida ishlatishni boshqarish. Kod sotish operatsiyasi **Kodlar sahifasidagi ombor ro'yxatidan** amalga oshiriladi.

#### 3 xil kod turi
| Tur | Hisoblash | Izoh |
|-----|-----------|------|
| Kod KZ | Mijoz vagon tonnaji × $/t | Qozog'iston tranziti |
| Kod UZ | Mijoz vagon tonnaji × $/t | O'zbekiston tranziti |
| Tarif Afg'on | Fixed $ | Afg'oniston tarifi, tonnajga bog'liq emas |

#### Sotib olish
- Ta'minotchidan faqat **tur + soni** kiritiladi (narx kiritilmaydi)
- Sotib olingan kodlar omborga kiradi
- Ta'minotchi balansi **o'zgarmaydi** (narx hali noma'lum)
- Har bir kod **alohida birlik** sifatida kuzatiladi

```
Misol: Sarvar LLC dan sotib olindi
  ID  │ Tur    │ Ta'minotchi │ Holat
  ────┼────────┼─────────────┼────────
  #1  │ Kod KZ │ Sarvar LLC  │ Mavjud
  #2  │ Kod UZ │ Sarvar LLC  │ Mavjud
  #3  │ Afg'on │ Sarvar LLC  │ Mavjud
  ...
```

#### Mijozga sotish jarayoni

1 ta sotishda har turdan 1 ta kod birga sotiladi (KZ + UZ + Afg'on).

```
QADAM 1 — Ombordan tanlash:
  Mijoz vagon tonnaji: 65t
  Ombordan: 1×KZ (Sarvar #1) + 1×UZ (Sarvar #2) + 1×Afg'on (Sarvar #3)
  → Omborda qoldi: 9×KZ, 9×UZ, 9×Afg'on

QADAM 2 — Sotib olish narxi kiritiladi (ta'minotchidan so'raladi):
  KZ:     40$/t × 65t = 2,600$  → Sarvar LLC ga qarzimiz paydo bo'ladi
  UZ:     20$/t × 65t = 1,300$  → Sarvar LLC ga qarzimiz paydo bo'ladi
  Afg'on: 500$ (fixed)          → Sarvar LLC ga qarzimiz paydo bo'ladi
  ──────────────────────────────
  Jami xarajat: 4,400$

QADAM 3 — Sotish narxi kiritiladi (bizning narximiz):
  KZ:     41$/t × 65t = 2,665$  → Mijoz bizga qarz bo'ladi
  UZ:     21$/t × 65t = 1,365$  → Mijoz bizga qarz bo'ladi
  Afg'on: 512$ (fixed)          → Mijoz bizga qarz bo'ladi
  ──────────────────────────────
  Jami daromad: 4,542$

FOYDA = 4,542$ − 4,400$ = 142$
```

#### O'z vagonida ishlatish

Vagon yaratilganda har bir kod turi uchun **alohida ta'minotchi tanlanadi** va narx kiritiladi:

```
Vagon yaratish formasi:
  Kod UZ → Ta'minotchi: [Sarvar LLC ▼]  → 20 $/t
  Kod KZ → Ta'minotchi: [Jabborov   ▼]  → 40 $/t
  Tonnaj: 65t

Avtomatik bajariladi:
  1. Ombordan 1×KZ (Jabborov) + 1×UZ (Sarvar) kamayadi
  2. Sarvar LLC balansida:   bizning qarzimiz +1,300$ (65×20)
  3. Jabborov balansida:     bizning qarzimiz +2,600$ (65×40)
  4. Vagon xarajatiga qo'shiladi: 3,900$
  5. Kodlar tarixida avtomatik yoziladi
```

**Qoida:** Har bir kodning qarzi aynan o'sha kodning ta'minotchisi balansida aks etadi. Foyda = 0.

#### Kodlar sahifasi ko'rinishi

**Yuqori qism — Mavjud kodlar ombori:**
```
Tur    │ Soni │ Ta'minotchi
───────┼──────┼─────────────
Kod KZ │  9   │ Sarvar LLC
Kod UZ │  9   │ Sarvar LLC
Afg'on │  9   │ Sarvar LLC
```

**Pastki qism — Operatsiyalar tarixi (barcha operatsiyalar avtomatik yoziladi):**
```
Sana  │ Tur    │ Amal         │ Ta'minotchi │ Vagon/Mijoz  │ Xarajat │ Daromad
──────┼────────┼──────────────┼─────────────┼──────────────┼─────────┼────────
20.03 │ Kod UZ │ Sotib olindi │ Sarvar LLC  │ —            │ —       │ —
22.03 │ Kod UZ │ Vagondan     │ Sarvar LLC  │ #58374291    │ 1,300$  │ 1,300$
22.03 │ Kod KZ │ Vagondan     │ Jabborov    │ #58374291    │ 2,600$  │ 2,600$
25.03 │ Kod KZ │ Mijozga      │ Jabborov    │ Hamidov J.   │ 2,600$  │ 2,665$
25.03 │ Kod UZ │ Mijozga      │ Sarvar LLC  │ Hamidov J.   │ 1,300$  │ 1,365$
25.03 │ Afg'on │ Mijozga      │ Sarvar LLC  │ Hamidov J.   │   500$  │   512$
```

---

### 2.3 HAMKORLAR

#### Maqsad
Barcha hamkorlar bilan ikki tomonlama hisob-kitobni kuzatish. Har bir hamkorning shaxsiy balansi bo'ladi.

#### Hamkor turlari

| # | Tur | Biz ularga | Ular bizga | Balans |
|---|-----|-----------|-----------|--------|
| 1 | Rossiya ta'minotchisi | ✅ RUB (yog'och) | — | Biz qarz |
| 2 | Kod ta'minotchisi | ✅ $ (kodlar) | — | Biz qarz |
| 3 | Kod mijozi | — | ✅ $ (kod sotuvi) | Ular qarz |
| 4 | Yog'och mijozi | — | ✅ $ (yog'och sotuvi) | Ular qarz |
| 5 | Xizmat hamkasbi | ✅ $ (xizmat) | — | Biz qarz |
| 6 | Yuk mashinasi egasi | ✅ $ (transport) | — | Biz qarz |
| 7 | Shaxsiy (tanishlar) | ✅/❌ | ✅/❌ | Ikki tomonlama |
| 8 | Pul ayrboshlovchi | ✅ $ | ✅ RUB | Ikki tomonlama |
| 9 | Sherik | ✅/❌ | ✅/❌ | Ikki tomonlama |
| + | Yangi tur qo'shish | — | — | — |

**Har bir hamkorning majburiy maydoni:** Telefon raqami

#### Hamkor balansi (Double-entry misol)
```
Pul ayrboshlovchi RUB qarz berdi (10,000$ ekvivalent):
  → RUB kassa:         +850,000 RUB
  → Hamkor balansi:    BIZ QARZ +10,000$

Biz $ to'ladik:
  → $ kassa:           -10,000$
  → Hamkor balansi:    0
```

#### Hamkorlar bo'limining ichki bo'limlari (Sidebar)
Hamkorlar bo'limi quyidagi bo'limlarga bo'linadi:
- Rossiya ta'minotchilari
- Kod ta'minotchilari
- Kod mijozlari
- Yog'och mijozlari
- Xizmat hamkasblari
- **Shaxsiy** — biznes egasining shaxsiy tanishlari
- Pul ayrboshlovchilar
- Sheriklar
- *(Yangi tur qo'shish imkoni)*

#### "Shaxsiy" bo'limi
Biznes egasining shaxsiy tanishlari. Har bir tanishning:
- O'z balansi bo'ladi (biz ularga qarz / ular bizga qarz)
- Oldi-berdi operatsiyalari kassada aks etadi
- Qarz berish: kassa → chiqim + tanish balansida bizga qarz
- Qarz olish: kassa → kirim + tanish balansida bizning qarzimiz

#### Har bir hamkor sahifasida ko'rinishi
- Hamkor ma'lumotlari
- Barcha operatsiyalar tarixi (sana, tur, summa)
- Joriy balans (biz qarz / ular qarz)
- To'lov qilish tugmasi

---

### 2.4 KASSA

#### Maqsad
Barcha pul oqimlarini kuzatish. Barcha pul operatsiyalari shu yerda amalga oshiriladi.

#### Kassa bo'limlari (3 ta)

Kassa sahifasi 3 bo'limdan iborat:

---

**1. $ Kassasi (asosiy)**

Barcha dollar operatsiyalari ro'yxat ko'rinishida chiqadi:

| Sana | Tur | Hamkor | Kirim | Chiqim | Balans |
|------|-----|--------|-------|--------|--------|
| 26.03 | Savdo tushuми | Hamidov J. | +5,000$ | — | 15,000$ |
| 27.03 | Hamkorga to'lov | NDS xizmati | — | -500$ | 14,500$ |
| 28.03 | Pul ayrboshlash | — | — | -1,000$ | 13,500$ |

Kirim turlari: savdo tushuми, kod sotuvi, hamkordan qabul, boshqa
Chiqim turlari: hamkorga to'lov, xarajat, pul ayrboshlash

---

**2. RUB Kassasi (yordamchi)**

Barcha rubl operatsiyalari alohida ro'yxatda:

| Sana | Tur | Hamkor | Kirim (RUB) | Chiqim (RUB) | Kurs | Balans |
|------|-----|--------|-------------|--------------|------|--------|
| 26.03 | Ayrboshlash | Tanish Ali | +900,000 | — | 90 | 900,000 |
| 27.03 | Ta'minotchiga | Petrov LLC | — | -850,000 | 85* | 50,000 |

*O'rtacha kurs avtomatik hisoblanadi

Kirim: pul ayrboshlash, qarz sifatida olingan RUB
Chiqim: Rossiya ta'minotchisiga to'lov

**Weighted Average Kurs:**
```
Balans:    800,000 RUB @ 80 RUB/$  →  10,000$
Qo'shildi: 900,000 RUB @ 90 RUB/$  →  10,000$
──────────────────────────────────────────────
Yangi:    1,700,000 RUB @ 85 RUB/$  →  20,000$
```

Ta'minotchiga to'lov vagon xarajatida:
```
To'landi: 850,000 RUB ÷ 85 (o'rtacha kurs) = 10,000$
```

---

**3. Pul Ayrboshlash**

Barcha ayrboshlash operatsiyalari alohida tarixda ko'rinadi:

| Sana | Hamkor | Berildi | Olindi | Kurs |
|------|--------|---------|--------|------|
| 26.03 | Tanish Ali | 10,000$ | 900,000 RUB | 90 |
| 15.03 | Tanish Vali | 5,000$ | 400,000 RUB | 80 |

Har bir ayrboshlash operatsiyasi:
- $ kassasidan chiqadi
- RUB kassasiga kiradi
- Pul ayrboshlash tarixida ko'rinadi
- Hamkor (pul ayrboshlovchi) balansida aks etadi

---

### 2.5 SAVDO

#### Maqsad
Yog'och mijozlariga yog'och jo'natishni va qabul qilishni kuzatish.

#### Jo'natish bosqichi
- Mijozni tanlash
- Bir nechta vagondan **va/yoki ombordan** bir nechta o'lchamdagi yog'ochlarni tanlash
- Har biri uchun jo'natilgan son kiritish
- Narx: $/m³ (kub metr)
- To'lov: naqd / qarz / aralash

#### Qabul bosqichi (mijozda)
- Jo'natilgan ro'yxatdan har bir pozitsiya uchun qabul qilingan son kiritiladi
- Yangi o'lchamlar qo'shilishi mumkin (mijozda paydo bo'lgan)
- Qabul qilingan son → vagon "Mijoz soni" ga yig'iladi
- **Kassaga to'lov:** Faqat mijoz qabul qilgandan keyin kassaga kiradi (naqd → $ kassasiga, qarz → mijoz balansiga)

#### Misol
```
Jo'natildi:              Qabul qilindi:
50×100×6m → 20 dona      18 dona  (2 ta yetib kelmadi)
40×100×4m → 10 dona      10 dona  (to'g'ri)
                          50×150×6m → 5 dona (yangi o'lcham)
```

---

### 2.6 OMBORXONA

#### Maqsad
Vagonlardan tushirilgan lekin hali sotilmagan yog'ochlarni kuzatish.

#### Omborga kirish
Vagon yopilganda tizim so'raydi:
```
⚠️ Vagon #58374291 yopilmoqda
Bu vagondan 15 dona 50×100×6m hali sotilmagan.
Qolgan yog'ochlarni omborga tushurasizmi?
  [Ha, omborga tushur]  [Yo'q, shunday yop]
```

#### Ombor ko'rinishi
| O'lcham | Soni | Qaysi vagondan | Kirgan sana |
|---------|------|----------------|-------------|
| 50×100×6m | 15 | #58374291 | 26.03.2026 |
| 40×80×4m  |  8 | #58374120 | 20.03.2026 |

#### Ombordan savdo
- Savdo bo'limida manbani tanlash mumkin: **Vagon** yoki **Ombor**
- Ombordagi yog'och sotilganda → **qaysi vagondan kelgani** saqlanadi
- Tushum → o'sha vagonning daromadiga qo'shiladi

#### Vagon foyda/zarar eslatmasi
Agar vagon yopilayotganda omborda shu vagondan yog'och qolsa:
```
⚠️ Diqqat: Bu vagondan 15 dona 50×100×6m omborda turibdi.
   Ular sotilgandan keyin vagonning to'liq foydasi aniqlanadi.
```

---

### 2.7 HISOBOTLAR

| Hisobot | Tarkib | Export |
|---------|--------|--------|
| Vagon hisobi | Daromad, xarajat, foyda/zarar | ✅ Excel/PDF |
| Kod sotuvi hisobi | Sotib olish, sotish, foyda/zarar | ✅ Excel/PDF |
| Hamkor hisobi | Qarzdorlik holati, operatsiyalar tarixi | ✅ Excel/PDF |
| Kassa hisobi | $ va RUB balans, kirim/chiqim | ✅ Excel/PDF |
| Umumiy hisobot | Oylik/yillik foyda/zarar | ✅ Excel/PDF |

Barcha hisobotlarda **sana oralig'i** filtri mavjud.

---

### 2.8 DASHBOARD (Bosh sahifa)

- $ va RUB kassa balansi
- Aktiv vagonlar soni va holati
- Jami qarzdorlik (kimlar bizga qarz / biz kimlarga qarz)
- Shu oydagi savdolar (jami summa)
- So'nggi operatsiyalar

---

## 3. BIZNES QOIDALARI

1. **Kod to'lovi:** Vagon tonnaji (tonna) × $/t = Jami $ (avtomatik hisob. Yog'och kubiga aloqasi yo'q.)
2. **Rossiya ta'minotchi to'lovi:** Toshkent soni bo'yicha hisoblanadi (Rossiya soni emas)
3. **RUB → $ konvertatsiya:** Kassaning joriy o'rtacha kursi ishlatiladi
4. **Kod o'z vagonida:** Sotib olish narxi = Sotish narxi (foyda/zarar = 0)
5. **Mijoz soni:** Jo'natilgan sondan farq qilishi mumkin (kam yoki ko'p)
6. **Yangi o'lchamlar:** Toshkent va Mijoz bosqichida yangi yog'och o'lchamlari qo'shilishi mumkin
7. **Qarz operatsiyasi:** Kassaga ta'sir qilmaydi, faqat hamkor balansini o'zgartiradi
8. **Vagon xarajatlari sanasi:** Vagon **yopilgan sana** bo'yicha hisobotga kiritiladi
9. **Vagon yopilishi + ombor:** Vagon "Yopildi" statusida qoladi. Ombordagi yog'och sotilganda vagonning foydasi avtomatik yangilanadi.
10. **RUB kassa yetarli bo'lmasa:** Vagon yopilmaydi. Manfiy qoldiqqa ruxsat berilmaydi.
11. **Hujjat raqami:** Har bir savdo va to'lovga avtomatik 4 xonali raqam beriladi (0001 dan 9999 gacha).
12. **Izoh maydoni:** Barcha operatsiyalarda ixtiyoriy izoh maydoni mavjud.
13. **Qidiruv va filter:** Barcha jadvallarda sana oralig'i, hamkor va status bo'yicha filter mavjud.

---

## 3.1 FOYDA/ZARAR HISOBLASH

### Vagon bo'yicha
```
DAROMAD:
  + Barcha mijozlarga sotilgan yog'och ($)

XARAJAT:
  − Yog'och xaridi: Umumiy kub (Toshkent) × RUB/m³ ÷ o'rtacha kurs = $
  − Kod UZ: Vagon tonnaji × $/t
  − Kod KZ: Vagon tonnaji × $/t
  − Standart xarajatlar: NDS + Usluga + Tupik + Xrannei + Klentga ortish + Yerga tushurish
  − Qo'shimcha xarajatlar

FOYDA = DAROMAD − XARAJAT
```

### Kod sotuvi bo'yicha
```
Har bir kod (KZ / UZ / Afg'on) uchun:
  DAROMAD  = Mijozga sotilgan summa ($)
  XARAJAT  = Ta'minotchidan sotib olingan summa ($)
  FOYDA    = DAROMAD − XARAJAT

O'z vagonida ishlatilsa:
  DAROMAD  = Sotib olish narxi
  XARAJAT  = Sotib olish narxi
  FOYDA    = 0
```

### Umumiy hisobot (istalgan sana oralig'i)
```
DAROMAD:
  + Tanlangan oraliqda yopilgan vagonlardan yog'och savdolari
  + Tanlangan oraliqda amalga oshirilgan kod savdolari

XARAJAT:
  + Tanlangan oraliqda yopilgan vagonlarning barcha xarajatlari

FOYDA = DAROMAD − XARAJAT
```

### Sana filtrlari
| Hisobot | Filtr asosi |
|---------|-------------|
| Vagon foyda/zarar | Vagon **yopilgan sana** |
| Savdo hisobi | Savdo **amalga oshirilgan sana** |
| Kod sotuvi | Sotilgan **sana** |
| Umumiy | **Dan — gacha** (erkin tanlash) |

---

## 4. TEXNIK TALABLAR

- **Framework:** Next.js 15 App Router
- **Til:** TypeScript
- **Stil:** Tailwind CSS 4
- **DB:** Drizzle ORM + PostgreSQL
- **API:** Server Actions (alohida API yo'q)
- **Dizayn:** Desktop asosiy, responsive

---

## 5. FAYL STRUKTURASI

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── layout.tsx              ← Sidebar + main wrapper
│   │   ├── page.tsx                ← Dashboard
│   │   ├── wagons/
│   │   │   ├── _components/
│   │   │   │   ├── WagonModal.tsx  ← Vagon qo'shish/tahrirlash
│   │   │   │   ├── WagonTable.tsx  ← Vagonlar ro'yxati
│   │   │   │   ├── TimberTable.tsx ← Yog'ochlar jadvali
│   │   │   │   └── WagonLog.tsx    ← Vagon tarixi
│   │   │   └── page.tsx
│   │   ├── codes/
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── partners/
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── cash/
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   ├── sales/
│   │   │   ├── _components/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       ├── _components/
│   │       └── page.tsx
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── layout/
│   │   └── Sidebar.tsx
│   └── ui/
│       ├── Modal.tsx           ← Barcha modallarga umumiy wrapper
│       ├── ConfirmDialog.tsx
│       └── Field.tsx           ← Form field wrapper
├── db/
│   ├── index.ts
│   └── schema.ts
├── lib/
│   └── actions/                ← Server actions (modullar bo'yicha)
└── i18n/
    ├── uz.ts
    └── ru.ts
```

---

## 6. MODULLAR USTUVORLIGI

| Tartib | Modul | Sabab |
|--------|-------|-------|
| 1 | Sidebar + Layout | Boshqa hamma narsa shunga bog'liq |
| 2 | Vagonlar | Asosiy biznes jarayoni |
| 3 | Kodlar | Vagonlar bilan chambarchas bog'liq |
| 4 | Hamkorlar | Hisob-kitob asosi |
| 5 | Kassa | Hamkorlar bilan bog'liq |
| 6 | Savdo | Vagonlar + Hamkorlar o'rtasida ko'prik |
| 7 | Omborxona | Savdodan keyin |
| 8 | Hisobotlar | Barcha modullar tayyor bo'lganidan keyin |
| 9 | Dashboard | Eng oxirida |
