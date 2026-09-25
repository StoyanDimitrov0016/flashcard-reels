import { BottomSheetScrollView } from "@expo/ui/community/bottom-sheet";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { createContext, type ReactNode, useContext, useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { DeckReadingList, LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckContentRevision } from "@/features/decks/presentation/context/deck-content-context";
import { useLessonsCapability } from "@/features/lessons/presentation/dependencies/use-lessons";
import { getLessonHref } from "@/features/lessons/presentation/lesson-href";
import { reportError } from "@/shared/errors/report-error";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type DeckLessonsContextValue = Readonly<{
  hasLessons: (deckId: DeckId) => boolean;
  openLessons: (deckId: DeckId) => void;
}>;

const DeckLessonsContext = createContext<DeckLessonsContextValue | null>(null);

type DeckLessonsProviderProps = Readonly<{ children: ReactNode }>;

/**
 * Loads each deck's lessons once for every card in the feed, and owns the one sheet that lists a
 * deck's lessons. Opening a lesson pushes it over the feed, so Back returns to the same card.
 */
export function DeckLessonsProvider({ children }: DeckLessonsProviderProps) {
  const router = useRouter();
  const { lessonService } = useLessonsCapability();
  const { revision } = useDeckContentRevision();
  const [readingLists, setReadingLists] = useState<ReadonlyMap<DeckId, DeckReadingList>>(
    () => new Map()
  );
  const [openDeckId, setOpenDeckId] = useState<DeckId | null>(null);

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
    hasLessons: (deckId) => (readingLists.get(deckId)?.lessons.length ?? 0) > 0,
    openLessons: setOpenDeckId,
  };
  const openList = openDeckId ? (readingLists.get(openDeckId) ?? null) : null;

  return (
    <DeckLessonsContext.Provider value={value}>
      {children}
      <DeckLessonsSheet
        onClose={() => setOpenDeckId(null)}
        onOpenLesson={(lesson) => {
          setOpenDeckId(null);
          router.push(getLessonHref(lesson.id));
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
  onClose: () => void;
  onOpenLesson: (lesson: LessonSummary) => void;
  readingList: DeckReadingList | null;
}>;

function DeckLessonsSheet({ onClose, onOpenLesson, readingList }: DeckLessonsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const lessons = readingList?.lessons ?? [];

  return (
    <AppBottomSheet onClose={onClose} visible={readingList !== null}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <SheetHeader
          closeLabel="Close lessons"
          onClose={onClose}
          title={readingList?.deckTitle ?? "Lessons"}
        />
        <BottomSheetScrollView contentContainerStyle={styles.content} style={styles.scrollView}>
          <View style={styles.group}>
            {lessons.map((lesson, index) => (
              <Pressable
                accessibilityHint="Opens the lesson"
                accessibilityLabel={`Lesson ${lesson.order + 1}: ${lesson.title}`}
                accessibilityRole="button"
                key={lesson.id}
                onPress={() => onOpenLesson(lesson)}
                style={({ pressed }) => [
                  styles.row,
                  index > 0 && styles.divider,
                  pressed && styles.pressed,
                ]}
              >
                <Text numberOfLines={1} style={styles.position}>
                  {lesson.order + 1}
                </Text>
                <Text numberOfLines={2} style={styles.lessonTitle}>
                  {lesson.title}
                </Text>
                <SymbolView
                  name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
                  size={sizes.icon.small}
                  tintColor={colors.textTertiary}
                />
              </Pressable>
            ))}
          </View>
        </BottomSheetScrollView>
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: { paddingBottom: sizes.spacing.spacious, paddingHorizontal: sizes.spacing.content },
    divider: { borderTopColor: colors.borderSubtle, borderTopWidth: sizes.border },
    group: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      overflow: "hidden",
    },
    lessonTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.bodyLarge,
    },
    position: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      minWidth: 22,
      textAlign: "center",
    },
    pressed: { backgroundColor: colors.surfaceHover },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.large,
      minHeight: sizes.control.standard + sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    scrollView: { flexShrink: 1 },
    sheet: { flexShrink: 1 },
  });
}
