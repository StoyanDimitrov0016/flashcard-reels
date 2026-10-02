import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

const PRESSED_OPACITY = 0.72;

type LessonPagerProps = Readonly<{
  next: LessonSummary | undefined;
  onOpenLesson: (lesson: LessonSummary) => void;
  previous: LessonSummary | undefined;
}>;

/**
 * The end of a lesson: the lessons before and after it in one row, with the direction above
 * the title. Two buttons split the row and a lone one fills it; long titles wrap to two lines
 * before truncating.
 */
export function LessonPager({ next, onOpenLesson, previous }: LessonPagerProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  if (!previous && !next) {
    return null;
  }
  // A lone button spans the row, so its content centres instead of hugging one edge.
  const alone = !previous || !next;
  return (
    <View style={styles.pager}>
      {!!previous && (
        <Pressable
          accessibilityLabel={`Previous lesson: ${previous.title}`}
          accessibilityRole="button"
          onPress={() => onOpenLesson(previous)}
          style={({ pressed }) => [
            styles.half,
            styles.button,
            styles.previous,
            alone && styles.centered,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.direction, alone && styles.directionCentered]}>
            <SymbolView
              name={{ android: "arrow_back", ios: "arrow.left", web: "arrow_back" }}
              size={sizes.icon.small}
              tintColor={colors.textSecondary}
            />
            <Text style={[styles.directionLabel, styles.previousDirection]}>Previous</Text>
          </View>
          <Text
            numberOfLines={2}
            style={[styles.title, styles.previousTitle, alone && styles.centeredText]}
          >
            {previous.title}
          </Text>
        </Pressable>
      )}
      {!!next && (
        <Pressable
          accessibilityLabel={`Next lesson: ${next.title}`}
          accessibilityRole="button"
          onPress={() => onOpenLesson(next)}
          style={({ pressed }) => [
            styles.half,
            styles.button,
            styles.next,
            alone && styles.centered,
            pressed && styles.pressed,
          ]}
        >
          <View style={[styles.direction, alone ? styles.directionCentered : styles.directionEnd]}>
            <Text style={[styles.directionLabel, styles.nextText]}>Next</Text>
            <SymbolView
              name={{ android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" }}
              size={sizes.icon.small}
              tintColor={colors.actionPrimaryText}
            />
          </View>
          <Text
            numberOfLines={2}
            style={[styles.title, styles.nextText, alone ? styles.centeredText : styles.endText]}
          >
            {next.title}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    pager: { flexDirection: "row", gap: sizes.spacing.medium },
    // Two buttons split the row; a lone one takes all of it.
    half: { flex: 1, minWidth: 0 },
    button: {
      borderRadius: sizes.radius.row,
      gap: sizes.spacing.xSmall,
      minHeight: sizes.control.standard,
      paddingHorizontal: sizes.spacing.section,
      paddingVertical: sizes.spacing.large,
    },
    next: { alignItems: "flex-end", backgroundColor: colors.actionPrimary },
    previous: { alignItems: "flex-start", backgroundColor: colors.surfaceSubtle },
    direction: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xSmall },
    directionEnd: { justifyContent: "flex-end" },
    directionLabel: { fontSize: fontSize.caption, fontWeight: fontWeight.semibold },
    previousDirection: { color: colors.textSecondary },
    title: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
    previousTitle: { color: colors.textPrimary },
    nextText: { color: colors.actionPrimaryText },
    endText: { textAlign: "right" },
    centered: { alignItems: "center" },
    centeredText: { textAlign: "center" },
    directionCentered: { justifyContent: "center" },
    pressed: { opacity: PRESSED_OPACITY },
  });
}
