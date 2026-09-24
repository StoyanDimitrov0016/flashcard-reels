# Visual system

Recovery UI uses one contextual title, a short explanation, and relevant actions. Technical details remain collapsed. Use subheadings only to separate genuinely distinct groups; avoid decorative pills, dot-separated labels, nested headings, and repeated explanations. Controls groups related settings and places reset alongside other data actions.

Flashcard Reels separates application chrome from deck content.

The application palette owns navigation, generic surfaces, sheets, overlays, gesture chrome, and Study Island controls. Deck appearance owns the card background, accent, question, answer, and secondary card copy.

Decks select one of ten curated appearance presets. Each preset includes intentional light and dark variants, and the selected preset remains stable when the device or app theme changes.

Reel cards use a consistent header, body, and footer structure. The Study Island reserves space beside or below answer content instead of covering it. Shared sizing and typography tokens keep cards, controls, sheets, and touch targets consistent across the mobile UI.

The web portal uses the same product identity through the shared design-token package while adapting the layout for catalog browsing and card inspection.

Study feeds run full-bleed: the deck background extends under the status bar and the For you and
Focus header, which is a non-interactive indicator that follows the horizontal pager. Settings and
reading lists use grouped rows: one raised card per section, hairline dividers inset past the
icon, and rows of at least 52 points. Destructive rows keep the same shape and use the error color.

Card text renders backtick spans as inline code in a monospace face. Lesson Markdown uses the
`codeText` and `codeSurface` tokens for inline code.

The app palette follows Notion's neutrals, tuned for WCAG AA: body and secondary text reach 4.5:1
on every surface, and tertiary text and inactive icons reach 3:1. The palette test in
`apps/mobile/tests/unit/app-palette.test.ts` keeps those ratios.
