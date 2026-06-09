import { test, expect } from "@playwright/test";

// 認証ガード（未ログイン時のリダイレクト）を検証するスモーク E2E。
// Google OAuth の実ログインは E2E では行えないため、ここでは「未ログインで保護ページに入れない」
// ことを確認する（認可の最重要保証）。ログイン後フローは将来テスト用 Auth プロバイダ導入時に追加。

test("ルートは未ログインだとログインへリダイレクトされる", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login/);
});

test("保護ページ(/characters)も未ログインならログインへ", async ({ page }) => {
  await page.goto("/characters");
  await expect(page).toHaveURL(/\/login/);
});

test("ギャラリーも未ログインならログインへ", async ({ page }) => {
  await page.goto("/gallery");
  await expect(page).toHaveURL(/\/login/);
});

test("ログインページが表示される", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator("body")).toContainText(/ログイン|Google/i);
});
