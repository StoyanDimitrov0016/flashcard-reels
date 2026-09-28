# Visual system

## Two palettes

- **App palette:** navigation, surfaces, sheets, overlays, gesture chrome, and Study Island
  controls. It follows the Light, Dark, or Device setting and uses Notion-like neutrals tuned
  for WCAG AA: body and secondary text reach 4.5:1 on every surface, tertiary text and
  inactive icons 3:1. `apps/mobile/tests/unit/app-palette.test.ts` keeps those ratios.
- **Deck appearance:** card background, accent, question, answer, and secondary card text. Each
  deck uses one of ten curated presets with its own light and dark variants. Changing the app
  theme never changes a deck's identity.

Colors come from `@flashcard-reels/design-tokens`, shared by the app and the portal. Cards,
controls, sheets, and touch targets take their sizes and type from the shared `sizes`,
`fontSize`, and `fontWeight` tokens; see
[codebase preferences §16](codebase-preferences.md#16-styles-and-constants).

## Study feeds

- Feeds run full-bleed: the deck background extends under the status bar and the feed header.
- The feed header is a non-interactive indicator that follows the horizontal pager.
- Reel cards share a header, body, and footer structure.
- The Study Island sits left, right, or below a card and reserves its space instead of
  covering content. Rating direction changes the visual order, never the meaning of a rating.
- The audio and Reading buttons each have a side. When one side is empty, a matching space
  keeps the ratings centered.
- Haptics mark meaningful events only: rating, a successful hold-to-Focus, and a successful
  reset.

## Lists, settings, and recovery

- Settings and reading lists use grouped rows: one raised card per section, hairline dividers
  inset past the icon, and rows of at least 52 points. Destructive rows keep the shape and use
  the error color.
- Recovery screens have one title, a short explanation, and the relevant actions, with
  technical details collapsed.
- Use subheadings only for genuinely distinct groups. Avoid decorative pills, dot-separated
  labels, nested headings, and repeated explanations.

## Text

Backtick spans in card text render as inline code in a monospace face. Lesson Markdown uses the
`codeText` and `codeSurface` tokens.
