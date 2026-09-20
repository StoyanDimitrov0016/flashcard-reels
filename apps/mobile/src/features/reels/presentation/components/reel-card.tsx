import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { useRecyclingState } from "@shopify/flash-list";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Deck } from "@/features/decks/domain/deck.model";
import {
  AnswerBodyLayout,
  AnswerControlRegion,
  AnswerCopy,
} from "@/features/reels/presentation/components/answer-body-layout";
import { GestureFooter } from "@/features/reels/presentation/components/gesture-footer";
import { QuestionFaceContent } from "@/features/reels/presentation/components/question-face-content";
import { StudyControlCluster } from "@/features/reels/presentation/components/study-control-cluster";
import { StudyControlLayoutProvider } from "@/features/reels/presentation/context/study-control-layout-context";
import {
  getReelRotationValue,
  shouldSynchronizeReelRotation,
} from "@/features/reels/presentation/reel-rotation";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import {
  canStartFocusHold,
  FOCUS_HOLD_DURATION_MS,
  HOLD_FEEDBACK_DELAY_MS,
  transitionHoldToFocus,
  type HoldToFocusState,
} from "@/features/reels/presentation/hold-to-focus";
import {
  hideFlashcardToast,
  showFocusedToast,
  showHoldToast,
} from "@/shared/presentation/flashcard-toast";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import { useAppTheme } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";

const DOUBLE_TAP_WINDOW_MS = 450;
type CardPageProps = Readonly<{
  backgroundColor: string;
  children: React.ReactNode;
  height: number;
  width: number;
}>;

function CardPage({ backgroundColor, children, height, width }: CardPageProps) {
  const styles = createStyles();

  return <View style={[styles.page, { backgroundColor, height, width }]}>{children}</View>;
}

type ReelCardProps = Readonly<{
  audioSource: AudioReference;
  card: Flashcard;
  deck: Deck;
  deckCardCount: number;
  appearance: DeckAppearance;
  height: number;
  isActive: boolean;
  onFlip: () => void;
  onRate: (level: RecallLevel) => void;
  ratingEnabled: boolean;
  recallLevel: RecallLevel | null;
  revealed: boolean;
  occurrenceKey: string;
  reelPosition: number;
  showMainFeedLink: boolean;
  width: number;
}>;

export function ReelCard({
  audioSource,
  card,
  deck,
  deckCardCount,
  appearance,
  height,
  isActive,
  onFlip,
  onRate,
  ratingEnabled,
  recallLevel,
  revealed,
  occurrenceKey,
  reelPosition,
  showMainFeedLink,
  width,
}: ReelCardProps) {
  const haptics = useHaptics();
  const { resolvedScheme } = useAppTheme();
  const styles = createStyles();
  const reelAppearance = resolveDeckAppearance(appearance.presetId, resolvedScheme);
  const openFocusedFeed = useOpenFocusedFeed();
  const focusedCardState = { cardId: card.id, recallLevel, revealed } as const;
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
        <CardPage backgroundColor={reelAppearance.background} height={height} width={width}>
          <ReelHeader
            appearance={reelAppearance}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            onOpenFocus={showMainFeedLink ? undefined : openFocusWithCurrentCardState}
            showMainFeedLink={showMainFeedLink}
          />
          <QuestionFaceContent
            cardQuestion={card.question}
            instructionColor={reelAppearance.textSecondary}
            questionColor={reelAppearance.textPrimary}
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
        <CardPage backgroundColor={reelAppearance.background} height={height} width={width}>
          <ReelHeader
            appearance={reelAppearance}
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
                answerColor={reelAppearance.textPrimary}
                promptColor={reelAppearance.textSecondary}
                question={card.question}
                {...gestureProps}
              />
              <AnswerControlRegion>
                <StudyControlCluster
                  audioSource={audioSource}
                  isActive={isActive}
                  onRate={onRate}
                  ratingEnabled={ratingEnabled}
                  selectedLevel={recallLevel}
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
