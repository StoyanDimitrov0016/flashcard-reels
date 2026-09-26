import { AppError } from "@/shared/errors/app-error";

export class ProgressBackupValidationError extends AppError {
  constructor(cause?: unknown) {
    super({
      name: "ProgressBackupValidationError",
      code: "PROGRESS_BACKUP_INVALID",
      message: "The progress backup is invalid or damaged",
      cause,
    });
  }
}

export class ProgressBackupVersionError extends AppError {
  constructor(version: number) {
    super({
      name: "ProgressBackupVersionError",
      code: "PROGRESS_BACKUP_VERSION_UNSUPPORTED",
      message: "The progress backup version is unsupported",
      context: { version },
    });
  }
}

export class ProgressBackupTooLargeError extends AppError {
  constructor() {
    super({
      name: "ProgressBackupTooLargeError",
      code: "PROGRESS_BACKUP_TOO_LARGE",
      message: "The progress backup exceeds the supported file size",
    });
  }
}
