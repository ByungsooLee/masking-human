"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import {
  DEMO_SAMPLE_PHOTO,
  MOCK_STAGE_CAPTION,
  type MagazineLayoutVariant,
  type StageAspect,
  type StageCaption,
  type StageMediaMode,
} from "@/lib/live/live-stage-types";

const ASPECT_KEY = "liveStageAspect";
const PANEL_KEY = "livePanelVisible";
const LAYOUT_KEY = "magazineLayoutVariant";

type LiveStageContextValue = {
  aspect: StageAspect;
  setAspect: (a: StageAspect) => void;
  panelVisible: boolean;
  setPanelVisible: (v: boolean) => void;
  togglePanel: () => void;
  layoutVariant: MagazineLayoutVariant;
  setLayoutVariant: (v: MagazineLayoutVariant) => void;
  mediaMode: StageMediaMode;
  setMediaMode: (m: StageMediaMode) => void;
  stillUrl: string | null;
  setStillUrl: (url: string | null) => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  accentColor: string | null;
  setAccentColor: (c: string | null) => void;
  demoPhotoUrl: string;
  useDemoPhoto: boolean;
  setUseDemoPhoto: (v: boolean) => void;
  caption: StageCaption;
};

const LiveStageContext = createContext<LiveStageContextValue | null>(null);

function readAspect(): StageAspect {
  if (typeof window === "undefined") return "9:16";
  return localStorage.getItem(ASPECT_KEY) === "16:9" ? "16:9" : "9:16";
}

function readPanelVisible(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(PANEL_KEY) !== "0";
}

function readLayoutVariant(): MagazineLayoutVariant {
  if (typeof window === "undefined") return "page";
  return localStorage.getItem(LAYOUT_KEY) === "spread" ? "spread" : "page";
}

export function LiveStageProvider({ children }: { children: ReactNode }) {
  const [aspect, setAspectState] = useState<StageAspect>("9:16");
  const [panelVisible, setPanelVisibleState] = useState(true);
  const [layoutVariant, setLayoutVariantState] = useState<MagazineLayoutVariant>("page");
  const [mediaMode, setMediaMode] = useState<StageMediaMode>("none");
  const [stillUrl, setStillUrl] = useState<string | null>(null);
  const [accentColor, setAccentColor] = useState<string | null>(null);
  const [useDemoPhoto, setUseDemoPhoto] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setAspectState(readAspect());
    setPanelVisibleState(readPanelVisible());
    setLayoutVariantState(readLayoutVariant());
  }, []);

  const setAspect = useCallback((a: StageAspect) => {
    setAspectState(a);
    localStorage.setItem(ASPECT_KEY, a);
  }, []);

  const setPanelVisible = useCallback((v: boolean) => {
    setPanelVisibleState(v);
    localStorage.setItem(PANEL_KEY, v ? "1" : "0");
  }, []);

  const togglePanel = useCallback(() => {
    setPanelVisibleState((prev) => {
      const next = !prev;
      localStorage.setItem(PANEL_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const setLayoutVariant = useCallback((v: MagazineLayoutVariant) => {
    setLayoutVariantState(v);
    localStorage.setItem(LAYOUT_KEY, v);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "h" || e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      e.preventDefault();
      togglePanel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePanel]);

  const value = useMemo(
    (): LiveStageContextValue => ({
      aspect,
      setAspect,
      panelVisible,
      setPanelVisible,
      togglePanel,
      layoutVariant,
      setLayoutVariant,
      mediaMode,
      setMediaMode,
      stillUrl,
      setStillUrl,
      videoRef,
      accentColor,
      setAccentColor,
      demoPhotoUrl: DEMO_SAMPLE_PHOTO,
      useDemoPhoto,
      setUseDemoPhoto,
      caption: MOCK_STAGE_CAPTION,
    }),
    [
      aspect,
      setAspect,
      panelVisible,
      setPanelVisible,
      togglePanel,
      layoutVariant,
      setLayoutVariant,
      mediaMode,
      stillUrl,
      accentColor,
      useDemoPhoto,
    ],
  );

  return <LiveStageContext.Provider value={value}>{children}</LiveStageContext.Provider>;
}

export function useLiveStage(): LiveStageContextValue {
  const ctx = useContext(LiveStageContext);
  if (!ctx) throw new Error("useLiveStage must be used within LiveStageProvider");
  return ctx;
}

export function useLiveStageOptional(): LiveStageContextValue | null {
  return useContext(LiveStageContext);
}
