import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";

import type { PreparedProgressRestore } from "@/features/progress-backup/application/progress-backup.service";

import { useProgressBackup } from "@/features/progress-backup/presentation/dependencies/use-progress-backup";
import { progressBackupMutations } from "@/features/progress-backup/presentation/mutations/progress-backup-mutations";
import { getProgressBackupErrorFeedback } from "@/features/progress-backup/presentation/progress-backup-error-feedback";
import { progressBackupQueries } from "@/features/progress-backup/presentation/queries/progress-backup-queries";
import { showSuccessToast } from "@/shared/presentation/flashcard-toast";

export type { PreparedProgressRestore };

/** Backup actions run one at a time; the last failed action's message is shown. */
export function useProgressBackupController() {
  const services = useProgressBackup();
  const safetyCopy = useQuery(progressBackupQueries.safetyCopy(services));
  const exportBackup = useMutation(progressBackupMutations.export(services));
  const prepareRestore = useMutation(progressBackupMutations.prepareRestore(services));
  const restoreBackup = useMutation(progressBackupMutations.restore(services));
  const shareSafetyCopy = useMutation(progressBackupMutations.shareSafetyCopy(services));
  const [prepared, setPrepared] = useState<PreparedProgressRestore | null>(null);
  const actions = [exportBackup, prepareRestore, restoreBackup, shareSafetyCopy];
  const busy = actions.some((action) => action.isPending);

  let error: string | null = null;
  if (exportBackup.error) {
    error = getProgressBackupErrorFeedback(exportBackup.error, "export");
  } else if (prepareRestore.error) {
    error = getProgressBackupErrorFeedback(prepareRestore.error, "read");
  } else if (restoreBackup.error) {
    error = getProgressBackupErrorFeedback(restoreBackup.error, "restore");
  } else if (shareSafetyCopy.error) {
    error = getProgressBackupErrorFeedback(shareSafetyCopy.error, "share");
  }

  const startAction = () => {
    if (busy) {
      return false;
    }
    for (const action of actions) {
      action.reset();
    }
    return true;
  };

  return {
    busy,
    prepared,
    hasSafetyCopy: safetyCopy.data ?? false,
    error,
    exportProgress: () => {
      if (startAction()) {
        exportBackup.mutate();
      }
    },
    pickBackup: () => {
      if (startAction()) {
        prepareRestore.mutate(undefined, { onSuccess: setPrepared });
      }
    },
    restore: () => {
      if (!prepared || !startAction()) {
        return;
      }
      restoreBackup.mutate(prepared, {
        onSuccess: (replaced) => {
          setPrepared(null);
          showSuccessToast(
            replaced ? "Learning progress restored." : "Progress already matches this backup."
          );
        },
      });
    },
    shareSafetyCopy: () => {
      if (startAction()) {
        shareSafetyCopy.mutate();
      }
    },
    cancelRestore: () => {
      if (!busy) {
        setPrepared(null);
        restoreBackup.reset();
      }
    },
  };
}
