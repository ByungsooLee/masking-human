import { create } from "zustand";
import type {
  ExportAspect,
  MagazineDraft,
  MagazineFlowPhase,
  PrepareState,
  TranscriptEntry,
} from "@/lib/magazine-flow/types";

const PREPARE_STORAGE_KEY = "magazineFlowPrepare";

const defaultPrepare: PrepareState = {
  guestName: "",
  place: "",
  language: "ja",
  agentId: "default",
  includeCamera: false,
  consents: {
    aiConversation: false,
    photoVideo: false,
    recording: false,
    snsPublish: false,
  },
};

function loadPrepareDefaults(): PrepareState {
  if (typeof window === "undefined") return defaultPrepare;
  try {
    const raw = localStorage.getItem(PREPARE_STORAGE_KEY);
    if (!raw) return defaultPrepare;
    const parsed = JSON.parse(raw) as Partial<PrepareState>;
    return {
      ...defaultPrepare,
      ...parsed,
      consents: { ...defaultPrepare.consents, ...parsed.consents },
    };
  } catch {
    return defaultPrepare;
  }
}

type MagazineFlowState = {
  phase: MagazineFlowPhase;
  prepare: PrepareState;
  transcript: TranscriptEntry[];
  photoUrl: string | null;
  draft: MagazineDraft | null;
  exportAspect: ExportAspect;
  publishConsentConfirmed: boolean;
  sessionStartedAt: number | null;
  recordingSlateAtMs: number | null;
  setPhase: (phase: MagazineFlowPhase) => void;
  setPrepare: (patch: Partial<PrepareState>) => void;
  persistPrepare: () => void;
  setTranscript: (entries: TranscriptEntry[]) => void;
  updateTranscriptEntry: (id: string, patch: Partial<TranscriptEntry>) => void;
  setPhotoUrl: (url: string | null) => void;
  setDraft: (draft: MagazineDraft | null) => void;
  setExportAspect: (aspect: ExportAspect) => void;
  setPublishConsentConfirmed: (v: boolean) => void;
  setRecordingSlateAtMs: (ms: number | null) => void;
  markSessionStart: () => void;
  resetFlow: () => void;
  goBack: () => void;
};

export const useMagazineFlowStore = create<MagazineFlowState>((set, get) => ({
  phase: "prepare",
  prepare: loadPrepareDefaults(),
  transcript: [],
  photoUrl: null,
  draft: null,
  exportAspect: "4:5",
  publishConsentConfirmed: false,
  sessionStartedAt: null,
  recordingSlateAtMs: null,
  setPhase: (phase) => set({ phase }),
  setPrepare: (patch) => set({ prepare: { ...get().prepare, ...patch } }),
  persistPrepare: () => {
    const { prepare } = get();
    if (typeof window === "undefined") return;
    localStorage.setItem(
      PREPARE_STORAGE_KEY,
      JSON.stringify({
        place: prepare.place,
        language: prepare.language,
        agentId: prepare.agentId,
        includeCamera: prepare.includeCamera,
      }),
    );
  },
  setTranscript: (transcript) => set({ transcript }),
  updateTranscriptEntry: (id, patch) =>
    set({
      transcript: get().transcript.map((u) => (u.id === id ? { ...u, ...patch } : u)),
    }),
  setPhotoUrl: (photoUrl) => set({ photoUrl }),
  setDraft: (draft) => set({ draft }),
  setExportAspect: (exportAspect) => set({ exportAspect }),
  setPublishConsentConfirmed: (publishConsentConfirmed) => set({ publishConsentConfirmed }),
  setRecordingSlateAtMs: (recordingSlateAtMs) => set({ recordingSlateAtMs }),
  markSessionStart: () => set({ sessionStartedAt: Date.now() }),
  resetFlow: () =>
    set({
      phase: "prepare",
      prepare: loadPrepareDefaults(),
      transcript: [],
      photoUrl: null,
      draft: null,
      exportAspect: "4:5",
      publishConsentConfirmed: false,
      sessionStartedAt: null,
      recordingSlateAtMs: null,
    }),
  goBack: () => {
    const { phase } = get();
    const prev: Partial<Record<MagazineFlowPhase, MagazineFlowPhase>> = {
      slate: "prepare",
      conversation: "slate",
      review: "conversation",
      magazine: "review",
      publish: "magazine",
    };
    const next = prev[phase];
    if (next === "conversation" || next === "review") {
      set({ phase: next, draft: null });
      return;
    }
    if (next) set({ phase: next });
  },
}));
