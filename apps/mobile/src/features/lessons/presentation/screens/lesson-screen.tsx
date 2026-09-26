import { useLocalSearchParams, useRouter } from "expo-router";
import { useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckAppearances } from "@/features/decks/presentation/controllers/use-deck-appearances";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";
import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import { ReadingProgressBar } from "@/features/lessons/presentation/components/reading-progress-bar";
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
  const { appearances } = useDeckAppearances(lesson ? [lesson.deckId] : []);
  const appearance = lesson ? appearances.get(lesson.deckId) : undefined;
  const accent = appearance
    ? resolveDeckAppearance(appearance.presetId, resolvedScheme).accent
    : colors.textSecondary;
  const scrollY = useRef(new Animated.Value(0)).current;
  const [viewportHeight, setViewportHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

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
            scrollableHeight={Math.max(contentHeight - viewportHeight, 0)}
            scrollY={scrollY}
          />
          <Animated.ScrollView
            contentContainerStyle={styles.content}
            onContentSizeChange={(_width, height) => setContentHeight(height)}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], {
              useNativeDriver: true,
            })}
            scrollEventThrottle={16}
          >
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
