# 1a - Study feeds with a For you and Focus header

Status: implemented; verified on the Android emulator in Expo Go.

## Problem and value

Discover and Focus are the same feed with a different scope: all decks or one deck. Learners
move between app destinations by swiping sideways, and that gesture must keep reaching both feeds.
A short-video-style header names the two feeds so learners know which scope they are in, and
the two feeds share one bottom-bar item so the bar has room for Reading.

## Functional requirements

1. Horizontal swipes move through the destinations in this order: For you (the Discover scope),
   Focus, Reading, Library, Progress, and You.
2. A fixed header over the two feeds shows **For you** and **Focus**. It is not interactive. Its
   underline and emphasis follow the swipe, and it fades out while swiping on to Reading.
3. The bottom bar has five items: Study, Reading, Library, Progress, and You. Study is active on
   both feeds and opens For you when tapped.
4. Cards run full-bleed under the status bar and header, with their content starting below the
   header.
5. Existing ways into Focus still work: holding a deck in Library, holding a For you card, and
   tapping a card's deck label.

## Non-functional requirements

- **Gesture clarity:** vertical swipes move through cards, and horizontal swipes move between
  destinations. The header never intercepts touches.
- **Performance:** the header animates on the native driver from the pager position.
- **Layout:** the header labels and each card's deck label never overlap.

## Out of scope

- Any change to how feeds compose cards, how ratings work, or the learning engine.
- A new way to choose the focused deck. Library remains the place to choose one.

## Hard-to-reverse decisions

None. This is a navigation change.

## Acceptance

1. Swiping from For you reaches Focus and then Reading, with the header underline following and
   the header gone on Reading.
2. Holding a Library deck opens Focus on that deck.
3. Focus with no chosen deck shows its empty state.
4. `npm run check` and `npm test` pass in `apps/mobile`.

## Decisions

1. The header is an indicator, not a control, because swiping is the navigation gesture.
2. The Study bottom item covers both feeds and uses a stacked-cards icon.
