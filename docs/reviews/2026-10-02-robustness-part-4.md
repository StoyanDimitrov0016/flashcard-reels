# Part 4 — async overlap

Branch: `fix/async-races`.

| Signal                                            | Before | After |
| ------------------------------------------------- | -----: | ----: |
| Feed-state writes from append                     |      1 |     0 |
| Unguarded feed-load replacement sites             |      2 |     0 |
| Action guards relying on rendered busy state      |      3 |     0 |
| Hand-written import/delete action lifetime guards |      2 |     0 |
| Trailing Focus evaluations retained during a load |      0 |     1 |

Tests first reproduced a visible-card write being overwritten during materialization, a slow
refresh replacing a newer extension, two paused-progress continuations starting before a render,
and a dropped foreground event. All now pass. The shared action hook also checks failure recovery,
duplicate runs before rendering, and calls after unmount. Existing deletion/import lifecycle tests
retain their assertions, including cancellation, late-file cleanup, and global invalidation.

Validation: mobile check, full tests, and db:check. No migration or baseline change.

## Async controller guards

| Controller                                 | Guard                                                                                                                                          |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| useReelController                          | One feed-load sequence, extension promise, activation queue, pending rating set, attempt-start map; ended-session latch; rating-toast lifetime |
| useFocusedFeedLifecycle                    | Disposed effect plus one in-flight evaluation and one trailing request                                                                         |
| usePreparedReelFeed                        | Request identity plus effect activity flag                                                                                                     |
| useRecallSession                           | Effect activity flag and retained reel range                                                                                                   |
| usePausedDeckProgress                      | Load sequence and shared single-flight action; toast lifetime                                                                                  |
| useDeleteDeck                              | Shared single-flight action; success result suppressed after unmount                                                                           |
| useImportDeckPackage                       | Shared single-flight action; AbortController; late selection/result checks                                                                     |
| useImportDeckSheet                         | Scan-session sequence, scan lock, retry lock, permission-effect activity flag                                                                  |
| useDeckDetails                             | Effect activity flag, including progress read after deck/card load                                                                             |
| useDeckCatalog                             | Effect activity flag                                                                                                                           |
| useDeckCollection                          | Effect activity flag                                                                                                                           |
| useDeckThemeSelections                     | Effect activity flag                                                                                                                           |
| useFlashcards                              | Effect activity flag                                                                                                                           |
| useFlashcardProgressList                   | Effect activity flag                                                                                                                           |
| useReadingLists                            | Effect activity flag                                                                                                                           |
| useLesson                                  | Effect activity flag and request ID/revision comparison                                                                                        |
| useArchivedProgress                        | Load sequence; screen-specific controller left outside this part                                                                               |
| useProgressBackupController                | In-flight ref; availability-load activity flag; outside this part                                                                              |
| useSaveDeckThemeSelection                  | Existing latest-save policy retained                                                                                                           |
| useResetDeckProgress / useResetAllProgress | Screen uses shared single-flight action; post-write global invalidation remains                                                                |
| Preferences provider                       | Load activity flag and serialized write queue                                                                                                  |

## Deviations

- `SQLiteStudySessionFeedTransaction.append` checks session activity with a SELECT inside its
  SQLite transaction before inserting reels. It no longer needs a no-op UPDATE to guard activity.
- `useSingleFlight` additionally exposes `isActive`, letting consumers suppress toast/navigation
  results without duplicating mounted refs. State updates after unmount remain harmless.
- `deck-delete-lifecycle.test.ts` mocked all state slots as one value and lacked `useCallback`.
  The mock now keeps slots distinct; every existing behavior assertion remains unchanged.
- The append rollback test drops its removed feed-state argument and keeps its rollback assertions.
