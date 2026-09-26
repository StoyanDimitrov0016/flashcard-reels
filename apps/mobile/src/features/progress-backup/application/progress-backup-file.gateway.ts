import type { ProgressBackupDocument } from "@/features/progress-backup/contracts/progress-backup.schema";

export interface ProgressBackupFileGateway {
  pick(): Promise<string | null>;
  share(document: ProgressBackupDocument): Promise<void>;
  saveSafetyCopy(document: ProgressBackupDocument): Promise<string>;
  hasSafetyCopy(fileName: string): Promise<boolean>;
  shareSafetyCopy(fileName: string): Promise<void>;
  deleteSafetyCopy(fileName: string): Promise<void>;
}
