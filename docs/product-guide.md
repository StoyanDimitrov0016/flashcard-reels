# Product guide

Flashcard Reels is a local-first study app for practicing technical knowledge in short, focused sessions. It uses the pace of a swipeable feed while keeping the core interaction centered on active recall.

## Mobile app

The destinations are **Discover**, **Focus**, **Reading**, **Decks**, and **Settings**, and swiping left or right moves between them. Discover mixes cards across decks, and Focus stays with one deck; a header above the feed shows which of the two is open, and both share the Study icon in the bottom bar. Swipe vertically through cards, double-tap to reveal the answer, then rate recall as **Again**, **Hard**, **Good**, or **Easy**. Flashcard audio is available when a deck includes it.

Ratings influence what appears later, while Decks shows how many cards of each deck are reviewed, and each deck page shows its cards' recall history. Study can be reset for a card, deck, or the whole library without removing deck content.

## Reading

**Reading** shows a card for each installed deck that has lessons, with its first few lesson titles; tapping a card lists that deck's lessons in their suggested order. A lesson is one or two pages of text to read before or alongside studying. Reading is optional: it never gates the feeds and records no progress.

## Deck library

The app includes a small offline demo deck. Larger libraries arrive as `.fcrdeck` packages through **Decks → Import**, either from the device or by scanning a QR code from the [internal web portal](https://flashcard-reels.vercel.app/). Imported decks use the same validation and update path in both cases.

Decks also supports deck search, focused study, card browsing, and a curated theme for each deck.

## Settings and privacy

**Settings** groups color mode, the study island, audio, reading, haptics, learning-data reset, and app information. Decks, audio, preferences, sessions, and learning history stay on the device; the mobile app does not require an account or sync study data.

Settings also offers a [progress backup](progress-backup.md) for saving learning data to a file or moving it to another device. Import previews the backup before replacing local learning progress; downloaded decks and preferences stay on the device.

The web portal is a separate internal tool for browsing and transferring curated decks. It does not store mobile learning progress.
