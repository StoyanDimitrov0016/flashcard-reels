# Product guide

Flashcard Reels is a local-first study app for practicing technical knowledge in short, focused sessions. It uses the pace of a swipeable feed while keeping the core interaction centered on active recall.

## Mobile app

The five destinations are **Discover**, **Focus**, **Library**, **Progress**, and **You**. Discover mixes cards across decks; Focus stays with one deck. Swipe vertically through cards, double-tap to reveal the answer, then rate recall as **Again**, **Hard**, **Good**, or **Easy**. Answer audio is available when a deck includes it.

Ratings influence what appears later, while Progress summarizes review history and recall patterns. Study can be reset for a card, deck, or the whole library without removing deck content.

## Deck library

The app includes a small offline demo deck. Larger libraries arrive as `.fcrdeck` packages through **Library → Import**, either from the device or by scanning a QR code from the [internal web portal](https://flashcard-reels.vercel.app/). Imported decks use the same validation and update path in both cases.

Library also supports deck search, focused study, card browsing, and a curated appearance preset for each deck.

## Settings and privacy

**You** groups appearance, study controls, audio, haptics, learning-data reset, and app information. Decks, audio, preferences, sessions, and learning history stay on the device; the mobile app does not require an account or sync study data.

Controls also offers a [progress backup](progress-backup.md) for saving learning data to a file or moving it to another device. Import previews the backup before replacing local learning progress; downloaded decks and preferences stay on the device.

The web portal is a separate internal tool for browsing and transferring curated decks. It does not store mobile learning progress.
