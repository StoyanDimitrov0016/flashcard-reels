import { useLocalSearchParams, useRouter } from "expo-router";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import { useLesson } from "@/features/lessons/presentation/controllers/use-lesson";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { ScreenBackButton } from "@/shared/presentation/components/screen-back-button";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

const readingColumnMaxWidth = sizes.sheet.maxWidthWide;

export default function LessonScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { blocks, lesson, loading } = useLesson({ lessonId: lessonId ?? "" });

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <ScreenBackButton accessibilityLabel="Back to Reading" onPress={() => router.back()} />
      </ScreenHeader>
      {loading && <LoadingState />}
      {!loading && !lesson && (
        <View style={styles.missing}>
          <Text accessibilityRole="header" style={styles.missingTitle}>
            This lesson is no longer available
          </Text>
          <Text style={styles.missingMessage}>
            Its deck was removed or updated without it. Go back to see the lessons you have.
          </Text>
        </View>
      )}
      {!loading && lesson && (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.column}>
            <Text style={styles.eyebrow}>Lesson {lesson.order + 1}</Text>
            <Text accessibilityRole="header" style={styles.title}>
              {lesson.title}
            </Text>
            <LessonMarkdownView blocks={blocks} />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    column: {
      alignSelf: "center",
      gap: sizes.spacing.large,
      maxWidth: readingColumnMaxWidth,
      width: "100%",
    },
    content: {
      paddingBottom: sizes.spacing.wide * 2,
      paddingHorizontal: screenLayout.horizontalPadding,
      paddingTop: sizes.spacing.spacious,
    },
    eyebrow: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.eyebrow,
      textTransform: "uppercase",
    },
    missing: {
      flex: 1,
      gap: sizes.spacing.medium,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.wide,
    },
    missingMessage: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
      textAlign: "center",
    },
    missingTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title3,
      fontWeight: fontWeight.bold,
      textAlign: "center",
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.heading1,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.tight,
      lineHeight: lineHeight.heading1,
      marginBottom: sizes.spacing.medium,
    },
  });
}
