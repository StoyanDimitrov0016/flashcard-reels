import { AppError } from "@/shared/errors/app-error";

type BackupAction = "export" | "read" | "restore" | "share";

export function getProgressBackupErrorFeedback(error: unknown, action: BackupAction): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case "PROGRESS_BACKUP_INVALID":
        return "That progress backup is invalid or damaged. Choose another file.";
      case "PROGRESS_BACKUP_TOO_LARGE":
        return action === "export"
          ? "Your progress exceeds the supported backup size."
          : "That progress backup is too large to import.";
      case "PROGRESS_BACKUP_VERSION_UNSUPPORTED":
        return "This app cannot read that progress backup version.";
      case "PROGRESS_BACKUP_READ_FAILED":
        return "Could not prepare the backup preview. Try again.";
      case "PROGRESS_BACKUP_EXPORT_FAILED":
        return "Could not export progress. Your learning data is still on this device.";
      case "PROGRESS_BACKUP_RESTORE_FAILED":
        return "Could not replace progress. Current progress is still on this device.";
    }
  }

  switch (action) {
    case "export":
      return "Could not export progress. Your learning data is still on this device.";
    case "read":
      return "Could not read that progress backup. Choose another file.";
    case "restore":
      return "Could not replace progress. Current progress is still on this device.";
    case "share":
      return "Could not share the previous progress backup.";
  }
  return "Could not complete the progress backup operation.";
}
