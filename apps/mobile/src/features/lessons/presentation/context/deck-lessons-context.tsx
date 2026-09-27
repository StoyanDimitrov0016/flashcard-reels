import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type {
  DeckReadingList,
  LessonId,
  LessonSummary,
} from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { LessonList } from "@/features/lessons/presentation/components/lesson-list";
import { SheetLessonReader } from "@/features/lessons/presentation/components/sheet-lesson-reader";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { reportError } from "@/shared/errors/report-error";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type DeckLessonsContextValue = Readonly<{
  hasLesson: (deckId: DeckId, lessonId: LessonId) => boolean;
  openLesson: (deckId: DeckId, lessonId: LessonId) => void;
}>;

// The list stays short over the card being studied; a lesson opened from it fills the sheet.
const LIST_MAX_HEIGHT_RATIO = 0.5;

const DeckLessonsContext = createContext<DeckLessonsContextValue | null>(null);

type DeckLessonsProviderProps = Readonly<{ children: ReactNode }>;

/**
 * Loads each deck's lessons once for every card in the feed, and owns the one sheet that lists a
 * deck's lessons and reads them, so closing it returns to the same card.
 */
export function DeckLessonsProvider({ children }: DeckLessonsProviderProps) {
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const [readingLists, setReadingLists] = useState<ReadonlyMap<DeckId, DeckReadingList>>(
    () => new Map()
  );
  const [openDeckId, setOpenDeckId] = useState<DeckId | null>(null);
  const [openLesson, setOpenLesson] = useState<LessonSummary | null>(null);

  useEffect(
    function loadDeckLessons() {
      let active = true;
      lessonService
        .listReadingLists()
        .then((lists) => {
          if (active) {
            setReadingLists(new Map(lists.map((list) => [list.deckId, list])));
          }
        })
        .catch((error: unknown) => {
          // Without lessons the Reading button stays hidden; studying is unaffected.
          reportError(error, "Deck lessons load failure");
        });
      return function cancelDeckLessonsLoad() {
        active = false;
      };
    },
    [lessonService, revision]
  );

  const value: DeckLessonsContextValue = {
    hasLesson: (deckId, lessonId) =>
      readingLists.get(deckId)?.lessons.some((lesson) => lesson.id === lessonId) ?? false,
    openLesson: (deckId, lessonId) => {
      const lesson = readingLists.get(deckId)?.lessons.find((item) => item.id === lessonId);
      if (!lesson) {
        return;
      }
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
        onClose={() => {
          setOpenDeckId(null);
          setOpenLesson(null);
        }}
        onOpenLesson={setOpenLesson}
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
  onClose: () => void;
  onOpenLesson: (lesson: LessonSummary | null) => void;
  readingList: DeckReadingList | null;
}>;

function DeckLessonsSheet({ lesson, onClose, onOpenLesson, readingList }: DeckLessonsSheetProps) {
  const { colors } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(colors);
  const lessons = readingList?.lessons ?? [];

  return (
    <AppBottomSheet onClose={onClose} visible={readingList !== null}>
      {!!readingList && !!lesson && (
        <SheetLessonReader
          deckId={readingList.deckId}
          key={lesson.id}
          lesson={lesson}
          nextLesson={lessons[lessons.findIndex((item) => item.id === lesson.id) + 1]}
          onBack={() => onOpenLesson(null)}
          onClose={onClose}
          onOpenLesson={onOpenLesson}
        />
      )}
      {!lesson && (
        <View accessibilityViewIsModal style={styles.sheet}>
          <SheetHeader
            closeLabel="Close lessons"
            onClose={onClose}
            title={readingList?.deckTitle ?? "Lessons"}
          />
          <BottomSheetScrollView
            contentContainerStyle={styles.content}
            style={[styles.scrollView, { maxHeight: windowHeight * LIST_MAX_HEIGHT_RATIO }]}
          >
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
    scrollView: { flexShrink: 1 },
    sheet: { backgroundColor: colors.surfaceRaised, flexShrink: 1 },
  });
}
