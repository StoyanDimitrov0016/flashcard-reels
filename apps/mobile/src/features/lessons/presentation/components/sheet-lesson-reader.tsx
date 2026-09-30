import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, type ScrollView, StyleSheet, Text, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckThemeSelections } from "@/features/decks/presentation/controllers/use-deck-theme-selections";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import {
  ReadingProgressBar,
  useReadingProgress,
} from "@/features/lessons/presentation/components/reading-progress-bar";
import { useLesson } from "@/features/lessons/presentation/controllers/use-lesson";
import { useSheetMaxHeight } from "@/shared/presentation/components/app-bottom-sheet";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type SheetLessonReaderProps = Readonly<{
  deckId: DeckId;
  sectionId: string | null;
  lesson: LessonSummary;
  nextLesson: LessonSummary | undefined;
  onBack: () => void;
  onClose: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
}>;

/**
 * A lesson read inside the deck's lesson sheet, so studying resumes on the same card when it
 * closes. It fills the sheet from the start, so the sheet does not jump while the lesson loads.
 */
export function SheetLessonReader({
  deckId,
  sectionId,
  lesson,
  nextLesson,
  onBack,
  onClose,
  onOpenLesson,
}: SheetLessonReaderProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const height = useSheetMaxHeight();
  const { blocks, sections, lesson: loadedLesson, loading } = useLesson({ lessonId: lesson.id });
  const { themeSelections } = useDeckThemeSelections([deckId]);
  const themeSelection = themeSelections.get(deckId);
  const accent = themeSelection
    ? resolveDeckTheme(themeSelection.theme, resolvedScheme).accent
    : colors.textSecondary;
  const { scrollableHeight, scrollViewProps, scrollY } = useReadingProgress();
  const scrollRef = useRef<ScrollView>(null);
  const positioned = useRef(false);
  const [targetY, setTargetY] = useState<number | null>(null);
  const [documentY, setDocumentY] = useState<number | null>(null);
  const [contentReady, setContentReady] = useState(false);
  const [viewportReady, setViewportReady] = useState(false);
  const targetBlock = sections.find((section) => section.id === sectionId)?.startBlock;

  useEffect(
    function positionRelatedSection() {
      if (
        positioned.current ||
        targetY === null ||
        documentY === null ||
        !contentReady ||
        !viewportReady ||
        !scrollRef.current
      ) {
        return;
      }
      positioned.current = true;
      scrollRef.current.scrollTo({
        y: Math.min(Math.max(documentY + targetY - sizes.spacing.medium, 0), scrollableHeight),
        animated: false,
      });
    },
    [targetY, documentY, contentReady, viewportReady, scrollableHeight]
  );

  return (
    <View accessibilityViewIsModal style={[styles.reader, { height }]}>
      <SheetHeader
        back={{ label: "Back to lessons", onPress: onBack }}
        closeLabel="Close lesson"
        onClose={onClose}
        title={lesson.title}
      />
      <ReadingProgressBar color={accent} scrollableHeight={scrollableHeight} scrollY={scrollY} />
      {loading && <LoadingState />}
      {!loading && !loadedLesson && (
        <View style={styles.missing}>
          <EmptyState
            action={{ label: "Back to lessons", onPress: onBack }}
            icon={{ android: "menu_book", ios: "book", web: "menu_book" }}
            message="Its deck was removed or updated without it."
            title="This lesson is no longer available"
          />
        </View>
      )}
      {!loading && loadedLesson && (
        <Animated.ScrollView
          contentContainerStyle={styles.content}
          style={styles.scrollView}
          {...scrollViewProps}
          ref={scrollRef}
          onContentSizeChange={(width, contentHeight) => {
            scrollViewProps.onContentSizeChange(width, contentHeight);
            setContentReady(contentHeight > 0);
          }}
          onLayout={(event) => {
            scrollViewProps.onLayout(event);
            setViewportReady(event.nativeEvent.layout.height > 0);
          }}
        >
          <LessonMarkdownView
            blocks={blocks}
            targetBlock={targetBlock}
            markerColor={accent}
            onTargetLayout={setTargetY}
            onDocumentLayout={setDocumentY}
          />
          {!!nextLesson && (
            <Pressable
              accessibilityLabel={`Next lesson: ${nextLesson.title}`}
              accessibilityRole="button"
              onPress={() => onOpenLesson(nextLesson)}
              style={({ pressed }) => [styles.next, pressed && styles.pressed]}
            >
              <View style={styles.nextCopy}>
                <Text style={styles.nextLabel}>Next lesson</Text>
                <Text numberOfLines={2} style={styles.nextTitle}>
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
        </Animated.ScrollView>
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      gap: sizes.spacing.large,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.xLarge,
    },
    missing: { flex: 1, justifyContent: "center" },
    next: {
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.large,
      marginTop: sizes.spacing.xLarge,
      padding: sizes.spacing.xLarge,
    },
    nextCopy: { flex: 1, gap: sizes.spacing.xSmall },
    nextLabel: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    nextTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.bodyLarge,
    },
    pressed: { backgroundColor: colors.surfaceHover },
    reader: { flexShrink: 1 },
    scrollView: { flex: 1 },
  });
}
