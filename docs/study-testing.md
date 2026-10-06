# Study flow testing

There are two study scopes, Discover and Focus, over the same SQLite learner state and learning
engine. Starting Focus, holding a Discover card, resuming, retrying, and rebuilding after a write
are lifecycle scenarios, not separate schedulers.

## Behavioral coverage

| Scenario                                                                                   | Automated boundary                                                                                                                                           | Native boundary                                                            |
| ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| Discover resumes its current position; furthest position does not move backward            | `feed-preparation.lifecycle.test.ts`, `study-session.integration.test.ts`                                                                                    | `discover-hold-to-focus.yaml`                                              |
| New Focus starts once; remounts and error retries retain its session, position, and rating | `feed-preparation.lifecycle.test.ts`                                                                                                                         | `focus-resume.yaml`                                                        |
| Holding a Discover card starts Focus at that card                                          | `feed-preparation.lifecycle.test.ts`, `hold-to-focus.test.ts`, `focus-state.test.ts`                                                                         | `discover-hold-to-focus.yaml`                                              |
| Focus resumes or expires on foreground; Discover remains independent                       | `focused-feed-foreground.lifecycle.test.ts`, `study-session.integration.test.ts`                                                                             | `focus-resume.yaml`, `discover-hold-to-focus.yaml`                         |
| Flip, rate, revise within the editable window, commit outside it, and extend the feed      | `recall-controls.test.ts`, `reel-controller.lifecycle.test.ts`, `study-feed.integration.test.ts`, `learning-engine.integration.test.ts`                      | `focus-resume.yaml`, archived-progress flows                               |
| Reset, remove, reinstall, or restore invalidates affected study state                      | `learning-progress-reset.integration.test.ts`, `deck-deletion.lifecycle.test.ts`, `paused-progress.lifecycle.test.ts`, `progress-backup.integration.test.ts` | archived-progress flows, `progress-backup-transfer.yaml`                   |
| Connected lessons preserve the study moment and select the correct section                 | `lesson-reference-navigation.test.ts`, `lesson-reader.test.ts`, `lessons.integration.test.ts`                                                                | `lesson-section-references.yaml`, `discover-hold-to-focus.yaml`            |
| Backup actions reject simultaneous taps and remain exclusive across screen remounts        | `progress-backup.lifecycle.test.ts`                                                                                                                          | `progress-backup-transfer.yaml` covers native picker/share and restoration |

The filenames in the automated column are under `apps/mobile/tests/unit` or
`apps/mobile/tests/integration`. Native flows are under `apps/mobile/.maestro` and run through
`apps/mobile/scripts/run-maestro.ps1`.

`reel-pager.test.ts` additionally covers native startup event ordering: partial restored pages
stay hidden, initial momentum cannot change the saved study position, and normal paging resumes
after drawing and alignment finish. A fresh Expo Go **Reload** restarts JavaScript and must also
be checked on-device; it is distinct from remounting a screen with a surviving query cache.

## What each layer proves

- Unit tests protect app policies: hold transitions, editable windows, recurrence placement,
  selection, and navigation decisions. Do not duplicate FSRS mathematics or generic Markdown
  rendering assertions.
- Integration tests exercise public services and React hooks with real SQLite and a real query
  client. Replace native file pickers, sharing, and device events at their boundaries. Assert
  persisted reviews, active session identity, current/furthest position, resulting feed content,
  and failure recovery. Use deferred promises to reproduce races rather than timing guesses.
- Maestro tests exercise the installed app's native pager, gestures, recycled cards, sheets,
  foreground transitions, and cold launches. These are end-to-end tests; jsdom hook tests cannot
  establish native behavior. Use a current APK with embedded JavaScript, not an old installed APK.

Tests that use a real package to exercise our contract remain useful. For example, rejecting an
invalid deck archive protects our importer, and retaining a rating after remount protects our
query integration. A query deduplication call count or a demonstration that memory probability
decreases over time only repeats a package guarantee. Prefer the app outcome it was intended to
protect.

## Query lifecycle decisions

[TanStack Query's defaults](https://tanstack.com/query/latest/docs/framework/react/guides/important-defaults)
distinguish `Infinity` (fresh until invalidated) from `static` (blocks automatic refetch even after
invalidation). The one-time Focus start caches only its session identity as static. Feed snapshots
reload on mount, without replaying that start. Automatic focus/reconnect refetch is disabled for
these snapshots; the Focus owner evaluates foreground lifecycle explicitly.

A cached snapshot must not initialize a mounted reel controller while its current snapshot is
loading. The remount regression covers both the loading interval and the final position.

The native `ReelPager` owns list restoration behind the existing `ReelFeed` interface. It uses
[FlashList's `onLoad`](https://shopify.github.io/flash-list/docs/usage#onload) and native offset
events to keep measurement frames hidden until the saved full-height page is aligned. Startup
momentum events are not study navigation. Screens and the study controller do not own this
measurement protocol.

[Mutation filters](https://tanstack.com/query/latest/docs/framework/react/guides/filters)
group backup actions under one key prefix. Read the pending count synchronously with
`queryClient.isMutating` when deciding whether another action may start; use `useIsMutating` for
rendered busy state. Checking a rendered `isPending` or `busy` alone leaves a same-frame race.

## Running the checks

From the repository root:

```powershell
npm.cmd run check -w @flashcard-reels/mobile
npm.cmd test -w @flashcard-reels/mobile
```

These checks run in CI. For device flows, follow
[the Maestro setup](maestro-device-run-handoff.md), build or obtain a current APK, and run:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File apps/mobile/scripts/run-maestro.ps1 -ApkPath C:\path\to\flashcard-reels.apk
```

The October 6 query regressions were verified through React and SQLite. The new `focus-resume`
and `discover-hold-to-focus` flows have not yet been run on a device; this implementation
environment has no Android SDK, Maestro CLI, or generated native project. The runner now also
includes the existing lesson-section flow, which previously was omitted.

For future reel changes, select the affected rows of the matrix, add a regression for the app
decision being changed, and run the mobile suite. Run the corresponding native scenarios whenever
the change affects gestures, lifecycle, pager mounting, recycling, or native presentation.
