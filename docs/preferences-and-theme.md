# Preferences and theme

Flashcard Reels keeps app preferences separate from deck content. Preferences cover:

- Light, Dark, or Device color mode;
- Study Island position and rating direction;
- contextual audio placement and audio enabled/disabled;
- contextual reading placement and reading enabled/disabled;
- haptics enabled/disabled.

Preferences use the local `flashcard-reels.preferences.v2` storage key and are validated when loaded. Missing or invalid values fall back to the app defaults.

## Color mode

The application theme controls navigation, sheets, settings, controls, overlays, and status-bar treatment. Decks use their own selected appearance preset, with paired light and dark variants, so changing the app theme does not change deck identity.

## Study controls

The Study Island can sit on the left, right, or bottom of a card. Rating direction changes visual order without changing the meaning of the recall labels. Audio and Reading buttons each follow their own primary/opposite placement; when one side is empty, a matching space keeps the ratings centered on the card.

The Reading button appears on answers from decks that have lessons. It opens a short sheet with the deck's lessons, and a lesson opened from it is read in the same sheet with a link to the next one, so closing it returns to the same card.

Haptics are limited to meaningful study events such as rating, successful Hold-to-Focus, and successful learning reset.
