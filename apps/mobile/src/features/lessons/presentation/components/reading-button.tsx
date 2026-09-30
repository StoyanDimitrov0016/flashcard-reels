import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonId } from "@/features/lessons/domain/lesson.model";

import { useDeckLessons } from "@/features/lessons/presentation/context/deck-lessons-context";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReadingButtonProps = Readonly<{
  deckId: DeckId;
  lessonId: LessonId;
  sectionId?: string | null;
}>;

/** Opens the lesson connected to a flashcard. */
export function ReadingButton({ deckId, lessonId, sectionId }: ReadingButtonProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { openLesson } = useDeckLessons();

  return (
    <Pressable
      accessibilityHint="Opens the lesson for this flashcard"
      accessibilityLabel="Read connected lesson"
      accessibilityRole="button"
      hitSlop={4}
      onPress={() => openLesson(deckId, lessonId, sectionId)}
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
