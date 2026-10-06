import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { useQuery } from "@tanstack/react-query";
import { createContext, type ReactNode, useContext, useState } from "react";
import { StyleSheet, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type {
  DeckReadingList,
  LessonId,
  LessonSummary,
} from "@/features/lessons/domain/lesson.model";

import { findAdjacentLessons } from "@/features/lessons/presentation/adjacent-lessons";
import { LessonList } from "@/features/lessons/presentation/components/lesson-list";
import { SheetLessonReader } from "@/features/lessons/presentation/components/sheet-lesson-reader";
import { useLessonSheetHeight } from "@/features/lessons/presentation/controllers/use-lesson-sheet-height";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { lessonQueries } from "@/features/lessons/presentation/queries/lesson-queries";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type DeckLessonsContextValue = Readonly<{
  hasLesson: (deckId: DeckId, lessonId: LessonId) => boolean;
  openLesson: (deckId: DeckId, lessonId: LessonId, sectionId?: string | null) => void;
}>;

const DeckLessonsContext = createContext<DeckLessonsContextValue | null>(null);
const noReadingLists: ReadonlyMap<DeckId, DeckReadingList> = new Map();

function indexByDeck(lists: readonly DeckReadingList[]): ReadonlyMap<DeckId, DeckReadingList> {
  return new Map(lists.map((list) => [list.deckId, list]));
}

type DeckLessonsProviderProps = Readonly<{ children: ReactNode }>;

/**
 * Loads each deck's lessons once for every card in the feed, and owns the one sheet that lists a
 * deck's lessons and reads them, so closing it returns to the same card.
 */
export function DeckLessonsProvider({ children }: DeckLessonsProviderProps) {
  // Without lessons the Reading button stays hidden; studying is unaffected, so this never throws.
  const { data: readingLists = noReadingLists } = useQuery({
    ...lessonQueries.readingLists(useLessonsCapability()),
    select: indexByDeck,
    throwOnError: false,
    meta: { errorReport: "Deck lessons load failure" },
  });
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [opening, setOpening] = useState(0);
  const [openDeckId, setOpenDeckId] = useState<DeckId | null>(null);
  const [openLesson, setOpenLesson] = useState<LessonSummary | null>(null);

  const value: DeckLessonsContextValue = {
    hasLesson: (deckId, lessonId) =>
      readingLists.get(deckId)?.lessons.some((lesson) => lesson.id === lessonId) ?? false,
    openLesson: (deckId, lessonId, target = null) => {
      const lesson = readingLists.get(deckId)?.lessons.find((item) => item.id === lessonId);
      if (!lesson) {
        return;
      }
      setSectionId(target);
      setOpening((count) => count + 1);
      setOpenDeckId(deckId);
      setOpenLesson(lesson);
    },
  };
  const openList = openDeckId ? (readingLists.get(openDeckId) ?? null) : null;

  return (
    <DeckLessonsContext.Provider value={value}>
      {children}
      <DeckLessonsSheet
        lesson={openLesson}
        sectionId={sectionId}
        opening={opening}
        onClose={() => {
          setSectionId(null);
          setOpenDeckId(null);
          setOpenLesson(null);
        }}
        onOpenLesson={(lesson) => {
          setSectionId(null);
          setOpenLesson(lesson);
        }}
        readingList={openList}
      />
    </DeckLessonsContext.Provider>
  );
}

export function useDeckLessons(): DeckLessonsContextValue {
  const value = useContext(DeckLessonsContext);
  if (!value) {
    throw new Error("useDeckLessons requires DeckLessonsProvider");
  }
  return value;
}

type DeckLessonsSheetProps = Readonly<{
  /** The lesson being read in the sheet, or null while it lists the deck's lessons. */
  lesson: LessonSummary | null;
  sectionId: string | null;
  opening: number;
  onClose: () => void;
  onOpenLesson: (lesson: LessonSummary | null) => void;
  readingList: DeckReadingList | null;
}>;

function DeckLessonsSheet({
  lesson,
  sectionId,
  opening,
  onClose,
  onOpenLesson,
  readingList,
}: DeckLessonsSheetProps) {
  const { colors } = useAppTheme();
  const height = useLessonSheetHeight();
  const styles = createStyles(colors);
  const lessons = readingList?.lessons ?? [];

  return (
    <AppBottomSheet onClose={onClose} visible={readingList !== null}>
      {!!readingList && !!lesson && (
        <SheetLessonReader
          deckId={readingList.deckId}
          key={`${lesson.id}:${opening}:${sectionId ?? ""}`}
          sectionId={sectionId}
          lesson={lesson}
          nextLesson={findAdjacentLessons(lessons, lesson.id).next}
          onBack={() => onOpenLesson(null)}
          onClose={onClose}
          onOpenLesson={onOpenLesson}
        />
      )}
      {!lesson && (
        <View accessibilityViewIsModal style={[styles.sheet, { height }]}>
          <SheetHeader
            closeLabel="Close lessons"
            onClose={onClose}
            title={readingList?.deckTitle ?? "Lessons"}
          />
          <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
            <LessonList lessons={lessons} onOpen={onOpenLesson} />
          </BottomSheetScrollView>
        </View>
      )}
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: { paddingBottom: sizes.spacing.spacious, paddingHorizontal: sizes.spacing.content },
    scrollView: { flex: 1 },
    sheet: { backgroundColor: colors.surfaceRaised, flexShrink: 1 },
  });
}
