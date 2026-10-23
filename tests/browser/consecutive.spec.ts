import { test, expect } from "@playwright/test";

test("save failures preserve recordings; two guests stay separate and review can be resumed", async ({ page }) => {
  await page.goto("/live?mock=1");
  await page.clock.install();
  const finishDemo = async () => {
    await page.getByRole("button", { name: "デモの会話で試す", exact: true }).click();
    await page.clock.runFor(3_000);
    for (let part = 0; part < 7; part++) {
      await page.clock.fastForward(30_000);
      await page.clock.runFor(1_000);
    }
    await expect(page.getByRole("button", { name: "会話を終えて確認へ", exact: true })).toBeEnabled();
  };
  await finishDemo();
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    Object.assign(window, { failArchiveWrites: true });
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore["put"]>) {
      if (this.name === "sessions" && (window as unknown as { failArchiveWrites: boolean }).failArchiveWrites) throw new DOMException("Test quota exceeded", "QuotaExceededError");
      return original.apply(this, args);
    };
  });
  await page.getByRole("button", { name: "会話を終えて確認へ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "履歴に保存できませんでした" })).toBeVisible();
  await page.evaluate(() => Object.assign(window, { failArchiveWrites: false }));
  await page.getByRole("button", { name: "保存を再試行", exact: true }).click();
  await expect(page.getByText("ステップ1 / 3 — 含めたくない発言を選ぶ", { exact: true })).toBeVisible();
  const firstText = await page.locator("textarea").first().inputValue();
  await page.evaluate(() => Object.assign(window, { failArchiveWrites: true }));
  await page.getByRole("button", { name: "保存して次の人の準備へ", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "現在のインタビューはそのまま" })).toBeVisible();
  await expect(page.locator("textarea").first()).toHaveValue(firstText);
  await page.evaluate(() => Object.assign(window, { failArchiveWrites: false }));
  await page.getByRole("button", { name: "保存して次の人の準備へ", exact: true }).click();
  await expect(page.getByRole("button", { name: "デモの会話で試す", exact: true })).toBeVisible();
  await expect(page.getByRole("textbox").first()).toHaveValue("");
  for (const checkbox of await page.getByRole("checkbox").all()) await expect(checkbox).not.toBeChecked();
  await finishDemo();
  await page.getByRole("button", { name: "会話を終えて確認へ", exact: true }).click();
  await expect(page.locator("textarea").first()).toBeVisible();
  await page.getByRole("button", { name: "保存して次の人の準備へ", exact: true }).click();
  await page.goto("/live/archive");
  const links = page.locator('a[href^="/live/archive/"]');
  await expect(links).toHaveCount(2);
  const hrefs = await links.evaluateAll((elements) => elements.map((element) => element.getAttribute("href")));
  expect(new Set(hrefs).size).toBe(2);
  await links.last().click();
  await page.getByRole("button", { name: "確認・同意を再開する", exact: true }).click();
  await expect(page.locator("textarea").first()).toHaveValue(firstText);
  await expect(page.locator("audio")).toHaveAttribute("src", /^blob:/);
  await page.getByRole("button", { name: "分析結果を確認する", exact: true }).click();
  await page.getByRole("button", { name: "最終分析を見る", exact: true }).click();
  await expect(page.getByRole("link", { name: "過去の履歴を見る", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "保存して次の人の準備へ", exact: true }).click();
  await page.goto("/live/archive");
  await expect(page.locator('a[href^="/live/archive/"]')).toHaveCount(2);
});
