export const SELECTABLE_REALTIME_MODELS = ["gpt-realtime-2.1", "gpt-realtime-2.1-mini"] as const;
export type SelectableRealtimeModel = typeof SELECTABLE_REALTIME_MODELS[number];

export function isSelectableRealtimeModel(value: unknown): value is SelectableRealtimeModel {
  return SELECTABLE_REALTIME_MODELS.some((model) => model === value);
}
