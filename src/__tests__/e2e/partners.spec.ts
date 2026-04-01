import { test, expect, Page } from "@playwright/test";

async function loginAsAdmin(page: Page) {
  await page.goto("/login");
  await page.getByLabel(/foydalanuvchi/i).fill(process.env.ADMIN_USERNAME ?? "admin");
  await page.getByLabel(/parol/i).fill(process.env.E2E_ADMIN_PASSWORD ?? "");
  await page.getByRole("button", { name: /kirish/i }).click();
  await expect(page).toHaveURL("/");
}

test.describe("Hamkorlar sahifasi", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/partners");
  });

  test("hamkorlar sahifasi yuklanadi", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /hamkor/i })).toBeVisible();
  });

  test("yangi hamkor qo'shish tugmasi mavjud", async ({ page }) => {
    await expect(
      page.getByRole("button", { name: /qo'shish|yangi/i })
    ).toBeVisible();
  });

  test("hamkor yaratish formasi ochiladi va yopiladi", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yangi/i }).first().click();

    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Nom maydoni mavjud
    await expect(dialog.getByLabel(/nom/i)).toBeVisible();

    // Bekor qilish
    await page.keyboard.press("Escape");
    await expect(dialog).not.toBeVisible();
  });

  test("hamkor turi tanlanishi shart", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yangi/i }).first().click();

    const dialog = page.getByRole("dialog");
    // Hamkor tur select/radio
    const typeSelect = dialog.locator("select, [role='combobox']").first();
    await expect(typeSelect).toBeVisible();
  });

  test("bo'sh nom bilan hamkor yaratib bo'lmaydi", async ({ page }) => {
    await page.getByRole("button", { name: /qo'shish|yangi/i }).first().click();

    const dialog = page.getByRole("dialog");
    // Nomni bo'sh qoldirip saqlash bosamiz
    const saveButton = dialog.getByRole("button", { name: /saqlash|qo'shish/i });
    await saveButton.click();

    // Dialog hali ham ochiq (xato chiqishi kerak)
    await expect(dialog).toBeVisible();
  });
});
