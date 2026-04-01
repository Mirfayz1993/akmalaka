import { describe, it, expect } from "vitest";
import {
  positiveNumber,
  nonNegativeNumber,
  optionalPositiveNumber,
  requiredString,
  optionalString,
} from "@/lib/validators/common";
import {
  TimberInputSchema,
  CreateTransportSchema,
  AddExpenseSchema,
} from "@/lib/validators/wagons.schema";
import {
  RecordUsdOperationSchema,
  RecordRubOperationSchema,
  RecordExchangeSchema,
} from "@/lib/validators/cash.schema";
import {
  SaleItemSchema,
  CreateSaleSchema,
} from "@/lib/validators/sales.schema";
import {
  CreatePartnerSchema,
  CreatePaymentSchema,
} from "@/lib/validators/partners.schema";

// ─── common.ts validators ─────────────────────────────────────────────────────

describe("positiveNumber validator", () => {
  it("musbat sonni qabul qiladi", () => {
    expect(positiveNumber.safeParse(5).success).toBe(true);
    expect(positiveNumber.safeParse(0.01).success).toBe(true);
  });

  it("string ni number ga aylantiradi (coerce)", () => {
    const result = positiveNumber.safeParse("42");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBe(42);
  });

  it("nol va manfiy sonni rad etadi", () => {
    expect(positiveNumber.safeParse(0).success).toBe(false);
    expect(positiveNumber.safeParse(-1).success).toBe(false);
  });

  it("bo'sh string ni rad etadi", () => {
    expect(positiveNumber.safeParse("").success).toBe(false);
  });
});

describe("nonNegativeNumber validator", () => {
  it("nolni qabul qiladi", () => {
    expect(nonNegativeNumber.safeParse(0).success).toBe(true);
  });

  it("musbat sonni qabul qiladi", () => {
    expect(nonNegativeNumber.safeParse(10).success).toBe(true);
  });

  it("manfiy sonni rad etadi", () => {
    expect(nonNegativeNumber.safeParse(-0.1).success).toBe(false);
  });
});

describe("optionalPositiveNumber validator", () => {
  it("musbat sonni qabul qiladi", () => {
    expect(optionalPositiveNumber.safeParse(5).success).toBe(true);
  });

  it("undefined ni qabul qiladi", () => {
    expect(optionalPositiveNumber.safeParse(undefined).success).toBe(true);
  });

  it("bo'sh string ni undefined ga aylantiradi", () => {
    const result = optionalPositiveNumber.safeParse("");
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toBeUndefined();
  });

  it("manfiy sonni rad etadi", () => {
    expect(optionalPositiveNumber.safeParse(-5).success).toBe(false);
  });
});

describe("requiredString validator", () => {
  it("to'ldirilgan stringni qabul qiladi", () => {
    expect(requiredString.safeParse("Abdullayev").success).toBe(true);
  });

  it("bo'sh stringni rad etadi", () => {
    expect(requiredString.safeParse("").success).toBe(false);
  });
});

describe("optionalString validator", () => {
  it("istalgan stringni qabul qiladi", () => {
    expect(optionalString.safeParse("izoh").success).toBe(true);
  });

  it("undefined ni qabul qiladi", () => {
    expect(optionalString.safeParse(undefined).success).toBe(true);
  });

  it("bo'sh stringni qabul qiladi", () => {
    expect(optionalString.safeParse("").success).toBe(true);
  });
});

// ─── wagons.schema.ts ─────────────────────────────────────────────────────────

describe("TimberInputSchema", () => {
  const validTimber = {
    thicknessMm: 25,
    widthMm: 150,
    lengthM: 6,
    russiaCount: 100,
  };

  it("to'g'ri ma'lumotlarni qabul qiladi", () => {
    expect(TimberInputSchema.safeParse(validTimber).success).toBe(true);
  });

  it("thicknessMm yo'q bo'lsa xato beradi", () => {
    const { thicknessMm: _, ...rest } = validTimber;
    expect(TimberInputSchema.safeParse(rest).success).toBe(false);
  });

  it("russiaCount kasr son bo'lsa xato beradi", () => {
    expect(
      TimberInputSchema.safeParse({ ...validTimber, russiaCount: 10.5 }).success
    ).toBe(false);
  });

  it("russiaCount manfiy bo'lsa xato beradi", () => {
    expect(
      TimberInputSchema.safeParse({ ...validTimber, russiaCount: -5 }).success
    ).toBe(false);
  });

  it("string qiymatlarni raqamga aylantiradi", () => {
    const result = TimberInputSchema.safeParse({
      thicknessMm: "25",
      widthMm: "150",
      lengthM: "6",
      russiaCount: "100",
    });
    expect(result.success).toBe(true);
  });
});

describe("CreateTransportSchema", () => {
  it("wagon turini qabul qiladi", () => {
    expect(
      CreateTransportSchema.safeParse({ type: "wagon" }).success
    ).toBe(true);
  });

  it("truck turini qabul qiladi", () => {
    expect(
      CreateTransportSchema.safeParse({ type: "truck" }).success
    ).toBe(true);
  });

  it("noto'g'ri turni rad etadi", () => {
    expect(
      CreateTransportSchema.safeParse({ type: "ship" }).success
    ).toBe(false);
  });

  it("type yo'q bo'lsa xato beradi", () => {
    expect(CreateTransportSchema.safeParse({}).success).toBe(false);
  });

  it("timbers massivi bilan qabul qiladi", () => {
    const data = {
      type: "wagon",
      timbers: [
        { thicknessMm: 25, widthMm: 150, lengthM: 6, russiaCount: 100 },
      ],
    };
    expect(CreateTransportSchema.safeParse(data).success).toBe(true);
  });
});

describe("AddExpenseSchema", () => {
  it("to'g'ri xarajatni qabul qiladi", () => {
    expect(
      AddExpenseSchema.safeParse({ name: "Yuk tashish", amount: 500 }).success
    ).toBe(true);
  });

  it("name bo'sh bo'lsa xato beradi", () => {
    expect(
      AddExpenseSchema.safeParse({ name: "", amount: 500 }).success
    ).toBe(false);
  });

  it("amount manfiy bo'lsa xato beradi", () => {
    expect(
      AddExpenseSchema.safeParse({ name: "Yuk", amount: -100 }).success
    ).toBe(false);
  });

  it("ixtiyoriy partnerId bilan ishlaydi", () => {
    expect(
      AddExpenseSchema.safeParse({ name: "Yuk", amount: 500, partnerId: 1 }).success
    ).toBe(true);
  });
});

// ─── cash.schema.ts ───────────────────────────────────────────────────────────

describe("RecordUsdOperationSchema", () => {
  it("income turini qabul qiladi", () => {
    expect(
      RecordUsdOperationSchema.safeParse({ type: "income", amount: 1000 }).success
    ).toBe(true);
  });

  it("to'g'ri barcha turlarni qabul qiladi", () => {
    const types = ["income", "expense", "debt_give", "debt_take"];
    types.forEach((type) => {
      expect(
        RecordUsdOperationSchema.safeParse({ type, amount: 100 }).success
      ).toBe(true);
    });
  });

  it("noto'g'ri turni rad etadi", () => {
    expect(
      RecordUsdOperationSchema.safeParse({ type: "exchange", amount: 100 }).success
    ).toBe(false);
  });

  it("amount nol bo'lsa xato beradi", () => {
    expect(
      RecordUsdOperationSchema.safeParse({ type: "income", amount: 0 }).success
    ).toBe(false);
  });
});

describe("RecordRubOperationSchema", () => {
  it("income va expense ni qabul qiladi", () => {
    expect(
      RecordRubOperationSchema.safeParse({ type: "income", amount: 50000 }).success
    ).toBe(true);
    expect(
      RecordRubOperationSchema.safeParse({ type: "expense", amount: 50000 }).success
    ).toBe(true);
  });

  it("debt_give ni rad etadi (faqat USD uchun)", () => {
    expect(
      RecordRubOperationSchema.safeParse({ type: "debt_give", amount: 50000 }).success
    ).toBe(false);
  });

  it("exchangeRate bilan ishlaydi", () => {
    expect(
      RecordRubOperationSchema.safeParse({
        type: "income",
        amount: 50000,
        exchangeRate: 12500,
      }).success
    ).toBe(true);
  });

  it("exchangeRate manfiy bo'lsa xato beradi", () => {
    expect(
      RecordRubOperationSchema.safeParse({
        type: "income",
        amount: 50000,
        exchangeRate: -100,
      }).success
    ).toBe(false);
  });
});

describe("RecordExchangeSchema", () => {
  const validExchange = {
    usdAmount: 1000,
    rubAmount: 12500000,
    exchangeRate: 12500,
  };

  it("to'g'ri almashtirish ma'lumotini qabul qiladi", () => {
    expect(RecordExchangeSchema.safeParse(validExchange).success).toBe(true);
  });

  it("usdAmount nol bo'lsa xato beradi", () => {
    expect(
      RecordExchangeSchema.safeParse({ ...validExchange, usdAmount: 0 }).success
    ).toBe(false);
  });

  it("rubAmount manfiy bo'lsa xato beradi", () => {
    expect(
      RecordExchangeSchema.safeParse({ ...validExchange, rubAmount: -1 }).success
    ).toBe(false);
  });

  it("ixtiyoriy description bilan ishlaydi", () => {
    expect(
      RecordExchangeSchema.safeParse({ ...validExchange, description: "Kun almashtirish" }).success
    ).toBe(true);
  });
});

// ─── sales.schema.ts ──────────────────────────────────────────────────────────

describe("SaleItemSchema", () => {
  const validItem = {
    warehouseId: 1,
    count: 50,
    pricePerCubicUsd: 200,
  };

  it("to'g'ri savdo qatorini qabul qiladi", () => {
    expect(SaleItemSchema.safeParse(validItem).success).toBe(true);
  });

  it("count kasr son bo'lsa xato beradi", () => {
    expect(
      SaleItemSchema.safeParse({ ...validItem, count: 5.5 }).success
    ).toBe(false);
  });

  it("pricePerCubicUsd nol bo'lsa xato beradi", () => {
    expect(
      SaleItemSchema.safeParse({ ...validItem, pricePerCubicUsd: 0 }).success
    ).toBe(false);
  });
});

describe("CreateSaleSchema", () => {
  const validSale = {
    customerId: 1,
    paymentType: "cash",
    items: [{ warehouseId: 1, count: 50, pricePerCubicUsd: 200 }],
  };

  it("to'g'ri savdoni qabul qiladi", () => {
    expect(CreateSaleSchema.safeParse(validSale).success).toBe(true);
  });

  it("barcha to'lov turlarini qabul qiladi", () => {
    ["cash", "debt", "mixed"].forEach((paymentType) => {
      expect(
        CreateSaleSchema.safeParse({ ...validSale, paymentType }).success
      ).toBe(true);
    });
  });

  it("bo'sh items massivini rad etadi", () => {
    expect(
      CreateSaleSchema.safeParse({ ...validSale, items: [] }).success
    ).toBe(false);
  });

  it("customerId yo'q bo'lsa xato beradi", () => {
    const { customerId: _, ...rest } = validSale;
    expect(CreateSaleSchema.safeParse(rest).success).toBe(false);
  });

  it("noto'g'ri to'lov turini rad etadi", () => {
    expect(
      CreateSaleSchema.safeParse({ ...validSale, paymentType: "crypto" }).success
    ).toBe(false);
  });
});

// ─── partners.schema.ts ───────────────────────────────────────────────────────

describe("CreatePartnerSchema", () => {
  const validPartner = {
    name: "Toshkent Yog'och MChJ",
    type: "wood_buyer",
  };

  it("to'g'ri hamkorni qabul qiladi", () => {
    expect(CreatePartnerSchema.safeParse(validPartner).success).toBe(true);
  });

  it("barcha hamkor turlarini qabul qiladi", () => {
    const types = [
      "russia_supplier", "code_supplier", "code_buyer",
      "wood_buyer", "service_provider", "truck_owner",
      "personal", "exchanger", "partner",
    ];
    types.forEach((type) => {
      expect(
        CreatePartnerSchema.safeParse({ ...validPartner, type }).success
      ).toBe(true);
    });
  });

  it("name bo'sh bo'lsa xato beradi", () => {
    expect(
      CreatePartnerSchema.safeParse({ ...validPartner, name: "" }).success
    ).toBe(false);
  });

  it("name 200 belgidan uzun bo'lsa xato beradi", () => {
    expect(
      CreatePartnerSchema.safeParse({ ...validPartner, name: "A".repeat(201) }).success
    ).toBe(false);
  });

  it("noto'g'ri turni rad etadi", () => {
    expect(
      CreatePartnerSchema.safeParse({ ...validPartner, type: "investor" }).success
    ).toBe(false);
  });

  it("ixtiyoriy phone va notes bilan ishlaydi", () => {
    expect(
      CreatePartnerSchema.safeParse({
        ...validPartner,
        phone: "+998901234567",
        notes: "Doimiy mijoz",
      }).success
    ).toBe(true);
  });
});

describe("CreatePaymentSchema", () => {
  const validPayment = {
    partnerId: 1,
    amount: 5000,
    currency: "usd",
    type: "debt_give",
  };

  it("to'g'ri to'lovni qabul qiladi", () => {
    expect(CreatePaymentSchema.safeParse(validPayment).success).toBe(true);
  });

  it("rub valyutasini qabul qiladi", () => {
    expect(
      CreatePaymentSchema.safeParse({ ...validPayment, currency: "rub" }).success
    ).toBe(true);
  });

  it("debt_take turini qabul qiladi", () => {
    expect(
      CreatePaymentSchema.safeParse({ ...validPayment, type: "debt_take" }).success
    ).toBe(true);
  });

  it("noto'g'ri valyutani rad etadi", () => {
    expect(
      CreatePaymentSchema.safeParse({ ...validPayment, currency: "eur" }).success
    ).toBe(false);
  });

  it("amount nol bo'lsa xato beradi", () => {
    expect(
      CreatePaymentSchema.safeParse({ ...validPayment, amount: 0 }).success
    ).toBe(false);
  });
});
