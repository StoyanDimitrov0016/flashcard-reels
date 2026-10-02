import { useRouter } from "expo-router";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckMetadata } from "@/features/decks/presentation/controllers/use-deck-metadata";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { findAdjacentLessons } from "@/features/lessons/presentation/adjacent-lessons";
import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import { LessonNavigationButtons } from "@/features/lessons/presentation/components/lesson-navigation-buttons";
import {
  ReadingProgressBar,
  useReadingProgress,
} from "@/features/lessons/presentation/components/reading-progress-bar";
import { useLesson } from "@/features/lessons/presentation/controllers/use-lesson";
import { useReadingLists } from "@/features/lessons/presentation/controllers/use-reading-lists";
import { useLessonRouteId } from "@/features/lessons/presentation/hooks/use-lesson-route-id";
import { getLessonHref } from "@/features/lessons/presentation/lesson-href";
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
  const lessonId = useLessonRouteId();
  const { blocks, lesson, loading } = useLesson({ lessonId });
  const { readingLists } = useReadingLists();
  const deckLessons = lesson
    ? (readingLists.find((list) => list.deckId === lesson.deckId)?.lessons ?? [])
    : [];
  const lessonCount = deckLessons.length;
  const { previous, next } = findAdjacentLessons(deckLessons, lesson?.id);
  // Replacing keeps Back pointing at the deck's lessons instead of every lesson read.
  const openLesson = (target: LessonSummary) => router.replace(getLessonHref(target.id));
  const { themeSelections } = useDeckMetadata(lesson ? [lesson.deckId] : [], false);
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
              {lessonCount > 0 && (
                <Text style={styles.lessonPosition}>
                  Lesson {lesson.order + 1} of {lessonCount}
                </Text>
              )}
              <Text accessibilityRole="header" style={styles.title}>
                {lesson.title}
              </Text>
              <LessonMarkdownView blocks={blocks} />
              <View style={styles.navigation}>
                <LessonNavigationButtons
                  back={
                    previous && {
                      accessibilityLabel: `Previous lesson: ${previous.title}`,
                      icon: { android: "arrow_back", ios: "arrow.left", web: "arrow_back" },
                      label: "Previous",
                      onPress: () => openLesson(previous),
                    }
                  }
                  nextLesson={next}
                  onOpenLesson={openLesson}
                />
              </View>
            </View>
          </Animated.ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    lessonPosition: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontWeight: fontWeight.bold,
    },
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
    navigation: {
      borderTopColor: colors.borderSubtle,
      borderTopWidth: sizes.border,
      marginTop: sizes.spacing.screen,
      paddingTop: sizes.spacing.content,
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
