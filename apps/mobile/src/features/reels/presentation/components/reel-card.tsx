import { useRecyclingState } from "@shopify/flash-list";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import type { DeckThemeSelection } from "@/features/decks/domain/deck-theme-selection.model";
import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";

import { useFlashcardAudioSource } from "@/features/audio/presentation/controllers/use-flashcard-audio-source";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { useDeckLessons } from "@/features/lessons/presentation/context/deck-lessons-context";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import {
  AnswerBodyLayout,
  AnswerControlRegion,
  AnswerCopy,
} from "@/features/reels/presentation/components/answer-body-layout";
import { GestureFooter } from "@/features/reels/presentation/components/gesture-footer";
import { QuestionFaceContent } from "@/features/reels/presentation/components/question-face-content";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";
import { StudyControlCluster } from "@/features/reels/presentation/components/study-control-cluster";
import { StudyControlLayoutProvider } from "@/features/reels/presentation/context/study-control-layout-context";
import {
  canStartFocusHold,
  FOCUS_HOLD_DURATION_MS,
  HOLD_FEEDBACK_DELAY_MS,
  transitionHoldToFocus,
  type HoldToFocusState,
} from "@/features/reels/presentation/hold-to-focus";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import {
  getReelRotationValue,
  shouldSynchronizeReelRotation,
} from "@/features/reels/presentation/reel-rotation";
import { useTabBarInset } from "@/shared/presentation/context/tab-bar-inset-context";
import {
  hideFlashcardToast,
  showFocusedToast,
  showHoldToast,
} from "@/shared/presentation/flashcard-toast";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

const DOUBLE_TAP_WINDOW_MS = 450;
type CardPageProps = Readonly<{
  backgroundColor: string;
  children: React.ReactNode;
  contentInsetTop: number;
  height: number;
  width: number;
}>;

export function CardPage({
  backgroundColor,
  children,
  contentInsetTop,
  height,
  width,
}: CardPageProps) {
  const styles = createStyles();
  const tabBarInset = useTabBarInset();

  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor,
          height,
          paddingBottom: sizes.spacing.content + tabBarInset,
          paddingTop: sizes.spacing.screen + contentInsetTop,
          width,
        },
      ]}
    >
      {children}
    </View>
  );
}

type ReelCardProps = Readonly<{
  card: Flashcard;
  contentInsetTop: number;
  deck: Deck;
  deckCardCount: number;
  themeSelection: DeckThemeSelection;
  height: number;
  isActive: boolean;
  onFlip: () => void;
  onRate: (rating: Rating) => void;
  ratingEnabled: boolean;
  rating: Rating | null;
  revealed: boolean;
  occurrenceKey: string;
  reelPosition: number;
  showMainFeedLink: boolean;
  width: number;
}>;

export function ReelCard({
  card,
  contentInsetTop,
  deck,
  deckCardCount,
  themeSelection,
  height,
  isActive,
  onFlip,
  onRate,
  ratingEnabled,
  rating,
  revealed,
  occurrenceKey,
  reelPosition,
  showMainFeedLink,
  width,
}: ReelCardProps) {
  const haptics = useHaptics();
  const audioSource = useFlashcardAudioSource(deck, card);
  const { resolvedScheme } = useAppTheme();
  const styles = createStyles();
  const deckTheme = resolveDeckTheme(themeSelection.theme, resolvedScheme);
  const openFocusedFeed = useOpenFocusedFeed();
  const { hasLesson, openLesson } = useDeckLessons();
  const hasLinkedLesson = card.lessonId !== null && hasLesson(card.deckId, card.lessonId);
  const focusedCardState = { cardId: card.id, rating, revealed } as const;
  const openFocusWithCurrentCardState = () => {
    openFocusedFeed(card.deckId, card.id, { cardState: focusedCardState });
  };
  const occurrenceIdentity = `${occurrenceKey}:${reelPosition}`;
  const previousOccurrenceIdentity = useRef(occurrenceIdentity);
  const previousRevealed = useRef(revealed);
  const animationTarget = useRef(revealed);
  const [rotation] = useState(() => new Animated.Value(getReelRotationValue(revealed)));
  const holdState = useRef<HoldToFocusState>("idle");
  const holdCompleted = useRef(false);
  const holdFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);
  const openLessonTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [flipCount, setFlipCount] = useRecyclingState(
    getReelRotationValue(revealed),
    [occurrenceKey, reelPosition],
    () => {
      previousOccurrenceIdentity.current = occurrenceIdentity;
      previousRevealed.current = revealed;
      animationTarget.current = revealed;
      rotation.stopAnimation();
      rotation.setValue(getReelRotationValue(revealed));
      if (holdState.current === "feedback") {
        hideFlashcardToast();
      }
      holdState.current = "idle";
      holdCompleted.current = false;
      lastTapAt.current = 0;
      if (openLessonTimer.current !== null) {
        clearTimeout(openLessonTimer.current);
        openLessonTimer.current = null;
      }
      if (holdFeedbackTimer.current !== null) {
        clearTimeout(holdFeedbackTimer.current);
        holdFeedbackTimer.current = null;
      }
    }
  );

  useLayoutEffect(
    function synchronizeRotationWithRevealedState() {
      const occurrenceChanged = previousOccurrenceIdentity.current !== occurrenceIdentity;
      const revealedChanged = previousRevealed.current !== revealed;
      previousOccurrenceIdentity.current = occurrenceIdentity;
      previousRevealed.current = revealed;
      if (
        !shouldSynchronizeReelRotation(
          occurrenceChanged,
          revealedChanged,
          animationTarget.current,
          revealed
        )
      ) {
        return;
      }
      animationTarget.current = revealed;
      rotation.stopAnimation();
      rotation.setValue(getReelRotationValue(revealed));
      setFlipCount(getReelRotationValue(revealed));
    },
    [occurrenceIdentity, revealed, rotation, setFlipCount]
  );

  const clearHoldFeedbackTimer = () => {
    if (holdFeedbackTimer.current !== null) {
      clearTimeout(holdFeedbackTimer.current);
      holdFeedbackTimer.current = null;
    }
  };

  const resetHoldFeedback = () => {
    clearHoldFeedbackTimer();
    holdState.current = "idle";
    hideFlashcardToast();
  };

  useEffect(function cleanUpHoldFeedback() {
    return function cancelHoldFeedbackOnUnmount() {
      clearHoldFeedbackTimer();
      if (openLessonTimer.current !== null) {
        clearTimeout(openLessonTimer.current);
      }
      if (holdState.current === "feedback") {
        hideFlashcardToast();
      }
      holdState.current = "idle";
    };
  }, []);

  const handleCardPress = () => {
    if (holdCompleted.current) {
      holdCompleted.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapAt.current <= DOUBLE_TAP_WINDOW_MS) {
      lastTapAt.current = 0;
      if (openLessonTimer.current !== null) {
        clearTimeout(openLessonTimer.current);
        openLessonTimer.current = null;
      }
      const nextFlipCount = flipCount === 0 ? 1 : 0;
      animationTarget.current = nextFlipCount === 1;
      setFlipCount(nextFlipCount);
      onFlip();
      Animated.timing(rotation, {
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        toValue: nextFlipCount,
        useNativeDriver: true,
      }).start();
      return;
    }
    lastTapAt.current = now;
    if (revealed && card.lessonId && hasLinkedLesson) {
      const lessonId = card.lessonId;
      openLessonTimer.current = setTimeout(() => {
        openLessonTimer.current = null;
        lastTapAt.current = 0;
        openLesson(card.deckId, lessonId, card.lessonSectionId);
      }, DOUBLE_TAP_WINDOW_MS);
    }
  };

  const startFocusHold = () => {
    if (!canStartFocusHold(isActive, showMainFeedLink)) {
      return;
    }
    resetHoldFeedback();
    holdCompleted.current = false;
    holdFeedbackTimer.current = setTimeout(() => {
      holdFeedbackTimer.current = null;
      const transition = transitionHoldToFocus(holdState.current, "feedback-delay");
      holdState.current = transition.state;
      if (transition.actions.includes("show-hold-toast")) {
        showHoldToast();
      }
    }, HOLD_FEEDBACK_DELAY_MS);
  };

  const cancelFocusHold = () => {
    clearHoldFeedbackTimer();
    const transition = transitionHoldToFocus(holdState.current, "release");
    holdState.current = transition.state;
    if (transition.actions.includes("hide-toast")) {
      hideFlashcardToast();
    }
  };

  const completeFocusHold = () => {
    if (!canStartFocusHold(isActive, showMainFeedLink)) {
      return;
    }
    const transition = transitionHoldToFocus(holdState.current, "complete");
    holdState.current = transition.state;
    if (!transition.actions.includes("open-focus")) {
      return;
    }
    if (transition.actions.includes("hide-toast")) {
      hideFlashcardToast();
    }
    if (transition.actions.includes("show-focused-toast")) {
      showFocusedToast();
    }
    holdCompleted.current = true;
    lastTapAt.current = 0;
    haptics.focusCompleted();
    openFocusWithCurrentCardState();
  };

  const frontRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["-180deg", "0deg"],
  });

  const gestureProps = {
    longPressDuration: FOCUS_HOLD_DURATION_MS,
    onLongPress: completeFocusHold,
    onPress: handleCardPress,
    onPressIn: startFocusHold,
    onPressOut: cancelFocusHold,
  };

  return (
    <View style={[styles.card, { height, width }]}>
      <Animated.View
        pointerEvents={revealed ? "none" : "auto"}
        style={[
          styles.face,
          { height, width },
          { transform: [{ rotateY: frontRotation }, { perspective: 1000 }] },
        ]}
      >
        <CardPage
          backgroundColor={deckTheme.background}
          contentInsetTop={contentInsetTop}
          height={height}
          width={width}
        >
          <ReelHeader
            theme={deckTheme}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            onOpenFocus={showMainFeedLink ? undefined : openFocusWithCurrentCardState}
            showMainFeedLink={showMainFeedLink}
          />
          <QuestionFaceContent
            cardQuestion={card.question}
            instructionColor={deckTheme.textSecondary}
            questionColor={deckTheme.textPrimary}
            {...gestureProps}
          />
          <GestureFooter showHoldHint={!showMainFeedLink} />
        </CardPage>
      </Animated.View>
      <Animated.View
        pointerEvents={revealed ? "auto" : "none"}
        style={[
          styles.face,
          { height, width },
          { transform: [{ rotateY: backRotation }, { perspective: 1000 }] },
        ]}
      >
        <CardPage
          backgroundColor={deckTheme.background}
          contentInsetTop={contentInsetTop}
          height={height}
          width={width}
        >
          <ReelHeader
            theme={deckTheme}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            onOpenFocus={showMainFeedLink ? undefined : openFocusWithCurrentCardState}
            showMainFeedLink={showMainFeedLink}
          />
          <StudyControlLayoutProvider>
            <AnswerBodyLayout>
              <AnswerCopy
                answer={card.answer}
                hasLinkedLesson={hasLinkedLesson}
                answerColor={deckTheme.textPrimary}
                promptColor={deckTheme.textSecondary}
                question={card.question}
                {...gestureProps}
              />
              <AnswerControlRegion>
                <StudyControlCluster
                  audioSource={audioSource}
                  deckId={card.deckId}
                  lessonId={card.lessonId}
                  lessonSectionId={card.lessonSectionId}
                  isActive={isActive}
                  onRate={onRate}
                  ratingEnabled={ratingEnabled}
                  selectedRating={rating}
                />
              </AnswerControlRegion>
            </AnswerBodyLayout>
          </StudyControlLayoutProvider>
          <GestureFooter showHoldHint={!showMainFeedLink} />
        </CardPage>
      </Animated.View>
    </View>
  );
}

function createStyles() {
  return StyleSheet.create({
    card: { overflow: "hidden" },
    face: { backfaceVisibility: "hidden", position: "absolute" },
    page: {
      flex: 1,
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.spacious,
      paddingTop: sizes.spacing.screen,
    },
  });
}
