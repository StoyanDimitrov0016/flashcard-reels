import { queryOptions } from "@tanstack/react-query";

import type { DecksCapability } from "@/features/decks/presentation/dependencies/use-decks";

import { queryScopes } from "@/shared/presentation/query/query-scopes";

type SavedProgressServices = Pick<DecksCapability, "savedProgressService">;

/**
 * Progress kept for decks that are not installed, or paused after a reinstall. Screens show these
 * failures in place rather than in a route boundary, so the queries do not throw.
 */
export const savedProgressQueries = {
  paused: (services: SavedProgressServices) =>
    queryOptions({
      queryKey: [...queryScopes.savedProgress, "paused"],
      queryFn: () => services.savedProgressService.listPendingProgress(),
      throwOnError: false,
      meta: { errorReport: "Paused progress load failure" },
    }),
  archived: (services: SavedProgressServices) =>
    queryOptions({
      queryKey: [...queryScopes.savedProgress, "archived"],
      queryFn: () => services.savedProgressService.listArchivedProgress(),
      throwOnError: false,
      meta: { errorReport: "Archived progress load failure" },
    }),
};
