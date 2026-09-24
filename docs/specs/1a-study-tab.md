# 1a - Study tab with For you and Focus

Status: implemented; device acceptance pending.

## Problem and value

Discover and Focus are the same feed with a different scope: all decks or one deck. They
currently take two of the five bottom tabs. Combining them into one study tab with top tabs
follows a pattern learners already know from short-video apps. It keeps the feeds together as
the entry point and frees a bottom tab for reading in step 1b.

This step changes navigation only. The feeds, gestures, and learning behavior stay the same.

## Functional requirements

1. The first bottom tab is the study tab. At the top, it shows two tabs: **For you**, which is
   the current Discover feed, and **Focus**, which is the current Focus feed.
2. The study tab opens on For you.
3. Each feed keeps its own position. Switching between For you and Focus returns each feed to the
   card where it was left.
4. Focus opens the last focused deck, as the Focus tab does today. When no deck has been focused,
   it shows the existing empty state with its way to choose a deck.
5. Existing ways into Focus still work and open the study tab on Focus:
   - holding a deck in Library;
   - tapping the deck label on a card in For you, which shows that card in Focus.
6. The bottom bar has four tabs after this step: study, Library, Progress, and You. The freed slot
   is filled in step 1b.

## Non-functional requirements

- **Feed performance:** switching between For you and Focus feels instant and does not reload a
  feed that is already open.
- **Gesture clarity:** vertical swiping always moves through cards. A horizontal swipe does one
  predictable thing (see decisions).
- **Layout:** the top tabs and the deck label on each card stay readable, and neither covers the
  card content.

## Out of scope

- Any change to how feeds compose cards, how ratings work, or the learning engine.
- A new way to choose the focused deck. Library remains the place to choose one.
- The Reading tab (step 1b).

## Hard-to-reverse decisions

None. This is a navigation change, and navigation can be rearranged later.

## Acceptance

1. For you and Focus behave exactly as Discover and Focus did before, including session
   restoration after the app restarts.
2. Switching between For you and Focus preserves both positions.
3. Holding a deck in Library and tapping a card's deck label both land on Focus with the expected
   deck and card.
4. Focus with no chosen deck shows the empty state, and choosing a deck from it works.
5. The Maestro flows that navigate between tabs are updated and pass on the Android device.
6. `npm run check` and `npm test` pass in `apps/mobile`.

## Time budget

Proposed: three to five evenings, including device testing. Owner to confirm.

## Decisions

1. **Horizontal swipe:** keeps switching bottom destinations, as required by the mobile product
   invariants in `apps/mobile/AGENTS.md`. For you and Focus switch by tapping.
2. **Name and icon:** "Study", with a stacked-cards icon.
