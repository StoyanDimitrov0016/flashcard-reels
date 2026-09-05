import { useRef, useState } from "react";
import type { AudioSource } from "expo-audio";
import { Animated, Easing, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import { AnswerAudioPlayer } from "@/features/audio/components/answer-audio-player";
import type { Deck } from "@/features/decks/domain/deck.model";
import { RecallControls } from "@/features/reels/components/recall-controls";
import { ReelHeader } from "@/features/reels/components/reel-header";
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
  bottomInset: number;
  children: React.ReactNode;
  height: number;
  topInset: number;
  width: number;
}>;

const DOUBLE_TAP_WINDOW_MS = 450;

function CardPage({
  backgroundColor,
  bottomInset,
  children,
  height,
  topInset,
  width,
}: CardPageProps) {
  return (
    <View
      style={[
        styles.page,
        {
          backgroundColor,
          height,
          paddingBottom: Math.max(bottomInset, sizes.spacing.screen),
          paddingTop: Math.max(topInset, sizes.spacing.screen),
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
  const insets = useSafeAreaInsets();
  const [rotation] = useState(() => new Animated.Value(revealed ? 1 : 0));
  const flipCount = useRef(revealed ? 1 : 0);
  const lastTapAt = useRef(0);

  const handleCardPress = () => {
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
      onPress={handleCardPress}
      style={styles.tapArea}
    >
      <View style={styles.copy}>
        <View style={[styles.rule, { backgroundColor: appearance.accentColor }]} />
        <Text style={styles.prompt}>{card.question}</Text>
        <Text style={styles.revealInstruction}>Double tap to reveal the answer</Text>
      </View>
      <Text style={styles.hint}>Swipe up for the next card</Text>
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
        <CardPage
          backgroundColor={appearance.backgroundColor}
          bottomInset={insets.bottom}
          height={height}
          topInset={insets.top}
          width={width}
        >
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
        <CardPage
          backgroundColor={appearance.backgroundColor}
          bottomInset={insets.bottom}
          height={height}
          topInset={insets.top}
          width={width}
        >
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
              onPress={handleCardPress}
              style={styles.tapArea}
            >
              <View style={styles.copy}>
                <View style={[styles.rule, { backgroundColor: appearance.accentColor }]} />
                <Text style={styles.answerPrompt}>{card.question}</Text>
                <Text style={styles.answer}>{card.answer}</Text>
              </View>
            </Pressable>
            <AnswerAudioPlayer isActive={isActive} source={audioSource} />
            <View style={styles.hintRow}>
              <Text style={styles.hint}>Double tap to return</Text>
              <Text style={styles.hint}>Swipe up for the next card</Text>
            </View>
          </View>
          <RecallControls onSelect={onRate} selectedLevel={recallLevel} />
        </CardPage>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  face: { backfaceVisibility: "hidden", position: "absolute" },
  page: { justifyContent: "space-between", paddingHorizontal: sizes.spacing.spacious },
  answerContent: { flex: 1 },
  copy: { gap: 22, paddingRight: 56 },
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
    gap: sizes.spacing.small,
    justifyContent: "center",
  },
});
