# Robustness pass: final review (Claude)

Reviewed Parts 5b–8 on `chore/names-and-dead-members`. Full validation passes:

- root `check`, `test` (467 mobile, 40 web, 31 deck-contract), and `check:dead-code`;
- mobile `db:check` and `decks:check`.

The design conditions are met: the service keeps no attempt cache, there is one session queue,
materialization runs outside it, and a plain activation keeps the feed object. Part 9 below fixes
what the review found.

## Part 9: final review follow-ups

Branch `fix/robustness-final-followups` from `chore/names-and-dead-members`, one commit:
`fix(mobile): address the final robustness review`. Follow the spec's rules, including rule 5
(test first) and rule 9 (root checks).

1. **A plain activation discards an in-flight feed snapshot.**
   - `useReelController` increments `sequence` for every request and applies a result only when
     `started === sequence.current`.
   - An activation that returns `snapshot: null` still increments it. So an extension or refresh
     already in flight is discarded when the learner swipes again before it resolves. Swiping
     quickly near the end of the loaded window therefore drops the new reels until the
     end-reached trigger loads them again.
   - Keep issuing sequence numbers, but record the last applied one: apply a snapshot only when
     `started > applied.current`, then set `applied.current = started`. Requests that return no
     snapshot never block an older one.
   - Test: start an extension, run a plain activation that resolves first, then resolve the
     extension. Its reels appear.
2. **Feed rebuilds only when the feed changes.**
   - `rateCard` always returns a snapshot, so every rating rebuilds the feed and replaces the feed
     object. Before Part 6, the controller refreshed only when the previous or new rating brings
     the card back.
   - `activateCard` builds a snapshot whenever any committed attempt has a rating, including Good
     and Easy, which change nothing the loaded feed shows. For a learner who rates each card,
     that is almost every swipe.
   - Restore a domain rule in `study/domain/recurrences.ts`, derived from
     `INTRA_SESSION_RECURRENCE_CONFIG`: does this rating bring the card back?
   - `rateCard` returns a snapshot only when the attempt's previous or new rating brings it back.
     Otherwise it returns `snapshot: null` with the saved rating, and the controller updates only
     its rating map.
   - `activateCard` returns a snapshot only when it consumed a recurrence, or committed an attempt
     whose rating brings the card back.
   - Test: rating Good on a new card and activating past a committed Good both return
     `snapshot: null`. Again does return a snapshot.
3. **Study and reels import each other.**
   - `study.service.impl.ts` imports `ReelFeedServiceImpl`, `reel-extension-policy`, and
     `reel-position-extension` from reels.
   - `study.service.ts` imports `PreparedReelFeed` from reels.
   - Reels imports study ports and `study-session-operations`.

   Make the dependency one way: reels is presentation only and depends on study.
   - Move `reels/application/*` and `reels/domain/*` into `study`, for example
     `study/application/feed-materializer.ts` with class `FeedMaterializer`,
     `study/application/feed-extension-policy.ts`, and `study/domain/study-feed.ts` for the
     prepared feed types and `feed-engine.ts`.
   - Update imports, composition, and tests.

   Done when searching `features/study` for `@/features/reels` finds nothing and
   `features/reels` contains only `presentation`.

4. **Encoding.**
   - Ten files start with a UTF-8 byte order mark. Find them with
     `git grep -lI $'^\xEF\xBB\xBF'`, and remove the BOM.
   - `docs/reviews/2026-10-02-robustness-part-7.md` shows `â†’` where `→` should be; fix it.
   - Write files as UTF-8 without a BOM from now on.
5. **Readability.** `study.service.impl.ts`, `study.service.ts`, and `use-reel-controller.ts`
   have no blank lines between declarations, class members, or hooks. Add one blank line between
   top-level declarations, class members, and hook blocks, matching the rest of the codebase.

Report the before/after counts for items 1–3 and any Deviations.

## Not changed

These were reviewed and stay as they are:

- the two public delegations, `resumeFocusedSession` and `settleForProgressBackup`;
- the five specialized loaders kept in Part 7;
- the twenty qualified names kept in Part 8.

`useAsyncLoad` depends on its callers passing stable `load`, `initialData`, and `onError`, which
the React Compiler provides. Keep it in mind when adding callers outside compiled code.
