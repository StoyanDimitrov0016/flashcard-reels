import { StyleSheet, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { LessonNavigationButtons } from "@/features/lessons/presentation/components/lesson-navigation-buttons";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type LessonSheetNavigationProps = Readonly<{
  nextLesson: LessonSummary | undefined;
  onBack: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}>;

/** The reader sheet's footer: back to the deck's lessons, and the next lesson. */
export function LessonSheetNavigation({
  nextLesson,
  onBack,
  onOpenLesson,
}: LessonSheetNavigationProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.footer}>
      <LessonNavigationButtons
        back={{
          accessibilityHint: "Opens the lessons from this deck",
          accessibilityLabel: "Back to lessons",
          icon: { android: "menu_book", ios: "book", web: "menu_book" },
          label: "Lessons",
          onPress: onBack,
        }}
        nextLesson={nextLesson}
        onOpenLesson={onOpenLesson}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    footer: {
      borderTopColor: colors.borderSubtle,
      borderTopWidth: sizes.border,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.xLarge,
      paddingBottom: sizes.spacing.section,
    },
  });
}
