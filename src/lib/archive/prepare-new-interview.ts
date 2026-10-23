import { useMagazineFlowStore } from "@/stores/magazine-flow-store";
import { useRealtimeInterviewStore } from "@/stores/realtime-interview-store";

/** Management links start fresh; archived reviews use the explicit resume action. */
export function prepareNewInterview() {
  useRealtimeInterviewStore.getState().reset();
  useMagazineFlowStore.getState().resetFlow();
}
