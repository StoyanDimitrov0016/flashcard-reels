# Preferences and theme

Flashcard Reels keeps app preferences separate from deck content. Preferences cover:

- Light, Dark, or Device appearance;
- Study Island position and rating direction;
- contextual audio placement and audio enabled/disabled;
- haptics enabled/disabled.

Preferences are stored locally and validated when loaded. Missing or invalid values fall back to the app defaults.

## Appearance

The application theme controls navigation, sheets, settings, controls, overlays, and status-bar treatment. Decks use their own selected appearance preset, with paired light and dark variants, so changing the app theme does not change deck identity.

## Study controls

The Study Island can sit on the left, right, or bottom of a card. Rating direction changes visual order without changing the meaning of the recall labels. Audio follows the selected primary/opposite placement.

Haptics are limited to meaningful study events such as rating, successful Hold-to-Focus, and successful learning reset.
