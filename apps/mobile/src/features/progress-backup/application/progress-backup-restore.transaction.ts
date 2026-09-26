import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupRestoreTransaction {
  restore(document: ProgressBackupDocument, safetyCopyFileName?: string): Promise<void>;
}
