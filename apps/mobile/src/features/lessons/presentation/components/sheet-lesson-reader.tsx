import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckMetadata } from "@/features/decks/presentation/controllers/use-deck-metadata";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { LessonArticle } from "@/features/lessons/presentation/components/lesson-article";
import { LessonSheetNavigation } from "@/features/lessons/presentation/components/lesson-sheet-navigation";
import { useLesson } from "@/features/lessons/presentation/controllers/use-lesson";
import { useLessonSheetHeight } from "@/features/lessons/presentation/controllers/use-lesson-sheet-height";
import { reportError } from "@/shared/errors/report-error";
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
 * The related section carries the deck's accent; the native scroll indicator shows position.
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
  const height = useLessonSheetHeight();
  const { lesson: loadedLesson, loading } = useLesson({ lessonId: lesson.id });
  const { themeSelections } = useDeckMetadata([deckId], false);
  const themeSelection = themeSelections.get(deckId);
  const accent = themeSelection
    ? resolveDeckTheme(themeSelection.theme, resolvedScheme).accent
    : colors.textSecondary;
  const scrollRef = useRef<ScrollView>(null);
  const positioned = useRef(false);
  const [targetY, setTargetY] = useState<number | null>(null);
  const [documentY, setDocumentY] = useState<number | null>(null);
  const [contentHeight, setContentHeight] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const scrollableHeight = Math.max(contentHeight - viewportHeight, 0);
  const targetSection = loadedLesson?.sections.find((section) => section.id === sectionId);

  useEffect(
    function reportMissingSection() {
      if (loadedLesson && sectionId !== null && !targetSection) {
        reportError(
          new Error(`Section ${sectionId} is missing from lesson ${loadedLesson.id}`),
          "Lesson section reference mismatch"
        );
      }
    },
    [loadedLesson, sectionId, targetSection]
  );

  useEffect(
    function positionRelatedSection() {
      if (
        positioned.current ||
        targetY === null ||
        documentY === null ||
        contentHeight === 0 ||
        viewportHeight === 0 ||
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
    [targetY, documentY, contentHeight, viewportHeight, scrollableHeight]
  );

  return (
    <View accessibilityViewIsModal style={[styles.reader, { height }]}>
      <SheetHeader closeLabel="Close lesson" onClose={onClose} title={lesson.title} />
      <View style={styles.article}>
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
          <ScrollView
            contentContainerStyle={styles.content}
            onContentSizeChange={(_width, nextHeight) => setContentHeight(nextHeight)}
            onLayout={(event) => setViewportHeight(event.nativeEvent.layout.height)}
            ref={scrollRef}
            style={styles.scrollView}
          >
            <LessonArticle
              lesson={loadedLesson}
              targetSectionId={targetSection?.id}
              sectionColor={accent}
              onTargetLayout={setTargetY}
              onDocumentLayout={setDocumentY}
            />
          </ScrollView>
        )}
      </View>
      <LessonSheetNavigation
        nextLesson={!loading && loadedLesson ? nextLesson : undefined}
        onBack={onBack}
        onOpenLesson={onOpenLesson}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  article: { flex: 1 },
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
