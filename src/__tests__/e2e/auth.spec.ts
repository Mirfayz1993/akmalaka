import { test, expect } from "@playwright/test";

// ─── Sozlamalar ───────────────────────────────────────────────────────────────
// playwright.config.ts da baseURL = "http://localhost:3001" bo'lishi kerak

test.describe("Autentifikatsiya oqimlari", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("login sahifasi yuklanadi", async ({ page }) => {
    await expect(page).toHaveTitle(/Wood ERP/i);
    await expect(page.getByRole("button", { name: /kirish/i })).toBeVisible();
  });

  test("bo'sh forma bilan kirish xato beradi", async ({ page }) => {
    await page.getByRole("button", { name: /kirish/i }).click();
    // Validation xatosi yoki brauzer native validation
    await expect(page.locator("input[required]").first()).toBeFocused();
  });

  test("noto'g'ri parol bilan kirish rad etiladi", async ({ page }) => {
    await page.getByLabel(/foydalanuvchi/i).fill("admin");
    await page.getByLabel(/parol/i).fill("wrong_password");
    await page.getByRole("button", { name: /kirish/i }).click();

    // Xato xabari yoki sahifa o'zgarmaydi
    await expect(page).toHaveURL(/login/);
  });

  test("to'g'ri ma'lumotlar bilan dashboard ga o'tadi", async ({ page }) => {
    // .env dagi haqiqiy credentials bilan test
    await page.getByLabel(/foydalanuvchi/i).fill(process.env.ADMIN_USERNAME ?? "admin");
    await page.getByLabel(/parol/i).fill(process.env.E2E_ADMIN_PASSWORD ?? "");
    await page.getByRole("button", { name: /kirish/i }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(/balans/i)).toBeVisible();
  });
});

test.describe("Himoyalangan sahifalar", () => {
  test("login qilmasdan dashboard ga kirish login ga yo'naltiradi", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/login/);
  });

  test("login qilmasdan wagons ga kirish login ga yo'naltiradi", async ({ page }) => {
    await page.goto("/wagons");
    await expect(page).toHaveURL(/login/);
  });

  test("login qilmasdan partners ga kirish login ga yo'naltiradi", async ({ page }) => {
    await page.goto("/partners");
    await expect(page).toHaveURL(/login/);
  });
});
