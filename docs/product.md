# Product

Flashcard Reels is a local-first study app for technical knowledge. It borrows the pace of a
swipeable video feed, but the interaction stays centered on active recall: read a question,
recall the answer, reveal it, and rate yourself.

There are two products:

- the **mobile app**, where all studying happens;
- the **web portal**, an internal, password-protected catalog for browsing curated decks and
  sending them to a phone.

## Mobile app

### Destinations

**Discover**, **Focus**, **Reading**, **Decks**, and **Settings**. Swiping sideways moves
between destinations; swiping vertically moves through cards.

- **Discover** mixes cards from every active deck. **Focus** studies one deck. They share the
  Study item in the bottom bar, and a non-interactive header over the feed shows which one is
  open. Holding a Discover card, holding a deck in Decks, or tapping a card's deck label enters
  Focus at that moment.
- **Reading** lists every installed deck that has lessons. A lesson is one or two pages of text in
  a suggested order. Reading is optional: it never gates study and records nothing.
- **Decks** lists installed decks with review counts, search, per-card recall history, a theme for
  each deck, import, and archived progress.
- **Settings** holds color mode, study controls, audio, reading, haptics, progress backup,
  learning-data reset, and app information.

### Studying

Double-tap reveals the answer, then the learner rates recall as **Again**, **Hard**, **Good**, or
**Easy**. Ratings decide what comes back and when. A rating stays editable while its card is among
the last five cards reached; after that it is committed as learning history. Feeds never end.

Audio plays when the deck includes it. When a card links to a lesson section, its answer and its
Reading button open the lesson at that section, and closing the lesson returns to the same card.

Study can be reset for one card, one deck, or the whole library without removing deck content.

### Decks and learner data

The app ships with a small offline demo deck. Other decks arrive as `.fcrdeck` files through
**Decks → Import**, either from device storage or by scanning a QR code from the web portal.
Both routes go through the same validation and installer.

Removing a studied deck archives its learning data. Reinstalling the same deck pauses its cards
until the learner chooses **Continue** (keep the saved progress) or **Start fresh** (delete it).

**Settings → Progress backup** exports all learner data to one JSON file. Importing that file on
another install previews it, then replaces local learner data. Deck content and audio are never
part of a backup.

Nothing leaves the device. The app needs no account and syncs nothing.

### Preferences

- **Color mode:** Light, Dark, or Device.
- **Study island:** left, right, or bottom of the card, and the rating direction. Direction
  changes the visual order, never the meaning of a rating.
- **Audio and Reading buttons:** on or off, and which side of the island. An empty side keeps a
  matching space so the ratings stay centered.
- **Haptics:** on or off. Haptics fire only for rating, a successful hold into Focus, and a
  successful reset.

## Visual system

- **App chrome and deck content are separate.** The app palette owns navigation, surfaces, sheets,
  overlays, and the study island. A deck's theme owns the card background, accent, and card text.
  Each deck uses one of ten curated themes with light and dark variants, so changing color mode
  never changes a deck's identity.
- **Contrast is a requirement.** The app palette uses neutral tones tuned for WCAG AA: body and
  secondary text reach 4.5:1 on every surface; tertiary text and inactive icons reach 3:1.
  `apps/mobile/tests/unit/app-palette.test.ts` enforces this.
- **Feeds are full-bleed** under the status bar and header. Every card has the same header, body,
  and footer structure. The study island reserves space beside or below the answer and never
  covers it.
- **Lists use grouped rows:** one raised card per group, hairline dividers inset past the icon, and
  rows at least 52 pt tall. Destructive rows keep the same shape and use the error color.
- **Code** in card text (backtick spans) and in lessons uses a monospace face with the `codeText`
  and `codeSurface` tokens.
- **Recovery screens** show one contextual title, a short explanation, and the relevant actions.
  Technical details stay collapsed.
- **Restraint:** add a subheading only for a genuinely distinct group. Avoid decorative pills,
  dot-separated labels, nested headings, and repeated explanations.

The web portal shares this identity through `@flashcard-reels/design-tokens`.

## Web portal

After signing in with the shared team password, a user can search decks, browse cards and lessons,
download a `.fcrdeck`, or show a QR code that sends the deck to a phone. The portal stores no
learning progress. Setup is covered in the [web portal guide](guides/web-portal.md).
