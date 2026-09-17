import { Directory, File, Paths } from "expo-file-system";
import { defaultDatabaseDirectory } from "expo-sqlite";
import { Platform } from "react-native";

import { RecoveryError } from "@/infrastructure/errors/recovery-error";

const RESET_MARKER = "flashcard-reels-reset-pending";
const DATABASE_FILES = ["flashcard-reels.db", "ExpoSQLiteStorage"];
let storagePrepared = false;

/** Root retries must not apply a new request while storage is already open. */
export function prepareAppStorage(): void {
  if (!storagePrepared) {
    try {
      applyPendingAppDataReset();
      storagePrepared = true;
    } catch (cause) {
      throw cause instanceof RecoveryError
        ? cause
        : new RecoveryError({
            cause,
            code: "APP_RESET_APPLY_FAILED",
            context: { operation: "apply-pending-reset" },
            message: "The pending app-data reset could not be applied",
          });
    }
  }
}

function resetMarker(): File {
  return new File(Paths.document, RESET_MARKER);
}

/** Persist outside SQLite so recovery also works when a database cannot open. */
export function requestAppDataReset(): void {
  if (Platform.OS === "web") {
    throw new RecoveryError({
      code: "APP_RESET_UNSUPPORTED",
      message: "Full reset is available in the Android and iOS app",
    });
  }
  try {
    resetMarker().write("reset");
  } catch (cause) {
    throw new RecoveryError({
      cause,
      code: "APP_RESET_REQUEST_FAILED",
      context: { operation: "write-reset-marker" },
      message: "The app-data reset could not be scheduled",
    });
  }
}

/** Run before opening any database. Keep the marker if any step fails. */
export function applyPendingAppDataReset(): void {
  if (Platform.OS === "web") {
    return;
  }
  try {
    const marker = resetMarker();
    if (!marker.exists) {
      return;
    }
    for (const name of DATABASE_FILES) {
      for (const suffix of ["", "-wal", "-shm", "-journal"]) {
        const file = new File(defaultDatabaseDirectory, name + suffix);
        if (file.exists) {
          file.delete();
        }
      }
    }
    const audio = new Directory(Paths.document, "deck-audio");
    if (audio.exists) {
      audio.delete();
    }
    for (const entry of Paths.cache.exists ? Paths.cache.list() : []) {
      if (entry instanceof File && /^deck-import-.*\.fcrdeck$/.test(entry.name)) {
        entry.delete();
      }
    }
    marker.delete();
  } catch (cause) {
    throw new RecoveryError({
      cause,
      code: "APP_RESET_APPLY_FAILED",
      context: { operation: "apply-pending-reset" },
      message: "The pending app-data reset could not be applied",
    });
  }
}
