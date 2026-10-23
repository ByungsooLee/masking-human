import { test, expect } from "@playwright/test";

for (const language of ["ja", "en"] as const) {
  test(`${language}: participant navigation and mobile management workspace`, async ({ page }) => {
    const en = language === "en";
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/live");
    await page.getByRole("combobox").first().selectOption(language);
    const nav = page.getByRole("navigation", { name: en ? "Main navigation" : "メインメニュー" });
    await expect(nav.getByRole("link")).toHaveCount(2);
    await expect(nav).not.toContainText(en ? "Photo permission" : "写真撮影許可");
    await expect(nav).not.toContainText(en ? "Usage" : "利用料");
    await expect(nav).not.toContainText(en ? "History" : "履歴");
    await nav.getByRole("link", { name: en ? "My page" : "マイページ", exact: true }).click();
    await expect(page.getByRole("heading", { name: en ? "My page" : "マイページ", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: en ? "Open interview history" : "履歴を開く", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: en ? "Manage photo permissions" : "撮影許可を管理する", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: en ? "View usage" : "利用料を確認する", exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("link", { name: en ? "View usage" : "利用料を確認する", exact: true }).click();
    await expect(page).toHaveURL(/\/mypage\/usage$/);
    const sections = page.getByRole("navigation", { name: en ? "My page sections" : "マイページのメニュー" });
    await expect(sections.getByRole("link")).toHaveCount(4);
    for (const link of await sections.getByRole("link").all()) {
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(390);
    }
    await expect(sections.getByRole("link", { name: en ? "Usage" : "利用料", exact: true })).toHaveAttribute("aria-current", "page");
    await page.goto("/photo-consent");
    await expect(page).toHaveURL(/\/mypage\/photo-consent$/);
    await page.goto("/live/archive");
    await expect(page).toHaveURL(/\/mypage\/history$/);
    await expect(page.getByRole("navigation", { name: en ? "My page sections" : "マイページのメニュー" })).toBeVisible();
  });
}
