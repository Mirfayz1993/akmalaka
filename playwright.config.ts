import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  testDir: "./src/__tests__/e2e",
  testMatch: "**/*.spec.ts",

  // Har bir test 30 soniyada tugashi kerak
  timeout: 30_000,

  // CI da parallel ishlamasin (VPS resurs kam)
  workers: process.env.CI ? 1 : 2,

  // Muvaffaqiyatsiz testda screenshot olsin
  reporter: [
    ["list"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001",
    // Xato bo'lganda screenshot
    screenshot: "only-on-failure",
    // Xato bo'lganda video
    video: "retain-on-failure",
    // Har bir action uchun trace (debug uchun)
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  // E2E testlardan oldin dev server start qilish (local uchun)
  // CI da server allaqachon ishlab turadi
  webServer: process.env.CI
    ? undefined
    : {
        command: "npm run start",
        url: "http://localhost:3001",
        reuseExistingServer: true,
        timeout: 60_000,
      },
});
