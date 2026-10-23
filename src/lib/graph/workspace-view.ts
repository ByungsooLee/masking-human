export type WorkspaceView = "chat" | "map" | "both";

export function resolveWorkspaceView(view: WorkspaceView, mobile: boolean): WorkspaceView {
  return mobile && view === "both" ? "chat" : view;
}
