import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("the demo rejects all server API methods before handlers run", async ({ request }) => {
  const routes = ["/api", "/api/health", "/api/session", "/api/interview", "/api/interview/consent", "/api/magazine/suggest-copy", "/api/release-consent", "/api/usage/session", "/api/usage/session/example", "/api/usage/sessions", "/api/usage/summary", "/api/voice/stt", "/api/voice/tts", "/api/voice/transcript/confirm", "/api/voice/upload-url", "/api/voice/upload-complete", "/api/admin/deletion/process", "/api/admin/storage/sweep", "/api/future-route"];
  for (const path of routes) {
    for (const method of ["GET", "POST", "PATCH", "DELETE", "OPTIONS", "HEAD"]) {
      const response = await request.fetch(path, { method });
      expect(response.status(), `${method} ${path}`).toBe(403);
      if (method !== "HEAD") expect(await response.json()).toMatchObject({ error: "DEMO_ONLY" });
    }
  }
});

for (const language of ["ja", "en"] as const) {
  test(`${language}: mock flow, mobile views, history and material downloads`, async ({ page, context }) => {
    const en = language === "en";
    const outgoing: string[] = [];
    const errors: string[] = [];
    let mediaRequests = 0;
    await page.exposeFunction("onDemoMediaRequest", () => mediaRequests++);
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname.startsWith("/api/") || (url.protocol.startsWith("http") && url.origin !== new URL(test.info().project.use.baseURL!).origin)) outgoing.push(request.url());
    });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      // Any accidental access is a test failure, even when permissions are absent.
      navigator.mediaDevices.getUserMedia = async () => {
        await (window as unknown as { onDemoMediaRequest: () => Promise<void> }).onDemoMediaRequest();
        throw new Error("Real microphone/camera must not be requested in the demo");
      };
    });
    await page.setViewportSize({ width: 390, height: 844 });
    // Removing the query parameter must still leave the deployment in mock mode.
    await page.goto("/live");
    await page.getByRole("combobox").first().selectOption(language);
    await expect(page.getByRole("note")).toContainText(en ? "Demo only" : "動作確認専用デモ");
    await expect(page.getByRole("button", { name: en ? "Start after the sync cue" : "同期合図のあと会話を始める", exact: true })).toHaveCount(0);
    await page.clock.install();
    await page.getByRole("button", { name: en ? "Try the demo conversation" : "デモの会話で試す", exact: true }).click();
    await page.clock.runFor(3_000);
    const end = page.getByRole("button", { name: en ? "End conversation and review" : "会話を終えて確認へ", exact: true });
    await expect(end).toBeVisible();
    const workspace = page.locator(".conversation-workspace");
    await expect(workspace).toHaveAttribute("data-view", "chat");
    await page.getByRole("button", { name: en ? "Mind map" : "マインドマップ", exact: true }).click();
    await expect(page.locator("#workspace-chat")).toBeHidden();
    await expect(page.locator("#workspace-map")).toBeVisible();
    await page.getByRole("button", { name: en ? "Chat" : "チャット", exact: true }).click();
    await expect(page.locator("#workspace-map")).toBeHidden();
    // Advance the sample's real callbacks in sections, allowing map updates between them.
    for (let part = 0; part < 7; part++) {
      await page.clock.fastForward(30_000);
      await page.clock.runFor(1_000);
    }
    await expect(end).toBeEnabled({ timeout: 210_000 });
    await end.click();
    await expect(page.getByText(en ? "Step 1 / 3 — Choose statements to exclude" : "ステップ1 / 3 — 含めたくない発言を選ぶ", { exact: true })).toBeVisible();
    const excluded = page.getByRole("listitem").filter({ has: page.locator("textarea") }).first();
    await excluded.getByRole("checkbox").check();
    await page.getByRole("button", { name: en ? "Review analysis results" : "分析結果を確認する", exact: true }).click();
    await expect(page.getByText(en ? "Step 2 / 3 — Review the findings" : "ステップ2 / 3 — 分析候補への確認", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: en ? "View the final analysis" : "最終分析を見る", exact: true }).click();
    await expect(page.getByText(en ? "Demo: no real signature is collected." : "デモでは実際の署名を収集しません。", { exact: true })).toBeVisible();
    await expect(page.locator("canvas")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /ZIP|SRT|CSV/ })).toHaveCount(0);
    await page.getByRole("link", { name: en ? "Open interview history" : "過去の履歴を見る", exact: true }).click();
    await page.locator('a[href^="/live/archive/"]').first().click();
    await page.getByRole("button", { name: en ? "Media & social exports" : "素材保存・SNS書き出し", exact: true }).click();
    const download = async (name: string) => {
      const pending = page.waitForEvent("download");
      await page.getByRole("button", { name, exact: true }).click();
      const file = await pending;
      expect(await file.failure()).toBeNull();
      const bytes = await readFile((await file.path())!);
      expect(bytes.length).toBeGreaterThan(0);
      return bytes;
    };
    const zip = await download(en ? "Download all editing materials (ZIP)" : "編集素材をまとめて保存（ZIP）");
    expect(zip.subarray(0, 4).toString("hex")).toBe("504b0304");
    for (const file of ["manifest.json", "subtitles.srt", "edit.csv", "raw/events.json", "replay.html", "audio/mix-original"]) expect(zip.includes(Buffer.from(file)), `ZIP must include ${file}`).toBe(true);
    expect(zip.includes(Buffer.from('"hasSignedPublicationConsent": false'))).toBe(true);
    await page.getByText(en ? "Individual text / data files" : "テキスト・データを個別に保存", { exact: true }).click();
    expect((await download("subtitles.srt")).toString()).toContain("-->");
    expect((await download("edit.csv")).toString()).toContain(",");
    const events = JSON.parse((await download("raw/events.json")).toString());
    expect(events.some((event: { type: string }) => event.type === "map_update")).toBe(true);
    await download(en ? "Original" : "原形式で保存");
    const wav = await download(en ? "Convert to WAV" : "WAVに変換して保存");
    expect(wav.subarray(0, 4).toString()).toBe("RIFF");
    // Browser storage survives reload, and is isolated from a different browser context.
    const detailUrl = page.url();
    await page.reload();
    await expect(page.getByRole("button", { name: en ? "Media & social exports" : "素材保存・SNS書き出し", exact: true })).toBeVisible();
    const other = await context.browser()!.newContext();
    const otherPage = await other.newPage();
    await otherPage.goto(detailUrl);
    await expect(otherPage.getByText("このブラウザには該当の履歴がありません。", { exact: true })).toBeVisible();
    await other.close();
    await page.goto("/photo-consent");
    await page.getByRole("button", { name: en ? "English" : "日本語", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(en ? "Preview only" : "表示確認専用");
    await expect(page.getByRole("textbox").first()).toBeDisabled();
    await expect(page.getByRole("button", { name: en ? "Agree & save" : "同意して保存", exact: true })).toBeDisabled();
    expect(mediaRequests).toBe(0);
    expect(outgoing).toEqual([]);
    expect(errors).toEqual([]);
  });
}
