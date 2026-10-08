import { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

import type { Idea, MatchChallenge } from "@/features/challenge-lab/domain/idea-deck";
import type { Outcome } from "@/features/challenge-lab/domain/pacing-composer";
import type { ItemResponse } from "@/features/challenge-lab/presentation/challenge-lab-feed";
import type { DeckThemeVariant } from "@/features/decks/presentation/deck-theme-presets";

import { mixColors } from "@/features/challenge-lab/presentation/color-mix";
import { ChallengePanel } from "@/features/challenge-lab/presentation/components/challenge-panel";
import {
  ChunkyButton,
  type ChunkyTone,
} from "@/features/challenge-lab/presentation/components/chunky-button";
import {
  QuizLayout,
  QuizPrompt,
} from "@/features/challenge-lab/presentation/components/quiz-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

const TILE_HEIGHT = 64;
/** How long a wrong pair stays red before both tiles reset. */
const WRONG_FLASH_MS = 650;

type Side = "left" | "right";
type Tile = Readonly<{ side: Side; pair: number }>;
type TileState = "idle" | "selected" | "matched" | "wrong";

const noPairs: readonly number[] = [];

type MatchQuizProps = Readonly<{
  challenge: MatchChallenge;
  idea: Idea;
  onRespond: (response: ItemResponse) => void;
  optionOrder: readonly string[];
  outcome: Outcome | null;
  response: ItemResponse | undefined;
  seed: string;
  theme: DeckThemeVariant;
}>;

/**
 * Two columns to pair up by tapping one tile, then its partner. A right pair turns green; a wrong
 * one flashes red and shakes, and counts as a mistake. The quiz ends once every pair is found.
 */
export function MatchQuiz({
  challenge,
  idea,
  onRespond,
  optionOrder,
  outcome,
  response,
  seed,
  theme,
}: MatchQuizProps) {
  const match = response?.format === "match" ? response : null;
  const matched = match?.matched ?? noPairs;
  const mistakes = match?.mistakes ?? 0;
  const [selected, setSelected] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<readonly Tile[]>([]);
  const [shake] = useState(() => new Animated.Value(0));
  const wrongTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightOrder = optionOrder.map((id) => Number(id.slice(1)));

  useEffect(function clearWrongFlashOnUnmount() {
    return function cancelWrongFlash() {
      if (wrongTimer.current !== null) {
        clearTimeout(wrongTimer.current);
      }
    };
  }, []);

  const flashWrong = (tiles: readonly Tile[]) => {
    setWrong(tiles);
    shake.setValue(0);
    Animated.sequence(
      [8, -8, 6, -6, 0].map((toValue) =>
        Animated.timing(shake, { duration: 55, toValue, useNativeDriver: true })
      )
    ).start();
    if (wrongTimer.current !== null) {
      clearTimeout(wrongTimer.current);
    }
    wrongTimer.current = setTimeout(() => setWrong([]), WRONG_FLASH_MS);
  };

  const press = (tile: Tile) => {
    if (!selected || selected.side === tile.side) {
      setSelected(selected?.side === tile.side && selected.pair === tile.pair ? null : tile);
      return;
    }
    setSelected(null);
    if (selected.pair === tile.pair) {
      onRespond({ format: "match", matched: [...matched, tile.pair], mistakes });
    } else {
      flashWrong([selected, tile]);
      onRespond({ format: "match", matched, mistakes: mistakes + 1 });
    }
  };

  const stateOf = (tile: Tile): TileState => {
    if (matched.includes(tile.pair)) {
      return "matched";
    }
    if (wrong.some((other) => other.side === tile.side && other.pair === tile.pair)) {
      return "wrong";
    }
    return selected?.side === tile.side && selected.pair === tile.pair ? "selected" : "idle";
  };

  const column = (side: Side, pairs: readonly number[]) => (
    <View style={styles.column}>
      {pairs.map((pair) => {
        const tile = { side, pair };
        const pairText = challenge.pairs[pair];
        return (
          <MatchTile
            key={`${side}-${pair}`}
            onPress={() => press(tile)}
            shake={shake}
            state={stateOf(tile)}
            text={(side === "left" ? pairText?.left : pairText?.right) ?? ""}
            theme={theme}
          />
        );
      })}
    </View>
  );

  return (
    <QuizLayout
      hint="Tap a tile, then its partner"
      prompt={<QuizPrompt text={challenge.prompt} theme={theme} />}
      theme={theme}
    >
      <ChallengePanel
        answers={
          <View style={styles.board}>
            {column(
              "left",
              challenge.pairs.map((_, index) => index)
            )}
            {column("right", rightOrder)}
          </View>
        }
        explanation={challenge.explanation ?? null}
        explanationCandidates={challenge.explanation ? [challenge.explanation] : []}
        idea={idea}
        outcome={outcome}
        seed={seed}
        theme={theme}
      />
    </QuizLayout>
  );
}

type MatchTileProps = Readonly<{
  onPress: () => void;
  shake: Animated.Value;
  state: TileState;
  text: string;
  theme: DeckThemeVariant;
}>;

function MatchTile({ onPress, shake, state, text, theme }: MatchTileProps) {
  const { colors } = useAppTheme();

  return (
    <Animated.View
      style={[
        state === "wrong" && { transform: [{ translateX: shake }] },
        state === "matched" && styles.matched,
      ]}
    >
      <ChunkyButton
        accessibilityLabel={text}
        accessibilityRole="button"
        accessibilityState={{ selected: state === "selected" }}
        disabled={state === "matched" || state === "wrong"}
        faceStyle={styles.tileFace}
        onPress={onPress}
        tone={tileTone(state, theme, colors)}
      >
        <Text numberOfLines={3} style={[styles.tileText, { color: theme.textPrimary }]}>
          {text}
        </Text>
      </ChunkyButton>
    </Animated.View>
  );
}

function tileTone(state: TileState, theme: DeckThemeVariant, colors: AppColors): ChunkyTone {
  const tinted = (color: string, amount: number) => mixColors(color, theme.background, amount);
  switch (state) {
    case "selected":
      return { edge: theme.accent, face: tinted(theme.accent, 0.14) };
    case "matched":
      return { edge: colors.recallGood, face: tinted(colors.recallGood, 0.16) };
    case "wrong":
      return { edge: colors.recallAgain, face: tinted(colors.recallAgain, 0.14) };
    case "idle":
      break;
  }
  return { edge: tinted(theme.accent, 0.28), face: theme.background };
}

const styles = StyleSheet.create({
  board: { flexDirection: "row", gap: sizes.spacing.medium },
  column: { flex: 1, gap: sizes.spacing.medium },
  tileFace: {
    alignItems: "center",
    height: TILE_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: sizes.spacing.medium,
  },
  tileText: {
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.footnote,
    textAlign: "center",
  },
  matched: { opacity: 0.6 },
});
