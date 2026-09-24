import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupQuery {
  read(exportedAt: string): Promise<ProgressBackupDocument>;
  readSafetyCopyFileName(): Promise<string | null>;
  readInstalledDeckIds(): Promise<ReadonlySet<string>>;
}
