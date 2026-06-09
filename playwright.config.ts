import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3000";
const AUTH_STATE = "e2e/.auth/user.json";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: { baseURL, trace: "on-first-retry" },

  projects: [
    // DB にテスト用セッションを seed し、storageState(cookie) を書き出す。
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    // 未認証スモーク + a11y（storageState 無し）。
    {
      name: "guest",
      use: { ...devices["Desktop Chrome"] },
      testMatch: [/smoke\.spec\.ts/, /a11y\.spec\.ts/],
    },
    // 認証済み（seed したセッション cookie を使う）。
    {
      name: "authenticated",
      use: { ...devices["Desktop Chrome"], storageState: AUTH_STATE },
      dependencies: ["setup"],
      testMatch: /authed\.spec\.ts/,
    },
  ],

  webServer: process.env.E2E_NO_SERVER
    ? undefined
    : {
        command: "npm run start",
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
