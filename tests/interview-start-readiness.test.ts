import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { interviewStartBlockers } from "@/lib/magazine-flow/start-readiness";
import { useMagazineFlowStore } from "@/stores/magazine-flow-store";

const prepare = { ...useMagazineFlowStore.getInitialState().prepare, place: "Tokyo", consents: { aiConversation: true, recording: true, photoVideo: false, snsPublish: true } };

describe("interview consent stages", () => {
  it("shows initial checkboxes without a signature form", () => {
    const source = readFileSync("src/components/magazine-flow/phase-prepare.tsx", "utf8");
    expect(source).not.toContain("<ReleaseConsent");
    expect(source).toContain('["snsPublish",');
    expect(source).toContain("署名保存までは公開を許可しません");
    expect(source).toContain("photoVideo: e.target.checked");
  });
  it("allows starting after the three initial checks, with no signed release yet", () => {
    expect(interviewStartBlockers(prepare)).toEqual([]);
    expect(useMagazineFlowStore.getInitialState().releaseConsent).toBeNull();
  });
  it("blocks starting when the initial publication-plan confirmation is missing", () => {
    expect(interviewStartBlockers({ ...prepare, consents: { ...prepare.consents, snsPublish: false } })).toEqual([expect.stringContaining("3つ目")]);
  });
  it("explains missing location and required recording / AI consents", () => {
    const result = interviewStartBlockers({ ...prepare, place: "  ", consents: { ...prepare.consents, aiConversation: false, recording: false } });
    expect(result).toHaveLength(3);
    expect(result[0]).toContain("撮影場所");
  });
  it("places the signature after the final analysis and uses the existing recording ID", () => {
    const source = readFileSync("src/components/magazine-flow/phase-results.tsx", "utf8");
    expect(source.indexOf("<ReleaseConsent")).toBeGreaterThan(source.indexOf("<FinalAnalysisView"));
    expect(source).toContain("sessionId={state.archiveId}");
    expect(source).toContain("署名保存のない素材は公開できません");
    expect(source).toContain("デモでは実際の署名を収集しません");
    const store = useMagazineFlowStore;
    store.getState().markSessionStart();
    const id = store.getState().archiveId;
    store.getState().setReleaseConsent(null);
    expect(store.getState().archiveId).toBe(id);
    store.getState().resetFlow();
  });
  it("provides English initial checks", () => {
    expect(interviewStartBlockers({ ...prepare, language: "en", consents: { ...prepare.consents, snsPublish: false } })).toEqual(["Confirm the publication plan and final signature step (third checkbox)."]);
  });
});
