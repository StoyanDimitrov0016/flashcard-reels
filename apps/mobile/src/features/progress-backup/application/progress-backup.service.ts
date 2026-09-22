import type {
  ProgressBackupDocument,
  ProgressBackupSummary,
} from "@/features/progress-backup/contracts/progress-backup.schema";

export type PreparedProgressRestore = Readonly<{
  document: ProgressBackupDocument;
  incoming: ProgressBackupSummary;
  local: ProgressBackupSummary;
}>;

export interface ProgressBackupService {
  exportProgress(): Promise<void>;
  prepareRestore(): Promise<PreparedProgressRestore | null>;
  restore(prepared: PreparedProgressRestore): Promise<boolean>;
  hasSafetyCopy(): Promise<boolean>;
  shareSafetyCopy(): Promise<void>;
}
