import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupRestoreTransaction {
  restore(document: ProgressBackupDocument): Promise<void>;
}
