import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  timeout: 270_000,
  expect: { timeout: 15_000 },
  workers: 2,
  reporter: "list",
  use: {
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    baseURL: process.env.DEMO_BASE_URL || "http://127.0.0.1:3000",
    browserName: "chromium",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
      args: ["--autoplay-policy=no-user-gesture-required"],
    },
    acceptDownloads: true,
  },
});
