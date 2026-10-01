import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

const PRESSED_OPACITY = 0.72;

type LessonSheetNavigationProps = Readonly<{
  nextLesson: LessonSummary | undefined;
  onBack: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}>;

/** The reader's footer: back to the deck's lessons, and the next lesson as the main action. */
export function LessonSheetNavigation({
  nextLesson,
  onBack,
  onOpenLesson,
}: LessonSheetNavigationProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.navigation}>
      <Pressable
        accessibilityLabel="Back to lessons"
        accessibilityHint="Opens the lessons from this deck"
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [
          styles.button,
          styles.lessonsButton,
          !nextLesson && styles.fill,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ android: "menu_book", ios: "book", web: "menu_book" }}
          size={sizes.icon.small}
          tintColor={colors.textPrimary}
        />
        <Text style={styles.lessonsLabel}>Lessons</Text>
      </Pressable>
      {!!nextLesson && (
        <Pressable
          accessibilityLabel={`Next lesson: ${nextLesson.title}`}
          accessibilityRole="button"
          onPress={() => onOpenLesson(nextLesson)}
          style={({ pressed }) => [
            styles.button,
            styles.nextButton,
            styles.fill,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.nextLabel}>
            Next: {nextLesson.title}
          </Text>
          <SymbolView
            name={{ android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" }}
            size={sizes.icon.small}
            tintColor={colors.actionPrimaryText}
          />
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    navigation: {
      flexDirection: "row",
      gap: sizes.spacing.medium,
      borderTopColor: colors.borderSubtle,
      borderTopWidth: sizes.border,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.xLarge,
      paddingBottom: sizes.spacing.section,
    },
    button: {
      alignItems: "center",
      borderRadius: sizes.radius.control,
      flexDirection: "row",
      gap: sizes.spacing.small,
      justifyContent: "center",
      minHeight: sizes.control.standard,
      paddingHorizontal: sizes.spacing.section,
    },
    fill: { flex: 1, minWidth: 0 },
    lessonsButton: { backgroundColor: colors.surfaceSubtle },
    lessonsLabel: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    nextButton: { backgroundColor: colors.actionPrimary },
    nextLabel: {
      color: colors.actionPrimaryText,
      flexShrink: 1,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    pressed: { opacity: PRESSED_OPACITY },
  });
}
