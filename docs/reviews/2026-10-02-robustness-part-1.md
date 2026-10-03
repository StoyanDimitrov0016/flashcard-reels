# Part 1 — shared decisions

Branch: `refactor/single-source-decisions`.

| Decision                                  |          Before definitions | After definitions |
| ----------------------------------------- | --------------------------: | ----------------: |
| Active sessions affected by a deck change |                           3 |                 1 |
| First editable position                   |                           2 |                 1 |
| Pending aggregation drain loop            |                           2 |                 1 |
| Required session lookup                   |                           3 |                 1 |
| Leading reel position                     |                           2 |                 1 |
| Backup format and version                 |                      3 each |            1 each |
| Rating values                             | 8 (including reverse order) |                 1 |
| Memory state values                       |                           4 |                 1 |
| Color modes                               |                           5 |                 1 |
| Island positions                          |                           5 |                 1 |
| Rating directions                         |                           4 |                 1 |
| Control sides                             |                           7 |                 1 |
| Cover keys                                |                           2 |                 1 |
| Import filename convention                |                           2 |          1 module |
| Recurring ratings                         |                           2 |                 1 |
| Open-session result shape                 |                           2 |                 1 |

The SQLite integration test covers first-install versus reinstall settlement, an unrelated
Focus session, and preservation of completed sessions. Existing installation, reset, aggregation,
feed, recurrence, preference, and backup tests retain their assertions.

Validation: mobile `npm run check`, `npm test`, `npm run db:check`, and `npm run db:generate`.
Generation reports no schema changes; migration files and the baseline are unchanged.

## Deviations

- `schema.ts` CHECK expressions can consume the domain lists with byte-identical generated SQL;
  the fallback test is unnecessary.
- `study-control-layout.ts` derives reverse order with a reducer: the configured TypeScript
  library does not expose `toReversed`, and lint forbids mutating `reverse`.
- The database permits only one active session per scope. The new settlement test runs matching
  and unrelated Focus cases separately instead of constructing impossible simultaneous sessions.
