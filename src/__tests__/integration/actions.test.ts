import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocklar ──────────────────────────────────────────────────────────────────

// next/cache mock — server actions revalidatePath ishlatadi
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// next-auth mock
vi.mock("@/auth", () => ({
  auth: vi.fn(() => ({ user: { name: "admin" } })),
}));

// DB mock — vi.hoisted bilan hoisting muammosidan qochamiz
const {
  mockReturning,
  mockValues,
  mockInsert,
  mockUpdateWhere,
  mockUpdate,
  mockDeleteWhere,
  mockDelete,
  mockOrderBy,
  mockWhere,
  mockFrom,
  mockSelect,
  mockTransaction,
  mockFindMany,
  mockFindFirst,
  mockDb,
} = vi.hoisted(() => {
  const mockReturning = vi.fn();
  const mockValues = vi.fn(() => ({ returning: mockReturning }));
  const mockInsert = vi.fn(() => ({ values: mockValues }));
  const mockUpdateWhere = vi.fn(() => ({ returning: mockReturning }));
  const mockUpdate = vi.fn(() => ({
    set: vi.fn(() => ({ where: mockUpdateWhere })),
  }));
  const mockDeleteWhere = vi.fn();
  const mockDelete = vi.fn(() => ({ where: mockDeleteWhere }));
  const mockOrderBy = vi.fn();
  const mockWhere = vi.fn(() => ({ orderBy: mockOrderBy }));
  const mockFrom = vi.fn(() => ({ where: mockWhere, orderBy: mockOrderBy }));
  const mockSelect = vi.fn(() => ({ from: mockFrom }));
  const mockTransaction = vi.fn();
  const mockFindMany = vi.fn();
  const mockFindFirst = vi.fn();
  const mockDb = {
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
    select: mockSelect,
    transaction: mockTransaction,
    query: {
      partners: { findMany: mockFindMany, findFirst: mockFindFirst },
      partnerBalances: { findMany: mockFindMany },
      cashOperations: { findMany: mockFindMany },
    },
  };
  return { mockReturning, mockValues, mockInsert, mockUpdateWhere, mockUpdate, mockDeleteWhere, mockDelete, mockOrderBy, mockWhere, mockFrom, mockSelect, mockTransaction, mockFindMany, mockFindFirst, mockDb };
});

vi.mock("@/db", () => ({
  db: mockDb,
}));

// Schema mock — import uchun kerak
vi.mock("@/db/schema", () => ({
  partners: { id: "id", name: "name", type: "type" },
  partnerBalances: { partnerId: "partnerId", amount: "amount" },
  cashOperations: {
    currency: "currency",
    amount: "amount",
    type: "type",
    exchangeRate: "exchangeRate",
  },
  transports: {},
}));

// drizzle-orm funksiyalarini mock qilamiz
vi.mock("drizzle-orm", () => ({
  eq: vi.fn((field, value) => ({ field, value })),
  and: vi.fn((...conditions) => conditions),
  sql: vi.fn((strings) => strings),
  desc: vi.fn((field) => field),
  asc: vi.fn((field) => field),
}));

// ─── Test import (mock dan keyin) ─────────────────────────────────────────────

import {
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getAllPartnersWithBalances,
  getPartnerWithBalance,
  recordPayment,
} from "@/lib/actions/partners";

// ─── Partners action testlari ─────────────────────────────────────────────────

describe("getPartners action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("type yo'q bo'lsa barcha hamkorlarni qaytaradi", async () => {
    const fakePartners = [
      { id: 1, name: "Hamkor A", type: "wood_buyer" },
      { id: 2, name: "Hamkor B", type: "russia_supplier" },
    ];
    mockOrderBy.mockResolvedValue(fakePartners);

    const result = await getPartners();
    expect(result).toEqual(fakePartners);
    expect(mockSelect).toHaveBeenCalled();
  });

  it("type berilsa filter bilan qaytaradi", async () => {
    const fakePartners = [{ id: 1, name: "Hamkor A", type: "wood_buyer" }];
    mockOrderBy.mockResolvedValue(fakePartners);

    const result = await getPartners("wood_buyer");
    expect(result).toEqual(fakePartners);
    expect(mockWhere).toHaveBeenCalled();
  });
});

describe("getAllPartnersWithBalances action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("balanslar bilan hamkorlarni qaytaradi", async () => {
    const fakeData = [
      {
        id: 1,
        name: "Hamkor A",
        balances: [
          { amount: "5000", transport: null },
          { amount: "-1000", transport: null },
        ],
      },
    ];
    mockFindMany.mockResolvedValue(fakeData);

    const result = await getAllPartnersWithBalances();
    expect(result[0].currentBalance).toBe(4000); // 5000 - 1000
    expect(result[0].name).toBe("Hamkor A");
  });

  it("balanslar bo'sh bo'lsa currentBalance = 0", async () => {
    mockFindMany.mockResolvedValue([
      { id: 2, name: "Yangi hamkor", balances: [] },
    ]);

    const result = await getAllPartnersWithBalances();
    expect(result[0].currentBalance).toBe(0);
  });
});

describe("getPartnerWithBalance action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hamkor topilmasa null qaytaradi", async () => {
    mockFindFirst.mockResolvedValue(null);

    const result = await getPartnerWithBalance(999);
    expect(result).toBeNull();
  });

  it("hamkor topilsa balanslar bilan qaytaradi", async () => {
    mockFindFirst.mockResolvedValue({ id: 1, name: "Test Hamkor" });
    mockFindMany.mockResolvedValue([
      { amount: "3000", transport: null },
      { amount: "2000", transport: null },
    ]);

    const result = await getPartnerWithBalance(1);
    expect(result).not.toBeNull();
    expect(result!.currentBalance).toBe(5000);
    expect(result!.name).toBe("Test Hamkor");
  });
});

describe("createPartner action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("yangi hamkor yaratadi va qaytaradi", async () => {
    const newPartner = { id: 1, name: "Yangi MChJ", type: "wood_buyer" };
    mockReturning.mockResolvedValue([newPartner]);

    const result = await createPartner({
      name: "Yangi MChJ",
      type: "wood_buyer",
    });

    expect(result).toEqual(newPartner);
    expect(mockInsert).toHaveBeenCalled();
    expect(mockValues).toHaveBeenCalledWith({
      name: "Yangi MChJ",
      type: "wood_buyer",
    });
  });

  it("phone va notes bilan hamkor yaratadi", async () => {
    const newPartner = {
      id: 2,
      name: "Test",
      type: "partner",
      phone: "+998901234567",
      notes: "Izoh",
    };
    mockReturning.mockResolvedValue([newPartner]);

    const result = await createPartner({
      name: "Test",
      type: "partner",
      phone: "+998901234567",
      notes: "Izoh",
    });

    expect(result.phone).toBe("+998901234567");
    expect(result.notes).toBe("Izoh");
  });

  it("revalidatePath chaqiriladi", async () => {
    const { revalidatePath } = await import("next/cache");
    mockReturning.mockResolvedValue([{ id: 1, name: "Test", type: "partner" }]);

    await createPartner({ name: "Test", type: "partner" });
    expect(revalidatePath).toHaveBeenCalledWith("/partners");
  });
});

describe("updatePartner action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hamkorni yangilaydi", async () => {
    const updated = { id: 1, name: "Yangilangan nom", type: "wood_buyer" };
    mockReturning.mockResolvedValue([updated]);

    const result = await updatePartner(1, { name: "Yangilangan nom" });
    expect(result).toEqual(updated);
    expect(mockUpdate).toHaveBeenCalled();
  });

  it("revalidatePath chaqiriladi", async () => {
    const { revalidatePath } = await import("next/cache");
    mockReturning.mockResolvedValue([{ id: 1 }]);

    await updatePartner(1, { name: "Test" });
    expect(revalidatePath).toHaveBeenCalledWith("/partners");
  });
});

describe("deletePartner action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("hamkorni o'chiradi", async () => {
    mockDeleteWhere.mockResolvedValue(undefined);

    await deletePartner(1);
    expect(mockDelete).toHaveBeenCalled();
    expect(mockDeleteWhere).toHaveBeenCalled();
  });

  it("revalidatePath chaqiriladi", async () => {
    const { revalidatePath } = await import("next/cache");
    mockDeleteWhere.mockResolvedValue(undefined);

    await deletePartner(1);
    expect(revalidatePath).toHaveBeenCalledWith("/partners");
  });
});

describe("recordPayment action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // transaction ni simulatsiya qilamiz — callback ni darhol ishlatamiz
    mockTransaction.mockImplementation(async (cb: (tx: typeof mockDb) => Promise<void>) => {
      await cb(mockDb);
    });
    mockValues.mockReturnValue({ returning: mockReturning });
    mockReturning.mockResolvedValue([{}]);
  });

  it("amount nol bo'lsa xato tashlaydi", async () => {
    await expect(
      recordPayment({ partnerId: 1, amount: 0, currency: "usd" })
    ).rejects.toThrow("Summa nol bo'lishi mumkin emas");
  });

  it("musbat amount bilan transaction yaratadi", async () => {
    await recordPayment({ partnerId: 1, amount: 1000, currency: "usd" });
    expect(mockTransaction).toHaveBeenCalled();
  });

  it("to'lov uchun revalidatePath chaqiriladi", async () => {
    const { revalidatePath } = await import("next/cache");
    await recordPayment({ partnerId: 1, amount: 500, currency: "rub" });
    expect(revalidatePath).toHaveBeenCalledWith("/partners");
  });
});
