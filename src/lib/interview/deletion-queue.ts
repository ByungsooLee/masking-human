/** @deprecated import from ./deletion/deletion-service */
export type { DeletionJob, DeletionJobStatus } from "./deletion/types";
export {
  enqueueSessionDeletion as enqueueDeletion,
  processNextDeletionJob,
} from "./deletion/deletion-service";
export { clearDeletionQueueForTests } from "./deletion/memory-deletion-queue";
