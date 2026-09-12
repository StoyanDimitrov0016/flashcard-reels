# Visual system

Flashcard Reels separates application chrome from learning content.

## Application palette

`src/shared/presentation/theme-colors.ts` is the single source of truth for the light and dark application palettes, built from the dependency-light identity foundation in `src/shared/foundation/native-identity.json`. `useAppTheme()` resolves the active scheme and exposes semantic roles for the canvas, navigation, surfaces, text, borders, interaction, overlays, sheets, and recall actions. App screens, navigation, settings, sheets, gesture chrome, and Study Island controls consume these roles rather than deck colors. `app.config.ts` uses the same foundation for splash and adaptive-icon launch surfaces.

## Deck appearance

Deck appearance is one persisted `presetId`, not editable raw colors. The ten curated presets are Graphite, Gold, Orange, Rose, Violet, Blue, Cyan, Emerald, Lime, and Stone. Each preset defines intentional light and dark variants containing a background, accent, primary text, and secondary text. The saved ID stays unchanged when the app switches between Light, Dark, or Device; `resolveDeckAppearance()` selects the matching variant at render time.

Newly imported decks default to `graphite`. The bundled demo deck is configured as `gold`. The `.fcrdeck` package format does not contain app appearance data.

## ReelCard composition

Each card face uses a normal Header / Body / Footer flex composition. The front body contains the question and reveal instruction. The back body is composed by `AnswerBodyLayout` from answer copy and a Study Control region.

The Study Island is a normal layout sibling of answer content:

- left places vertical controls before the answer and reserves their width;
- right places vertical controls after the answer and reserves their width;
- bottom places horizontal controls below the answer and above the Gesture Footer.

The horizontal island uses the named `sizes.study.horizontalIsland` rule: it occupies 80% of the bottom control region and is capped at 360 points, centered by its parent. It never overlays answer text or stretches beyond that bound. Side islands use the stable `sizes.study.sideControlRegion` width. `StudyControlCluster` owns only the local recall/audio composition; its parent owns placement.

Shared touch targets, controls, inputs, answer width, sheet widths, and Study Island geometry are defined in `src/shared/presentation/sizes.ts`; component StyleSheets use those tokens for composition.

`AppBottomSheet` is the shared sheet contract. Callers select `content`, `half`, `full`, or `half-full`; the wrapper maps those semantic sizes to Expo dynamic sizing or supported snap points.

`StudyControlLayoutContext` carries only resolved presentation configuration. `resolveStudyControlLayout()` is shared by the real card and the Study Controls preview, while rating state, callbacks, audio source, and active-session state remain explicit props.

## Color ownership

Deck palette colors own the card background, header accent, question, answer, and secondary card copy. The application palette owns Study Island surfaces and borders, generic controls, gesture footer chrome, navigation, sheets, and overlays.

## Discover to Focus continuity

The Focus handoff preserves `{ cardId, recallLevel, revealed }`. Focus opens on the same card, side, and selected rating. `revealed` is authoritative; ReelCard rotation is only its visual projection and synchronizes on external state changes and recycled occurrences. A rated card can return to its question side without losing its selected rating.
