import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";

import type { Idea } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import {
  ChallengeNote,
  outcomeColor,
} from "@/features/challenge-lab/presentation/components/challenge-note";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

/** Long enough to see which answers were right before the note slides in. */
const NOTE_DELAY_MS = 700;
const DOT_SIZE = 6;

const answersPage = 0;
const notePage = 1;

type ChallengePanelProps = Readonly<{
  /** The quiz's own answering surface: options, a word bank, or a board of pairs. */
  answers: ReactNode;
  explanation: string | null;
  explanationCandidates: readonly string[];
  idea: Idea;
  outcome: Outcome | null;
  /** Picks the note's encouragement, so each reel keeps its own wording. */
  seed: string;
  theme: DeckThemeVariant;
}>;

/**
 * A tinted tray holding two pages: the answers, then the note. Both are laid out from the start,
 * so the tray is always as tall as the taller page and answering never moves the card. After an
 * answer the note slides in, and the learner can swipe or tap a dot to see their answer again.
 */
export function ChallengePanel({
  answers,
  explanation,
  explanationCandidates,
  idea,
  outcome,
  seed,
  theme,
}: ChallengePanelProps) {
  const { colors } = useAppTheme();
  const answered = outcome !== null;
  // After an answer the tray takes on the result's color, like a feedback banner.
  const wash = outcome === null ? theme.accent : outcomeColor(outcome, colors);
  const styles = createStyles(wash, answered);
  const scroller = useRef<ScrollView>(null);
  const answeredOnMount = useRef(answered);
  const positioned = useRef(false);
  const [width, setWidth] = useState(0);
  const [page, setPage] = useState(answered ? notePage : answersPage);

  const showPage = (next: number) => {
    setPage(next);
    scroller.current?.scrollTo({ animated: true, x: next * width, y: 0 });
  };

  useEffect(
    function slideToNoteAfterAnswering() {
      if (!answered || answeredOnMount.current || width === 0) {
        return undefined;
      }
      answeredOnMount.current = true;
      const timer = setTimeout(() => {
        setPage(notePage);
        scroller.current?.scrollTo({ animated: true, x: width, y: 0 });
      }, NOTE_DELAY_MS);
      return function cancelNoteSlide() {
        clearTimeout(timer);
      };
    },
    [answered, width]
  );

  const measure = (event: LayoutChangeEvent) => {
    setWidth(Math.floor(event.nativeEvent.layout.width));
  };
  const settle = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (width > 0) {
      setPage(Math.round(event.nativeEvent.contentOffset.x / width));
    }
  };

  return (
    <View style={styles.panel}>
      <View onLayout={measure}>
        {width > 0 && (
          <ScrollView
            horizontal
            onContentSizeChange={() => {
              // A card answered earlier reopens on its note.
              if (!positioned.current) {
                positioned.current = true;
                if (answeredOnMount.current) {
                  scroller.current?.scrollTo({ animated: false, x: width, y: 0 });
                }
              }
            }}
            onMomentumScrollEnd={settle}
            pagingEnabled
            ref={scroller}
            scrollEnabled={answered}
            showsHorizontalScrollIndicator={false}
          >
            <View style={[styles.page, styles.answersPage, { width }]}>{answers}</View>
            <View
              accessibilityElementsHidden={!answered}
              importantForAccessibility={answered ? "auto" : "no-hide-descendants"}
              style={[styles.page, { width }, !answered && styles.hidden]}
            >
              <ChallengeNote
                explanation={explanation}
                explanationCandidates={explanationCandidates}
                idea={idea}
                outcome={outcome}
                seed={seed}
                theme={theme}
              />
            </View>
          </ScrollView>
        )}
      </View>
      <View
        accessibilityElementsHidden={!answered}
        importantForAccessibility={answered ? "auto" : "no-hide-descendants"}
        style={[styles.dots, !answered && styles.hidden]}
      >
        {[answersPage, notePage].map((dot) => (
          <Pressable
            accessibilityLabel={dot === notePage ? "Show explanation" : "Show your answer"}
            accessibilityRole="button"
            accessibilityState={{ selected: dot === page }}
            disabled={!answered}
            hitSlop={sizes.spacing.medium}
            key={dot}
            onPress={() => showPage(dot)}
            style={[styles.dot, dot === page && styles.dotActive]}
          />
        ))}
      </View>
    </View>
  );
}

function createStyles(wash: string, answered: boolean) {
  return StyleSheet.create({
    // A faint wash of the deck accent sets the challenge apart from the card without a new color.
    panel: {
      backgroundColor: `${wash}${answered ? "1F" : "14"}`,
      borderColor: `${wash}${answered ? "40" : "1F"}`,
      borderRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      gap: sizes.spacing.medium,
      maxWidth: sizes.study.answerMaxWidth,
      overflow: "hidden",
      paddingTop: sizes.spacing.section,
    },
    page: { paddingHorizontal: sizes.spacing.section },
    answersPage: { gap: sizes.spacing.xLarge, justifyContent: "center" },
    dots: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "center",
      paddingBottom: sizes.spacing.xLarge,
    },
    dot: {
      backgroundColor: `${wash}40`,
      borderRadius: sizes.radius.pill,
      height: DOT_SIZE,
      width: DOT_SIZE,
    },
    dotActive: { backgroundColor: wash, width: DOT_SIZE * 3 },
    hidden: { opacity: 0 },
  });
}
