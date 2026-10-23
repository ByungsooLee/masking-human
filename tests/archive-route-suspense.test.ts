import { Suspense, type ReactElement } from "react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/live/archive-session-detail", () => ({ ArchiveSessionDetail: () => null }));
import ArchiveDetailPage from "@/app/mypage/history/[id]/page";

describe("archive detail runtime boundary", () => {
  it("renders Suspense before awaiting URL params or rendering pathname-dependent navigation", async () => {
    const params = Promise.resolve({ id: "saved-interview" });
    const page = ArchiveDetailPage({ params });
    expect(page.type).toBe(Suspense);
    expect(page.props.fallback.props.role).toBe("status");
    const child = page.props.children as ReactElement<{ params: typeof params }>;
    expect(child.props.params).toBe(params);
    const render = child.type as (props: typeof child.props) => Promise<ReactElement<{ id: string }>>;
    expect((await render(child.props)).props.id).toBe("saved-interview");
  });
});
