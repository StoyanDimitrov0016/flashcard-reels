import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type LessonListProps = Readonly<{
  lessons: readonly LessonSummary[];
  onOpen: (lesson: LessonSummary) => void;
}>;

/** A deck's lessons as one grouped list of numbered rows. */
export function LessonList({ lessons, onOpen }: LessonListProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.group}>
      {lessons.map((lesson, index) => (
        <Pressable
          accessibilityHint="Opens the lesson"
          accessibilityLabel={`Lesson ${lesson.order + 1}: ${lesson.title}`}
          accessibilityRole="button"
          key={lesson.id}
          onPress={() => onOpen(lesson)}
          style={({ pressed }) => [
            styles.row,
            index > 0 && styles.divider,
            pressed && styles.pressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.position}>
            {lesson.order + 1}
          </Text>
          <Text numberOfLines={2} style={styles.title}>
            {lesson.title}
          </Text>
          <SymbolView
            name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
            size={sizes.icon.small}
            tintColor={colors.textTertiary}
          />
        </Pressable>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    divider: { borderTopColor: colors.borderSubtle, borderTopWidth: sizes.border },
    group: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      overflow: "hidden",
    },
    position: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      minWidth: 22,
      textAlign: "center",
    },
    pressed: { backgroundColor: colors.surfaceHover },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.large,
      minHeight: sizes.control.standard + sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.bodyLarge,
    },
  });
}
