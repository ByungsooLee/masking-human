export type StageAspect = "9:16" | "16:9";
export type MagazineLayoutVariant = "page" | "spread";
export type StageMediaMode = "video" | "still" | "none";

export type StageCaption = {
  name: string;
  place: string;
  date: string;
};

export const DEMO_SAMPLE_PHOTO = "/demo/apartamento-sample.svg";

export const MOCK_STAGE_CAPTION: StageCaption = {
  name: "Yuki",
  place: "Tokyo",
  date: "2026-10-20",
};
