import { mutationOptions } from "@tanstack/react-query";

import type {
  PreparedProgressRestore,
  ProgressBackupService,
} from "@/features/progress-backup/application/progress-backup.service";

import { invalidateChangedData } from "@/shared/presentation/query/query-scopes";

type BackupServices = Readonly<{ progressBackupService: ProgressBackupService }>;

/**
 * Backup actions. Screens map their failures to messages per action; failures are reported here.
 * Export and restore invalidate progress even when they fail, as either may have written.
 */
export const progressBackupMutations = {
  export: (services: BackupServices) =>
    mutationOptions({
      mutationKey: ["progress-backup", "export"],
      mutationFn: () => services.progressBackupService.exportProgress(),
      onSettled: (_result, _error, _variables, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["learning-progress"]);
      },
      meta: { errorReport: "Progress export failure" },
    }),
  prepareRestore: (services: BackupServices) =>
    mutationOptions({
      mutationKey: ["progress-backup", "prepare-restore"],
      mutationFn: () => services.progressBackupService.prepareRestore(),
      meta: { errorReport: "Progress backup validation failure" },
    }),
  restore: (services: BackupServices) =>
    mutationOptions({
      mutationKey: ["progress-backup", "restore"],
      mutationFn: (prepared: PreparedProgressRestore) =>
        services.progressBackupService.restore(prepared),
      onSettled: (_result, _error, _prepared, _onMutateResult, { client }) => {
        void invalidateChangedData(client, ["learning-progress"]);
      },
      meta: { errorReport: "Progress restore failure" },
    }),
  shareSafetyCopy: (services: BackupServices) =>
    mutationOptions({
      mutationKey: ["progress-backup", "share-safety-copy"],
      mutationFn: () => services.progressBackupService.shareSafetyCopy(),
      meta: { errorReport: "Previous progress backup sharing failure" },
    }),
};
