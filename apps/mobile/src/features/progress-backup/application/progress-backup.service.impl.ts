import type { ProgressBackupFileGateway } from "@/features/progress-backup/application/progress-backup-file.gateway";
import type { ProgressBackupRestoreTransaction } from "@/features/progress-backup/application/progress-backup-restore.transaction";
import type { ProgressBackupQuery } from "@/features/progress-backup/application/progress-backup.query";
import type {
  PreparedProgressRestore,
  ProgressBackupService,
} from "@/features/progress-backup/application/progress-backup.service";
import type { StudyService } from "@/features/study/domain/study.service";
import type { Clock } from "@/shared/domain/clock";

import {
  ProgressBackupDocumentSchema,
  summarizeProgressBackup,
} from "@/features/progress-backup/contracts/progress-backup.schema";

export class ProgressBackupServiceImpl implements ProgressBackupService {
  private readonly studyService: StudyService;
  private readonly query: ProgressBackupQuery;
  private readonly restoreTransaction: ProgressBackupRestoreTransaction;
  private readonly files: ProgressBackupFileGateway;
  private readonly clock: Clock;

  constructor(
    studyService: StudyService,
    query: ProgressBackupQuery,
    restoreTransaction: ProgressBackupRestoreTransaction,
    files: ProgressBackupFileGateway,
    clock: Clock
  ) {
    this.studyService = studyService;
    this.query = query;
    this.restoreTransaction = restoreTransaction;
    this.files = files;
    this.clock = clock;
  }

  async exportProgress(): Promise<void> {
    await this.studyService.settleForProgressBackup();
    const document = ProgressBackupDocumentSchema.parse(await this.query.read(this.clock.now()));
    await this.files.share(document);
  }

  async prepareRestore(): Promise<PreparedProgressRestore | null> {
    const contents = await this.files.pick();
    if (contents === null) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch {
      throw new Error("The selected file is not a valid progress backup");
    }
    const document = ProgressBackupDocumentSchema.parse(parsed);
    const local = await this.query.read(this.clock.now());
    return {
      document,
      incoming: summarizeProgressBackup(document),
      local: summarizeProgressBackup(local),
    };
  }

  async restore(prepared: PreparedProgressRestore): Promise<void> {
    const document = ProgressBackupDocumentSchema.parse(prepared.document);
    await this.studyService.settleForProgressBackup();
    const local = ProgressBackupDocumentSchema.parse(await this.query.read(this.clock.now()));
    await this.files.saveSafetyCopy(local);
    await this.restoreTransaction.restore(document);
  }

  hasSafetyCopy(): Promise<boolean> {
    return this.files.hasSafetyCopy();
  }

  shareSafetyCopy(): Promise<void> {
    return this.files.shareSafetyCopy();
  }
}
