import { test, expect, Page } from "@playwright/test";

// ─── Login helper ─────────────────────────────────────────────────────────────

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/foydalanuvchi/i).fill(process.env.ADMIN_USERNAME ?? "admin");
  await page.getByLabel(/parol/i).fill(process.env.E2E_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /kirish/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Vagonlar sahifasi", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/wagons");
  });

  test("vagonlar sahifasi yuklanadi", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /vagon|transport/i })).toBeVisible();
  });

  test("yangi vagon yaratish tugmasi mavjud", async ({ page }) => {
    const addButton = page.getByRole("button", { name: /qo'shish|yaratish|yangi/i });
    await expect(addButton).toBeVisible();
  });

  test("vagon yaratish modali ochiladi", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yaratish|yangi/i }).first().click();
    // Modal ochilishi kerak
    await expect(page.getByRole("dialog")).toBeVisible();
  });

  test("vagon yaratish modali yopiladi", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yaratish|yangi/i }).first().click();
    await expect(page.getByRole("dialog")).toBeVisible();

    // X tugmasi bilan yopish
    await page.getByRole("button", { name: /yopish|bekor/i }).first().click();
    await expect(page.getByRole("dialog")).not.toBeVisible();
  });

  test("wagon turi tanlash mumkin", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yaratish|yangi/i }).first().click();

    const dialog = page.getByRole("dialog");
    // Wagon/Truck radio yoki select mavjud
    const wagonOption = dialog.getByText(/vagon/i).first();
    await expect(wagonOption).toBeVisible();
  });
});

test.describe("Vagon holati o'zgartirilishi", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/wagons");
  });

  test("vagon ro'yxati jadval ko'rinishida", async ({ page }) => {
    // Jadval yoki karta ko'rinishi bo'lishi kerak
    const table = page.locator("table, [role='table'], .transport-list");
    // Agar vagonlar bo'lsa jadval ko'rinadi
    // Agar bo'lmasa EmptyState ko'rinadi
    const isEmpty = await page.getByRole("status").isVisible();
    if (!isEmpty) {
      await expect(table).toBeVisible();
    }
  });
});
