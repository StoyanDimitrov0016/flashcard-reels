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
  type ProgressBackupDocument,
} from "@/features/progress-backup/contracts/progress-backup.schema";
import {
  ProgressBackupValidationError,
  ProgressBackupVersionError,
} from "@/features/progress-backup/domain/progress-backup.errors";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

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
    try {
      await this.studyService.settleForProgressBackup();
      const document = ProgressBackupDocumentSchema.parse(await this.query.read(this.clock.now()));
      await this.files.share(document);
    } catch (cause) {
      throw toOperationError(cause, {
        code: "PROGRESS_BACKUP_EXPORT_FAILED",
        message: "Could not export learning progress",
        context: { operation: "progress-backup.export" },
      });
    }
  }

  async prepareRestore(): Promise<PreparedProgressRestore | null> {
    let contents: string | null;
    try {
      contents = await this.files.pick();
    } catch (cause) {
      throw toOperationError(cause, {
        code: "PROGRESS_BACKUP_READ_FAILED",
        message: "Could not read the selected progress backup",
        context: { operation: "progress-backup.pick" },
      });
    }
    if (contents === null) {
      return null;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(contents);
    } catch (cause) {
      throw new ProgressBackupValidationError(cause);
    }
    const document = parseIncomingBackup(parsed);
    let local;
    try {
      local = ProgressBackupDocumentSchema.parse(await this.query.read(this.clock.now()));
    } catch (cause) {
      throw toOperationError(cause, {
        code: "PROGRESS_BACKUP_READ_FAILED",
        message: "Could not prepare the progress backup preview",
        context: { operation: "progress-backup.preview" },
      });
    }
    return {
      document,
      incoming: summarizeProgressBackup(document),
      local: summarizeProgressBackup(local),
    };
  }

  async restore(prepared: PreparedProgressRestore): Promise<boolean> {
    const document = parseIncomingBackup(prepared.document);
    let candidateFileName: string | null = null;
    try {
      await this.studyService.settleForProgressBackup();
      const local = ProgressBackupDocumentSchema.parse(await this.query.read(this.clock.now()));
      const installedDeckIds = await this.query.readInstalledDeckIds();
      if (hasSameProgress(local, document, installedDeckIds)) {
        return false;
      }
      const previousFileName = await this.query.readSafetyCopyFileName();
      candidateFileName = await this.files.saveSafetyCopy(local);
      await this.restoreTransaction.restore(document, candidateFileName);
      candidateFileName = null;
      if (previousFileName) {
        await this.files
          .deleteSafetyCopy(previousFileName)
          .catch((cause: unknown) =>
            reportError(cause, "Old progress safety copy cleanup failure")
          );
      }
      return true;
    } catch (cause) {
      if (candidateFileName) {
        await this.files
          .deleteSafetyCopy(candidateFileName)
          .catch((cleanupCause: unknown) =>
            reportError(cleanupCause, "Failed progress safety copy cleanup failure")
          );
      }
      throw toOperationError(cause, {
        code: "PROGRESS_BACKUP_RESTORE_FAILED",
        message: "Could not restore learning progress",
        context: { operation: "progress-backup.restore" },
      });
    }
  }

  async hasSafetyCopy(): Promise<boolean> {
    const fileName = await this.query.readSafetyCopyFileName();
    return fileName ? this.files.hasSafetyCopy(fileName) : false;
  }

  async shareSafetyCopy(): Promise<void> {
    const fileName = await this.query.readSafetyCopyFileName();
    if (!fileName) {
      throw new Error("No previous progress backup is available");
    }
    await this.files.shareSafetyCopy(fileName);
  }
}

function hasSameProgress(
  left: ProgressBackupDocument,
  right: ProgressBackupDocument,
  installedDeckIds: ReadonlySet<string>
): boolean {
  return (
    sameRows(
      left.deckProgress,
      right.deckProgress,
      (row) => row.deckId,
      (first, second) =>
        first.lastReviewedAt === second.lastReviewedAt &&
        first.resolution === (installedDeckIds.has(first.deckId) ? "active" : "archived")
    ) &&
    sameRows(left.flashcardProgress, right.flashcardProgress, (row) => row.flashcardId) &&
    sameRows(left.flashcardMemoryStates, right.flashcardMemoryStates, (row) => row.flashcardId) &&
    sameRows(left.reviewEvents, right.reviewEvents, (row) => row.id)
  );
}

function sameRows<T>(
  left: readonly T[],
  right: readonly T[],
  id: (row: T) => string,
  equal: (first: T, second: T) => boolean = (first, second) =>
    JSON.stringify(first) === JSON.stringify(second)
): boolean {
  if (left.length !== right.length) {
    return false;
  }
  const byId = new Map(right.map((row) => [id(row), row]));
  return left.every((row) => {
    const other = byId.get(id(row));
    return other !== undefined && equal(row, other);
  });
}

function parseIncomingBackup(value: unknown) {
  if (
    typeof value === "object" &&
    value !== null &&
    "format" in value &&
    value.format === "flashcard-reels-progress" &&
    "version" in value &&
    typeof value.version === "number" &&
    value.version !== 1
  ) {
    throw new ProgressBackupVersionError(value.version);
  }
  const result = ProgressBackupDocumentSchema.safeParse(value);
  if (!result.success) {
    throw new ProgressBackupValidationError(result.error);
  }
  return result.data;
}
