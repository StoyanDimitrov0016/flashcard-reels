import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupFileGateway {
  pick(): Promise<string | null>;
  share(document: ProgressBackupDocument): Promise<void>;
  saveSafetyCopy(document: ProgressBackupDocument): Promise<void>;
  hasSafetyCopy(): Promise<boolean>;
  shareSafetyCopy(): Promise<void>;
}
