import { AppError } from "@/shared/errors/app-error";
import { getErrorFeedback } from "@/shared/presentation/errors/get-error-feedback";

type BackupAction = "export" | "read" | "restore" | "share";

export function getProgressBackupErrorFeedback(error: unknown, action: BackupAction): string {
  if (error instanceof AppError) {
    switch (error.code) {
      case "PROGRESS_BACKUP_INVALID":
        return getErrorFeedback(error).message;
      case "PROGRESS_BACKUP_TOO_LARGE":
        return action === "export"
          ? "Your progress exceeds the supported backup size."
          : "That progress backup is too large to import.";
      case "PROGRESS_BACKUP_VERSION_UNSUPPORTED":
        return getErrorFeedback(error).message;
      case "PROGRESS_BACKUP_READ_FAILED":
        return getErrorFeedback(error).message;
      case "PROGRESS_BACKUP_EXPORT_FAILED":
        return getErrorFeedback(error).message;
      case "PROGRESS_BACKUP_RESTORE_FAILED":
        return getErrorFeedback(error).message;
      default:
        // Other app errors get the action's generic message below.
        break;
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
