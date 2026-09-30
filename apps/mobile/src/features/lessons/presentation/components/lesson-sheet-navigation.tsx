import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type LessonSheetNavigationProps = Readonly<{
  nextLesson: LessonSummary | undefined;
  onBack: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}>;

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
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ android: "menu_book", ios: "book", web: "menu_book" }}
          size={sizes.icon.medium}
          tintColor={colors.textPrimary}
        />
        <Text style={[styles.title, styles.deckLessons]}>Deck lessons</Text>
      </Pressable>
      {!!nextLesson && (
        <Pressable
          accessibilityLabel={`Next lesson: ${nextLesson.title}`}
          accessibilityRole="button"
          onPress={() => onOpenLesson(nextLesson)}
          style={({ pressed }) => [styles.button, pressed && styles.pressed]}
        >
          <View style={styles.copy}>
            <Text style={styles.label}>Next lesson</Text>
            <Text numberOfLines={2} style={styles.title}>
              {nextLesson.title}
            </Text>
          </View>
          <SymbolView
            name={{ android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" }}
            size={sizes.icon.medium}
            tintColor={colors.textPrimary}
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
      paddingVertical: sizes.spacing.large,
    },
    button: {
      flex: 1,
      minWidth: 0,
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.medium,
      padding: sizes.spacing.large,
    },
    copy: { flex: 1, gap: sizes.spacing.xSmall },
    deckLessons: { flex: 1 },
    label: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.bodyLarge,
    },
    pressed: { backgroundColor: colors.surfaceHover },
  });
}
