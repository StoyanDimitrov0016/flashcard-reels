import type { ProgressBackupService } from "@/features/progress-backup/application/progress-backup.service";

import { useAppServices } from "@/infrastructure/app-services";

export function useProgressBackup(): Readonly<{ progressBackupService: ProgressBackupService }> {
  const { progressBackupService } = useAppServices();
  return { progressBackupService };
}
