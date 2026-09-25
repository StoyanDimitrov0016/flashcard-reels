import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";

import { useDeckLessons } from "@/features/lessons/presentation/context/deck-lessons-context";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReadingButtonProps = Readonly<{ deckId: DeckId }>;

/** Opens the deck's lessons from a flashcard. Render it only for decks that have lessons. */
export function ReadingButton({ deckId }: ReadingButtonProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { openLessons } = useDeckLessons();

  return (
    <Pressable
      accessibilityHint="Lists this deck's lessons"
      accessibilityLabel="Read lessons"
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => openLessons(deckId)}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <SymbolView
        name={{ android: "menu_book", ios: "book.fill", web: "menu_book" }}
        size={sizes.icon.medium}
        tintColor={colors.textPrimary}
      />
    </Pressable>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    // Same shape as the answer audio button, so the two read as one family.
    button: {
      alignItems: "center",
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: sizes.control.audio,
      justifyContent: "center",
      width: sizes.control.audio,
    },
    pressed: { opacity: 0.72 },
  });
}
