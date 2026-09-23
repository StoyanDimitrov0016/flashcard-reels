import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupQuery {
  read(exportedAt: string): Promise<ProgressBackupDocument>;
}
