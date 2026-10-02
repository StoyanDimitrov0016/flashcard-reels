import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

const PRESSED_OPACITY = 0.72;

/** The quieter way out of a lesson, such as back to the deck's lessons or to the previous one. */
type LessonBackAction = Readonly<{
  accessibilityHint?: string;
  accessibilityLabel: string;
  icon: Exclude<SymbolViewProps["name"], string>;
  label: string;
  onPress: () => void;
}>;

type LessonNavigationButtonsProps = Readonly<{
  back: LessonBackAction | undefined;
  nextLesson: LessonSummary | undefined;
  onOpenLesson: (lesson: LessonSummary) => void;
}>;

/** A lesson's way onward: the next lesson as the main action, and a quieter way back. */
export function LessonNavigationButtons({
  back,
  nextLesson,
  onOpenLesson,
}: LessonNavigationButtonsProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (!back && !nextLesson) {
    return null;
  }
  return (
    <View style={styles.row}>
      {!!back && (
        <Pressable
          accessibilityHint={back.accessibilityHint}
          accessibilityLabel={back.accessibilityLabel}
          accessibilityRole="button"
          onPress={back.onPress}
          style={({ pressed }) => [
            styles.button,
            styles.backButton,
            !nextLesson && styles.fill,
            pressed && styles.pressed,
          ]}
        >
          <SymbolView name={back.icon} size={sizes.icon.small} tintColor={colors.textPrimary} />
          <Text style={styles.backLabel}>{back.label}</Text>
        </Pressable>
      )}
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
    row: { flexDirection: "row", gap: sizes.spacing.medium },
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
    backButton: { backgroundColor: colors.surfaceSubtle },
    backLabel: {
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
