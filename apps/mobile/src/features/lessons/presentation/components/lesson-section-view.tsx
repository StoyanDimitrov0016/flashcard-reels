import { memo } from "react";
import { StyleSheet, Text, View, type LayoutChangeEvent } from "react-native";

import type { LessonSection } from "@/features/lessons/domain/lesson.model";

import { LessonMarkdown } from "@/features/lessons/presentation/components/lesson-markdown";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type LessonSectionViewProps = Readonly<{
  section: LessonSection;
  highlighted: boolean;
  sectionColor?: string;
  onLayout?: (event: LayoutChangeEvent) => void;
}>;

function LessonSectionView({
  section,
  highlighted,
  sectionColor,
  onLayout,
}: LessonSectionViewProps) {
  const { colors } = useAppTheme();

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.section,
        highlighted && styles.highlighted,
        highlighted && { borderLeftColor: sectionColor ?? colors.borderStrong },
      ]}
    >
      {highlighted && (
        <Text
          accessibilityLabel="Related section starts here"
          style={{ color: colors.textSecondary }}
        >
          Related section
        </Text>
      )}
      <Text accessibilityRole="header" style={[styles.heading, { color: colors.textPrimary }]}>
        {section.title}
      </Text>
      <LessonMarkdown body={section.body} />
    </View>
  );
}

export default memo(LessonSectionView);

const styles = StyleSheet.create({
  section: { paddingVertical: sizes.spacing.section },
  highlighted: { borderLeftWidth: 3, paddingLeft: sizes.spacing.medium },
  heading: {
    fontSize: fontSize.title2,
    lineHeight: lineHeight.title2,
    fontWeight: fontWeight.bold,
    paddingBottom: sizes.spacing.medium,
  },
});
