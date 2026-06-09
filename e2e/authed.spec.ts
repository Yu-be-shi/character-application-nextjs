import { test, expect } from "@playwright/test";

// 認証済みセッション(seed 済み cookie)での検証。
// アプリ + MySQL だけで完結する範囲を対象にする（character-api を必要とする
// 作成/編集/ギャラリーの通しE2Eは、別途フルスタック起動の CI で実施する想定）。

test("ログイン済みなら /characters はログインへリダイレクトされない", async ({ page }) => {
  await page.goto("/characters");
  await expect(page).toHaveURL(/\/characters$/);
  await expect(page).not.toHaveURL(/\/login/);
});

test("マイキャラクター画面（所有0件の空状態）が表示される", async ({ page }) => {
  await page.goto("/characters");
  // ナビにログアウトがある＝認証済み。
  await expect(page.locator("body")).toContainText(/ログアウト|Log out/);
  // 所有0件の空状態 CTA が出る（API 呼び出し不要＝アプリ+DBだけで動く経路）。
  await expect(page.locator("body")).toContainText(/まだキャラクター|No characters/);
});
