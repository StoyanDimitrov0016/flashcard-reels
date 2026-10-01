import type { PreparedReelFeed } from "@/features/study/domain/study-feed";

export type ShareFeedRequest = (
  prepare: () => Promise<PreparedReelFeed>
) => Promise<PreparedReelFeed>;

/**
 * Opening Focus for a deck replaces its session, so it must run once per start even when the
 * feed remounts while it is still preparing. Each start revision keeps its one preparation; a
 * failed one is dropped so that retrying starts again.
 */
export function createFocusStartRequests() {
  const requests = new Map<number, Promise<PreparedReelFeed>>();

  return {
    share: (revision: number, prepare: () => Promise<PreparedReelFeed>) => {
      const existing = requests.get(revision);
      if (existing) {
        return existing;
      }
      const request = prepare();
      // Only the latest start can still be showing.
      requests.clear();
      requests.set(revision, request);
      request.catch(() => {
        if (requests.get(revision) === request) {
          requests.delete(revision);
        }
      });
      return request;
    },
  };
}
