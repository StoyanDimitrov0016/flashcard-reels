import type { StudyService } from "@/features/study/domain/study.service";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";

import { ProgressBackupServiceImpl } from "@/features/progress-backup/application/progress-backup.service.impl";
import { ExpoProgressBackupFileGateway } from "@/features/progress-backup/infrastructure/expo-progress-backup-file.gateway";
import { SQLiteProgressBackupRestoreTransaction } from "@/features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction";
import { SQLiteProgressBackupQuery } from "@/features/progress-backup/infrastructure/sqlite-progress-backup.query";

type CreateProgressBackupServiceOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  studyService: StudyService;
}>;

export function createProgressBackupService({
  database,
  clock,
  studyService,
}: CreateProgressBackupServiceOptions) {
  return new ProgressBackupServiceImpl(
    studyService,
    new SQLiteProgressBackupQuery(database),
    new SQLiteProgressBackupRestoreTransaction(database),
    new ExpoProgressBackupFileGateway(),
    clock
  );
}
