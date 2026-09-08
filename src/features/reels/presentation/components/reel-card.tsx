import { useRef, useState } from "react";
import type { AudioSource } from "expo-audio";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type { Deck } from "@/features/decks/domain/deck.model";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { RecallLevel } from "@/features/study/domain/recall-level";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type ReelCardProps = Readonly<{
  audioSource: AudioSource;
  card: Flashcard;
  deck: Deck;
  appearance: DeckAppearance;
  height: number;
  index: number;
  isActive: boolean;
  onFlip: () => void;
  onRate: (level: RecallLevel) => void;
  recallLevel: RecallLevel | null;
  revealed: boolean;
  showMainFeedLink: boolean;
  total: number;
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
  appearance,
  height,
  index,
  isActive,
  onFlip,
  onRate,
  recallLevel,
  revealed,
  showMainFeedLink,
  total,
  width,
}: ReelCardProps) {
  const openFocusedFeed = useOpenFocusedFeed();
  const [rotation] = useState(() => new Animated.Value(revealed ? 1 : 0));
  const [holdProgress] = useState(() => new Animated.Value(0));
  const flipCount = useRef(revealed ? 1 : 0);
  const holdCompleted = useRef(false);
  const lastTapAt = useRef(0);

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
    if (showMainFeedLink) {
      return;
    }
    holdCompleted.current = false;
    Animated.timing(holdProgress, {
      duration: FOCUS_HOLD_DURATION_MS,
      easing: Easing.linear,
      toValue: 1,
      useNativeDriver: false,
    }).start();
  };

  const cancelFocusHold = () => {
    holdProgress.stopAnimation();
    Animated.timing(holdProgress, {
      duration: 120,
      toValue: 0,
      useNativeDriver: false,
    }).start();
  };

  const completeFocusHold = () => {
    if (showMainFeedLink) {
      return;
    }
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
        <View style={[styles.rule, { backgroundColor: appearance.accentColor }]} />
        <Text style={styles.prompt}>{card.question}</Text>
        <Text style={styles.revealInstruction}>Double tap to reveal the answer</Text>
      </View>
      <View style={styles.hintRow}>
        <Text style={styles.hint}>Swipe up for the next card</Text>
        {!showMainFeedLink ? <Text style={styles.hint}>Hold for Focus</Text> : null}
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
            index={index}
            showMainFeedLink={showMainFeedLink}
            total={total}
          />
          {questionTapArea}
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
            index={index}
            showMainFeedLink={showMainFeedLink}
            total={total}
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
                <View style={[styles.rule, { backgroundColor: appearance.accentColor }]} />
                <Text style={styles.answerPrompt}>{card.question}</Text>
                <Text style={styles.answer}>{card.answer}</Text>
              </View>
            </Pressable>
            <View style={styles.hintRow}>
              <Text style={styles.hint}>Double tap to return</Text>
              <Text style={styles.hint}>Swipe up for the next card</Text>
              {!showMainFeedLink ? <Text style={styles.hint}>Hold for Focus</Text> : null}
            </View>
          </View>
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
  rule: { borderRadius: sizes.radius.small, height: 4, width: 44 },
  prompt: {
    color: palette.textPrimary,
    fontSize: 40,
    fontWeight: "700",
    letterSpacing: -1.4,
    lineHeight: 45,
  },
  answerPrompt: {
    color: palette.textTertiary,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 26,
  },
  answer: {
    color: palette.textPrimary,
    fontSize: 27,
    fontWeight: "600",
    letterSpacing: -0.5,
    lineHeight: 36,
    maxWidth: 480,
  },
  revealInstruction: { color: palette.textHint, fontSize: 16, lineHeight: 24 },
  tapArea: {
    flex: 1,
    justifyContent: "space-between",
    paddingBottom: sizes.spacing.screen,
    paddingTop: sizes.spacing.screen,
  },
  hint: {
    color: palette.textSubtle,
    fontSize: 12,
    letterSpacing: 0.5,
  },
  hintRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sizes.spacing.small,
    justifyContent: "center",
  },
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
  holdLabel: { color: palette.textPrimary, fontSize: 12, fontWeight: "800" },
  holdProgress: { backgroundColor: palette.accent, height: "100%" },
  holdTrack: {
    backgroundColor: palette.controlBorder,
    borderRadius: sizes.radius.pill,
    height: 4,
    overflow: "hidden",
    width: "100%",
  },
});
