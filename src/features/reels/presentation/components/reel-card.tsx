import { useEffect, useRef, useState } from "react";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useRecyclingState } from "@shopify/flash-list";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Deck } from "@/features/decks/domain/deck.model";
import { StudyControlCluster } from "@/features/reels/presentation/components/study-control-cluster";
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
import { useHaptics } from "@/features/preferences/presentation/hooks/use-haptics";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

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
  recallLevel: RecallLevel | null;
  revealed: boolean;
  occurrenceKey: string;
  reelPosition: number;
  showMainFeedLink: boolean;
  width: number;
}>;
type CardPageProps = Readonly<{
  backgroundColor: string;
  children: React.ReactNode;
  height: number;
  width: number;
}>;

const DOUBLE_TAP_WINDOW_MS = 450;
type GestureHintProps = Readonly<{
  label: string;
  symbol: SymbolViewProps["name"];
}>;

function GestureHint({ label, symbol }: GestureHintProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View accessible accessibilityLabel={label} style={styles.gestureHint}>
      <SymbolView name={symbol} size={sizes.icon.small} tintColor={colors.textTertiary} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

type GestureFooterProps = Readonly<{ showHoldHint: boolean }>;

function GestureFooter({ showHoldHint }: GestureFooterProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.gestureFooter}>
      <GestureHint
        label="Swipe up"
        symbol={{ android: "arrow_upward", ios: "arrow.up", web: "arrow_upward" }}
      />
      <GestureHint
        label="Double tap"
        symbol={{ android: "touch_app", ios: "hand.tap.fill", web: "touch_app" }}
      />
      {showHoldHint ? (
        <GestureHint
          label="Hold"
          symbol={{ android: "pan_tool", ios: "hand.raised.fill", web: "pan_tool" }}
        />
      ) : null}
    </View>
  );
}

function CardPage({ backgroundColor, children, height, width }: CardPageProps) {
  const styles = createStyles(useAppTheme().colors);

  return <View style={[styles.page, { backgroundColor, height, width }]}>{children}</View>;
}

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
  recallLevel,
  revealed,
  occurrenceKey,
  reelPosition,
  showMainFeedLink,
  width,
}: ReelCardProps) {
  const { preferences } = usePreferences();
  const haptics = useHaptics();
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const reelAppearance = resolveDeckAppearance(appearance.presetId, resolvedScheme);
  const answerInsetStyle =
    preferences.recollectionIslandPosition === "left" ? styles.copyLeftIsland : undefined;
  const openFocusedFeed = useOpenFocusedFeed();
  const [rotation] = useState(() => new Animated.Value(revealed ? 1 : 0));
  const holdState = useRef<HoldToFocusState>("idle");
  const holdCompleted = useRef(false);
  const holdFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);
  const [flipCount, setFlipCount] = useRecyclingState(
    revealed ? 1 : 0,
    [occurrenceKey, reelPosition],
    () => {
      rotation.stopAnimation();
      rotation.setValue(revealed ? 1 : 0);
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
      const nextFlipCount = flipCount + 1;
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
    openFocusedFeed(card.deckId, card.id, {
      cardState: { cardId: card.id, recallLevel, revealed },
    });
  };

  const frontRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["-180deg", "0deg"],
  });

  const questionTapArea = (
    <Pressable
      accessibilityHint="Double tap to reveal the answer"
      accessibilityLabel={"Flashcard question: " + card.question}
      accessibilityRole="button"
      delayLongPress={FOCUS_HOLD_DURATION_MS}
      onLongPress={completeFocusHold}
      onPress={handleCardPress}
      onPressIn={startFocusHold}
      onPressOut={cancelFocusHold}
      style={styles.tapArea}
    >
      <View style={styles.copy}>
        <Text style={styles.prompt}>{card.question}</Text>
        <Text style={styles.revealInstruction}>Double tap to reveal the answer</Text>
      </View>
    </Pressable>
  );

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
            showMainFeedLink={showMainFeedLink}
          />
          {questionTapArea}
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
            showMainFeedLink={showMainFeedLink}
          />
          <View style={styles.answerContent}>
            <Pressable
              accessibilityHint="Double tap to return to the question"
              accessibilityLabel={"Flashcard answer: " + card.answer}
              accessibilityRole="button"
              delayLongPress={FOCUS_HOLD_DURATION_MS}
              onLongPress={completeFocusHold}
              onPress={handleCardPress}
              onPressIn={startFocusHold}
              onPressOut={cancelFocusHold}
              style={styles.tapArea}
            >
              <View style={[styles.copy, answerInsetStyle]}>
                <Text style={styles.answerPrompt}>{card.question}</Text>
                <Text style={styles.answer}>{card.answer}</Text>
              </View>
            </Pressable>
          </View>
          <GestureFooter showHoldHint={!showMainFeedLink} />
          <StudyControlCluster
            audioEnabled={preferences.audioEnabled}
            audioSide={preferences.audioSide}
            audioSource={audioSource}
            isActive={isActive}
            onRate={onRate}
            position={preferences.recollectionIslandPosition}
            ratingDirection={preferences.ratingDirection}
            selectedLevel={recallLevel}
          />
        </CardPage>
      </Animated.View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: { overflow: "hidden" },
    face: { backfaceVisibility: "hidden", position: "absolute" },
    page: {
      justifyContent: "space-between",
      paddingBottom: sizes.spacing.screen,
      paddingHorizontal: sizes.spacing.spacious,
      paddingTop: sizes.spacing.screen,
    },
    answerContent: { flex: 1 },
    copy: { gap: 22 },
    copyLeftIsland: { paddingLeft: 76 },
    prompt: {
      color: colors.textPrimary,
      fontSize: fontSize.hero,
      fontWeight: fontWeight.bold,
      letterSpacing: letterSpacing.tightest,
      lineHeight: lineHeight.hero,
    },
    answerPrompt: {
      color: colors.textSecondary,
      fontSize: fontSize.title3,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.title3,
    },
    answer: {
      color: colors.textPrimary,
      fontSize: fontSize.heading1,
      fontWeight: fontWeight.semibold,
      letterSpacing: letterSpacing.tight,
      lineHeight: lineHeight.heading1,
      maxWidth: 480,
    },
    revealInstruction: {
      color: colors.textTertiary,
      fontSize: fontSize.callout,
      lineHeight: lineHeight.subhead,
    },
    tapArea: {
      flex: 1,
      justifyContent: "space-between",
      paddingBottom: sizes.spacing.screen,
      paddingTop: sizes.spacing.screen,
    },
    hint: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      letterSpacing: letterSpacing.wider,
    },
    gestureFooter: {
      alignItems: "center",
      bottom: sizes.spacing.screen,
      columnGap: sizes.spacing.section,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      left: sizes.spacing.spacious,
      position: "absolute",
      right: sizes.spacing.spacious,
      rowGap: sizes.spacing.small,
    },
    gestureHint: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xSmall },
  });
}
