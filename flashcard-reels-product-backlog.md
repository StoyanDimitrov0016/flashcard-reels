# Flashcard Reels — Product Backlog

This document preserves product ideas that are intentionally **not part of the current implementation stage**. Items here are candidates for later refinement; their presence does not imply priority or commitment.

The purpose is to prevent useful ideas from being lost without allowing them to expand the active stage.

## 1. Core-adjacent UX Enhancements

### Contextual Focus Handoff

From a card shown in Discover, expose a small deck/topic affordance near the card header/front surface.

User flow:

1. User is scrolling Discover.
2. A card from deck/topic Z is especially interesting.
3. User taps the deck/topic affordance.
4. Application navigates directly to Focus.
5. Focus opens that deck.
6. Default Focus strategy is Shuffle.

Goals:

- reduce friction between discovery and intentional study;
- preserve the “learning is already happening” product philosophy;
- avoid requiring the user to navigate to Library and find the deck manually.

This should use the existing Focus session lifecycle rather than creating a separate study mode.

Potential naming: contextual Focus handoff, Focus this deck, Study this topic.

Priority: high-value polish after core learning/profile engine.

### Audio Playback Control

Simplified card audio control:

- one button below/near recall controls;
- Play when idle;
- Pause while playing;
- when audio finishes, button returns to Play;
- subsequent Play starts from beginning.

Manual playback by default. No long-press restart requirement.

### Card / Reel Transition Direction Preference

Allow future customization of card/reel animation direction or navigation orientation where this improves language/topic workflows.

This belongs to user preferences, not learner progress.

Potential future home:

- Settings → Gestures & Navigation
- Settings → Learning Experience

Exact behavior still requires product design before implementation.

### Contextual Library → Progress Navigation

From a deck in Library, open Progress already filtered to that deck. Reuse the top-level Progress feature rather than duplicating profile UI inside Library.

## 2. Settings / Preferences

Create a dedicated Settings destination only when enough real preferences exist.

Potential settings:

- reel/card navigation direction;
- animation/flip direction;
- audio playback defaults;
- Focus inactivity timeout if user-configurable;
- appearance/theme behavior;
- gesture preferences.

Do not combine Settings with Progress.

Progress answers: “What has the app learned about me?”

Settings answers: “How should the app behave?”

## 3. Deck Appearance and Personalization

### Curated Deck Palettes

Keep appearance separate from deck content.

Potential behavior:

- curated palette presets;
- refined/Tailwind-inspired colors;
- guaranteed readable foreground/background contrast;
- users may reuse the same palette across multiple decks;
- imported/marketplace decks may be overridden locally without mutating content.

Avoid arbitrary color-picker complexity initially.

## 4. Focus Enhancements

### Multi-deck Focus

Allow a Focus scope to include a selected subset of decks instead of exactly one deck.

Preserve Shuffle. Ordered across multiple decks requires separate semantics before implementation.

### Additional Focus Entry Points

Potential entry points:

- Discover card → Focus this deck;
- Library deck → Focus;
- Progress deck → Focus;
- search results → Focus.

All entry points should converge on the same Focus session/application API.

## 5. Richer Learning Intelligence

Explicitly beyond Stage 3:

- Good/Easy long-distance scheduling;
- exact due dates;
- memory stability/difficulty;
- FSRS evaluation;
- richer recent-performance signals;
- profile-aware recency policy;
- richer learner states;
- user-facing advanced learning insights/statistics.

Avoid introducing these until simple Stage 3 adaptive behavior has been used and evaluated.

## 6. Progress / Insights Enhancements

After the Stage 3 Progress tab proves useful:

- deck summaries;
- trend views;
- recently improved cards;
- cards needing attention;
- historical charts;
- optional mastery-like concepts only if they have honest semantics;
- export/reset controls;
- richer explanation of adaptive priority.

Avoid gamification metrics unless they directly improve learning.

## 7. Content Authoring and Ordering

### Manual Card / Deck Authoring

Low priority because current content is primarily AI-generated.

Potential later capabilities:

- create deck;
- create/edit card;
- delete card;
- insert card at a position.

### Drag-and-drop Card Ordering

Explicit `deckPosition` already exists.

Future authoring requirements:

- moving a card updates positions transactionally;
- inserting shifts following cards;
- deleting compacts positions;
- gapless ordering invariant remains enforced.

## 8. Card Content Versioning

Deferred architecture topic.

Potential future requirements:

- stable logical flashcard identity;
- immutable content revisions;
- current revision pointer;
- decide whether learner history attaches to logical card or exact content revision;
- prepared reels may preserve exact revision rather than only card identity.

Revisit before editable/import-replacement workflows become central or before sophisticated long-term scheduling depends on content identity.

## 9. Web / Marketplace / Sync

Potential future Next.js/web layer:

- browser authoring;
- marketplace/discovery of decks;
- import;
- account sync;
- backup/restore;
- web-based management.

The mobile local-first learning experience remains the core product. Marketplace/social discovery must not turn the main mobile feed into a social network.

## 10. Import / Export

Potential convenience features:

- import decks from supported formats;
- export deck content;
- export learner progress;
- backup local data;
- restore local data.

Define content and learner-state portability separately.

## 11. Search and Library Refinement

Potential improvements:

- deck search;
- card search;
- tags;
- filtering;
- sort options;
- recently used decks;
- pinned/favorite decks.

These are library-management conveniences rather than core learning-engine requirements.

## 12. Product Documentation Rule

When a new feature idea appears during active-stage work:

1. Decide whether it is required to satisfy the current stage's core invariant.
2. If yes, add it to the current stage specification.
3. If no, add it to this Product Backlog.
4. Do not implement backlog features opportunistically while working on unrelated stages.

This keeps implementation scope controlled without losing useful product ideas.
