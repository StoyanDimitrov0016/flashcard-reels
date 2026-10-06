import { queryOptions } from "@tanstack/react-query";

import type { ProgressBackupService } from "@/features/progress-backup/application/progress-backup.service";

import { queryScopes } from "@/shared/presentation/query/query-scopes";

type BackupServices = Readonly<{ progressBackupService: ProgressBackupService }>;

/** Whether a safety copy from the last restore exists. A restore is a progress change. */
export const progressBackupQueries = {
  safetyCopy: (services: BackupServices) =>
    queryOptions({
      queryKey: [...queryScopes.learningProgress, "safety-copy"],
      queryFn: () => services.progressBackupService.hasSafetyCopy(),
      throwOnError: false,
      meta: { errorReport: "Progress backup availability failure" },
    }),
};
