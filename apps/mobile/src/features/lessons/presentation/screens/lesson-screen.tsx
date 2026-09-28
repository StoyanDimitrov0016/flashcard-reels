import { useLocalSearchParams, useRouter } from "expo-router";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckThemeSelections } from "@/features/decks/presentation/controllers/use-deck-theme-selections";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import {
  ReadingProgressBar,
  useReadingProgress,
} from "@/features/lessons/presentation/components/reading-progress-bar";
import { useLesson } from "@/features/lessons/presentation/controllers/use-lesson";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { SubScreenHeader } from "@/shared/presentation/components/sub-screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

const readingColumnMaxWidth = sizes.sheet.maxWidthWide;

export default function LessonScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const { lessonId } = useLocalSearchParams<{ lessonId: string }>();
  const { blocks, lesson, loading } = useLesson({ lessonId: lessonId ?? "" });
  const { themeSelections } = useDeckThemeSelections(lesson ? [lesson.deckId] : []);
  const themeSelection = lesson ? themeSelections.get(lesson.deckId) : undefined;
  const accent = themeSelection
    ? resolveDeckTheme(themeSelection.theme, resolvedScheme).accent
    : colors.textSecondary;
  const { scrollableHeight, scrollViewProps, scrollY } = useReadingProgress();

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <SubScreenHeader backLabel="Back to lessons" onBack={() => router.back()} />
      {loading && <LoadingState />}
      {!loading && !lesson && (
        <View style={styles.missing}>
          <EmptyState
            action={{ label: "Back to lessons", onPress: () => router.back() }}
            icon={{ android: "menu_book", ios: "book", web: "menu_book" }}
            message="Its deck was removed or updated without it."
            title="This lesson is no longer available"
          />
        </View>
      )}
      {!loading && lesson && (
        <>
          <ReadingProgressBar
            color={accent}
            scrollableHeight={scrollableHeight}
            scrollY={scrollY}
          />
          <Animated.ScrollView contentContainerStyle={styles.content} {...scrollViewProps}>
            <View style={styles.column}>
              <Text accessibilityRole="header" style={styles.title}>
                {lesson.title}
              </Text>
              <LessonMarkdownView blocks={blocks} />
            </View>
          </Animated.ScrollView>
        </>
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
    missing: { flex: 1, justifyContent: "center" },
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
