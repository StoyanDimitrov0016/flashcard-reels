import { useRef, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import type { Rating } from "@/features/learning-engine/domain/rating";

import { CardKindTag } from "@/features/challenge-lab/presentation/components/card-kind-tag";
import {
  AnswerBodyLayout,
  AnswerControlRegion,
  AnswerCopy,
} from "@/features/reels/presentation/components/answer-body-layout";
import { GestureFooter } from "@/features/reels/presentation/components/gesture-footer";
import { QuestionFaceContent } from "@/features/reels/presentation/components/question-face-content";
import { RecallControls } from "@/features/reels/presentation/components/recall-controls";
import { CardPage } from "@/features/reels/presentation/components/reel-card";
import { ReelHeader } from "@/features/reels/presentation/components/reel-header";
import { StudyControlLayoutProvider } from "@/features/reels/presentation/context/study-control-layout-context";
import { FOCUS_HOLD_DURATION_MS } from "@/features/reels/presentation/hold-to-focus";
import { getReelRotationValue } from "@/features/reels/presentation/reel-rotation";

const DOUBLE_TAP_WINDOW_MS = 450;
const FLIP_DURATION_MS = 520;

type FlashcardReelCardProps = Readonly<{
  answer: string;
  /** The flashcard and deck the production header reads its label from. */
  card: Flashcard;
  contentInsetTop: number;
  deck: Deck;
  deckCardCount: number;
  height: number;
  /** Rating a flashcard is how the learner answers it; a new idea is only read. */
  onRate: ((rating: Rating) => void) | null;
  question: string;
  rating: Rating | null;
  tag: "idea" | "flashcard";
  theme: DeckThemeVariant;
  width: number;
}>;

/** A two-sided reel, as in the study feeds: double tap turns it over to the answer. */
export function FlashcardReelCard({
  answer,
  card,
  contentInsetTop,
  deck,
  deckCardCount,
  height,
  onRate,
  question,
  rating,
  tag,
  theme,
  width,
}: FlashcardReelCardProps) {
  const [revealed, setRevealed] = useState(rating !== null);
  const [rotation] = useState(() => new Animated.Value(getReelRotationValue(revealed)));
  const lastTapAt = useRef(0);

  const flip = () => {
    const next = !revealed;
    setRevealed(next);
    Animated.timing(rotation, {
      duration: FLIP_DURATION_MS,
      easing: Easing.inOut(Easing.cubic),
      toValue: getReelRotationValue(next),
      useNativeDriver: true,
    }).start();
  };

  const gestures = {
    longPressDuration: FOCUS_HOLD_DURATION_MS,
    onLongPress: () => undefined,
    onPress: () => {
      const now = Date.now();
      if (now - lastTapAt.current <= DOUBLE_TAP_WINDOW_MS) {
        lastTapAt.current = 0;
        flip();
        return;
      }
      lastTapAt.current = now;
    },
    onPressIn: () => undefined,
    onPressOut: () => undefined,
  };

  const frontRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "180deg"],
  });
  const backRotation = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ["-180deg", "0deg"],
  });

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
          backgroundColor={theme.background}
          contentInsetTop={contentInsetTop}
          height={height}
          width={width}
        >
          <ReelHeader
            accessory={<CardKindTag kind={tag} />}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            showMainFeedLink
            theme={theme}
          />
          <QuestionFaceContent
            cardQuestion={question}
            instructionColor={theme.textSecondary}
            questionColor={theme.textPrimary}
            {...gestures}
          />
          <GestureFooter showHoldHint={false} />
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
          backgroundColor={theme.background}
          contentInsetTop={contentInsetTop}
          height={height}
          width={width}
        >
          <ReelHeader
            accessory={<CardKindTag kind={tag} />}
            card={card}
            deck={deck}
            deckCardCount={deckCardCount}
            showMainFeedLink
            theme={theme}
          />
          <StudyControlLayoutProvider>
            <AnswerBodyLayout>
              <AnswerCopy
                answer={answer}
                answerColor={theme.textPrimary}
                hasLinkedLesson={false}
                promptColor={theme.textSecondary}
                question={question}
                {...gestures}
              />
              {onRate && (
                <AnswerControlRegion>
                  <RecallControls onSelect={onRate} ratingEnabled selectedRating={rating} />
                </AnswerControlRegion>
              )}
            </AnswerBodyLayout>
          </StudyControlLayoutProvider>
          <GestureFooter showHoldHint={false} />
        </CardPage>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  face: { backfaceVisibility: "hidden", position: "absolute" },
});
