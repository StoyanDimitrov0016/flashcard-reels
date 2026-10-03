import type { StudySessionSettlement } from "@/features/study/application/study-session-settlement";
import type { DrizzleDatabase } from "@/infrastructure/sqlite/drizzle-database";
import type { Clock } from "@/shared/domain/clock";
import type { IdGenerator } from "@/shared/domain/id-generator";

import { ProgressBackupServiceImpl } from "@/features/progress-backup/application/progress-backup.service.impl";
import { ExpoProgressBackupFileGateway } from "@/features/progress-backup/infrastructure/expo-progress-backup-file.gateway";
import { SQLiteProgressBackupRestoreTransaction } from "@/features/progress-backup/infrastructure/sqlite-progress-backup-restore.transaction";
import { SQLiteProgressBackupQuery } from "@/features/progress-backup/infrastructure/sqlite-progress-backup.query";

type CreateProgressBackupServiceOptions = Readonly<{
  database: DrizzleDatabase;
  clock: Clock;
  idGenerator: IdGenerator;
  studyService: StudySessionSettlement;
}>;

export function createProgressBackupService({
  database,
  clock,
  idGenerator,
  studyService,
}: CreateProgressBackupServiceOptions) {
  return new ProgressBackupServiceImpl(
    studyService,
    new SQLiteProgressBackupQuery(database),
    new SQLiteProgressBackupRestoreTransaction(database, idGenerator),
    new ExpoProgressBackupFileGateway(),
    clock
  );
}
