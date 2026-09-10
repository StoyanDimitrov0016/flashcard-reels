import { useEffect, useRef, useState } from "react";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type { AudioReference } from "@/features/audio/domain/audio-reference";
import type { Deck } from "@/features/decks/domain/deck.model";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { palette } from "@/shared/presentation/palette";
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
const FOCUS_HOLD_DURATION_MS = 900;
const HOLD_FEEDBACK_DELAY_MS = 150;

type GestureHintProps = Readonly<{
  label: string;
  symbol: SymbolViewProps["name"];
}>;

function GestureHint({ label, symbol }: GestureHintProps) {
  return (
    <View accessible accessibilityLabel={label} style={styles.gestureHint}>
      <SymbolView name={symbol} size={sizes.icon.small} tintColor={palette.textMuted} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

type GestureFooterProps = Readonly<{ showMainFeedLink: boolean }>;

function GestureFooter({ showMainFeedLink }: GestureFooterProps) {
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
      {!showMainFeedLink ? (
        <GestureHint
          label="Hold"
          symbol={{ android: "pan_tool", ios: "hand.raised.fill", web: "pan_tool" }}
        />
      ) : null}
    </View>
  );
}

function CardPage({ backgroundColor, children, height, width }: CardPageProps) {
  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor,
          height,
          width,
        },
      ]}
    >
      {children}
    </View>
  );
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
  showMainFeedLink,
  width,
}: ReelCardProps) {
  const openFocusedFeed = useOpenFocusedFeed();
  const [rotation] = useState(() => new Animated.Value(revealed ? 1 : 0));
  const [holdProgress] = useState(() => new Animated.Value(0));
  const flipCount = useRef(revealed ? 1 : 0);
  const holdCompleted = useRef(false);
  const holdFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTapAt = useRef(0);

  const resetHoldFeedback = () => {
    if (holdFeedbackTimer.current !== null) {
      clearTimeout(holdFeedbackTimer.current);
      holdFeedbackTimer.current = null;
    }
    holdProgress.stopAnimation();
    holdProgress.setValue(0);
  };

  useEffect(
    function cleanUpHoldFeedback() {
      return function cancelHoldFeedbackOnUnmount() {
        if (holdFeedbackTimer.current !== null) {
          clearTimeout(holdFeedbackTimer.current);
        }
        holdProgress.stopAnimation();
      };
    },
    [holdProgress]
  );

  const handleCardPress = () => {
    if (holdCompleted.current) {
      holdCompleted.current = false;
      return;
    }
    const now = Date.now();
    if (now - lastTapAt.current <= DOUBLE_TAP_WINDOW_MS) {
      lastTapAt.current = 0;
      flipCount.current += 1;

      onFlip();
      Animated.timing(rotation, {
        duration: 520,
        easing: Easing.inOut(Easing.cubic),
        toValue: flipCount.current,
        useNativeDriver: true,
      }).start();
      return;
    }

    lastTapAt.current = now;
  };

  const startFocusHold = () => {
    if (!isActive || showMainFeedLink) {
      return;
    }
    resetHoldFeedback();
    holdCompleted.current = false;
    holdFeedbackTimer.current = setTimeout(() => {
      holdFeedbackTimer.current = null;
      Animated.timing(holdProgress, {
        duration: FOCUS_HOLD_DURATION_MS - HOLD_FEEDBACK_DELAY_MS,
        easing: Easing.linear,
        toValue: 1,
        useNativeDriver: false,
      }).start();
    }, HOLD_FEEDBACK_DELAY_MS);
  };

  const cancelFocusHold = () => {
    resetHoldFeedback();
  };

  const completeFocusHold = () => {
    if (!isActive || showMainFeedLink) {
      return;
    }
    resetHoldFeedback();
    holdCompleted.current = true;
    lastTapAt.current = 0;
    openFocusedFeed(card.deckId);
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
      accessibilityLabel={`Flashcard question: ${card.question}`}
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
        <CardPage backgroundColor={appearance.backgroundColor} height={height} width={width}>
          <ReelHeader
            appearance={appearance}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            showMainFeedLink={showMainFeedLink}
          />
          {questionTapArea}
          <GestureFooter showMainFeedLink={showMainFeedLink} />
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
        <CardPage backgroundColor={appearance.backgroundColor} height={height} width={width}>
          <ReelHeader
            appearance={appearance}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            showMainFeedLink={showMainFeedLink}
          />
          <View style={styles.answerContent}>
            <Pressable
              accessibilityHint="Double tap to return to the question"
              accessibilityLabel={`Flashcard answer: ${card.answer}`}
              accessibilityRole="button"
              delayLongPress={FOCUS_HOLD_DURATION_MS}
              onLongPress={completeFocusHold}
              onPress={handleCardPress}
              onPressIn={startFocusHold}
              onPressOut={cancelFocusHold}
              style={styles.tapArea}
            >
              <View style={styles.copy}>
                <Text style={styles.answerPrompt}>{card.question}</Text>
                <Text style={styles.answer}>{card.answer}</Text>
              </View>
            </Pressable>
          </View>
          <GestureFooter showMainFeedLink={showMainFeedLink} />
          <View style={styles.controlRail}>
            <RecallControls onSelect={onRate} selectedLevel={recallLevel} />
            <AnswerAudioPlayer isActive={isActive} source={audioSource} />
          </View>
        </CardPage>
      </Animated.View>
      {!showMainFeedLink ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.holdCue,
            {
              opacity: holdProgress,
            },
          ]}
        >
          <Text style={styles.holdLabel}>Hold to Focus</Text>
          <View style={styles.holdTrack}>
            <Animated.View
              style={[
                styles.holdProgress,
                {
                  width: holdProgress.interpolate({
                    inputRange: [0, 1],
                    outputRange: ["0%", "100%"],
                  }),
                },
              ]}
            />
          </View>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  face: { backfaceVisibility: "hidden", position: "absolute" },
  page: {
    justifyContent: "space-between",
    paddingBottom: sizes.spacing.screen,
    paddingHorizontal: sizes.spacing.spacious,
    paddingTop: sizes.spacing.screen,
  },
  answerContent: { flex: 1 },
  copy: { gap: 22, paddingRight: 56 },
  controlRail: {
    alignItems: "center",
    gap: sizes.spacing.xLarge,
    position: "absolute",
    right: sizes.spacing.section,
    top: "32%",
  },
  prompt: {
    color: palette.textPrimary,
    fontSize: fontSize.hero,
    fontWeight: fontWeight.bold,
    letterSpacing: letterSpacing.tightest,
    lineHeight: lineHeight.hero,
  },
  answerPrompt: {
    color: palette.textSecondary,
    fontSize: fontSize.title3,
    fontWeight: fontWeight.semibold,
    lineHeight: lineHeight.title3,
  },
  answer: {
    color: palette.textPrimary,
    fontSize: fontSize.heading1,
    fontWeight: fontWeight.semibold,
    letterSpacing: letterSpacing.tight,
    lineHeight: lineHeight.heading1,
    maxWidth: 480,
  },
  revealInstruction: {
    color: palette.textMuted,
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
    color: palette.textMuted,
    fontSize: fontSize.caption,
    letterSpacing: letterSpacing.wider,
  },
  hintRow: {
    alignItems: "center",
    alignSelf: "center",
    columnGap: sizes.spacing.section,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    rowGap: sizes.spacing.small,
    width: "100%",
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
  holdCue: {
    alignItems: "center",
    backgroundColor: palette.controlOverlay,
    borderBottomColor: palette.controlBorder,
    borderBottomWidth: sizes.border,
    borderTopColor: palette.controlBorder,
    borderTopWidth: sizes.border,
    gap: sizes.spacing.medium,
    left: 0,
    paddingHorizontal: sizes.spacing.section,
    paddingVertical: sizes.spacing.xLarge,
    position: "absolute",
    right: 0,
    top: 72,
    zIndex: 2,
  },
  holdLabel: {
    color: palette.textPrimary,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.heavy,
  },
  holdProgress: { backgroundColor: palette.actionPrimary, height: "100%" },
  holdTrack: {
    backgroundColor: palette.controlBorder,
    borderRadius: sizes.radius.pill,
    height: 4,
    overflow: "hidden",
    width: "100%",
  },
});
