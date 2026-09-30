import { useEffect, useRef, useState } from "react";
import { Animated, type ScrollView, StyleSheet, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckThemeSelections } from "@/features/decks/presentation/controllers/use-deck-theme-selections";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { LessonMarkdownView } from "@/features/lessons/presentation/components/lesson-markdown-view";
import { LessonSheetNavigation } from "@/features/lessons/presentation/components/lesson-sheet-navigation";
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
import { useAppTheme } from "@/shared/presentation/theme";

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
  const targetSection = sections.find((section) => section.id === sectionId);

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
      <SheetHeader closeLabel="Close lesson" onClose={onClose} title={lesson.title} />
      <ReadingProgressBar color={accent} scrollableHeight={scrollableHeight} scrollY={scrollY} />
      {loading && <LoadingState />}
      {!loading && !loadedLesson && (
        <View style={styles.missing}>
          <EmptyState
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
            targetSection={targetSection}
            onTargetLayout={setTargetY}
            onDocumentLayout={setDocumentY}
          />
        </Animated.ScrollView>
      )}
      <LessonSheetNavigation
        nextLesson={!loading && loadedLesson ? nextLesson : undefined}
        onBack={onBack}
        onOpenLesson={onOpenLesson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: sizes.spacing.large,
    paddingBottom: sizes.spacing.spacious,
    paddingHorizontal: sizes.spacing.content,
    paddingTop: sizes.spacing.xLarge,
  },
  missing: { flex: 1, justifyContent: "center" },
  reader: { flexShrink: 1 },
  scrollView: { flex: 1 },
});
