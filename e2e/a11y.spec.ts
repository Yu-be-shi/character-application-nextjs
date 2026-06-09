import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// アクセシビリティ自動監査（axe-core）。未認証で到達できるログインページを検査する。
// WCAG 2 A/AA の重大な違反（critical/serious）が無いことを確認する。
test("ログインページに重大な a11y 違反が無い", async ({ page }) => {
  await page.goto("/login");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  const serious = results.violations.filter(
    (v) => v.impact === "critical" || v.impact === "serious",
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
});
