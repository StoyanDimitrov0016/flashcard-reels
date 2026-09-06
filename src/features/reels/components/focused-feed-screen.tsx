import { useRouter } from "expo-router";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/hooks/use-flashcards";
import { EmptyFocusedFeed } from "@/features/reels/components/empty-focused-feed";
import { ReelFeed } from "@/features/reels/components/reel-feed";
import { useFeedScope, type FocusedFeedState } from "@/features/reels/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/hooks/use-prepared-reel-feed";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

function LoadingState() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={palette.textPrimary} size="large" />
    </View>
  );
}

type ReadyFocusedFeedContentProps = Readonly<{
  cards: Flashcard[];
  deckId: DeckId;
  onSessionStarted: () => void;
  replaceSession: boolean;
  strategy: "shuffle" | "ordered";
}>;

function ReadyFocusedFeedContent({
  cards,
  deckId,
  onSessionStarted,
  replaceSession,
  strategy,
}: ReadyFocusedFeedContentProps) {
  const preparedFeed = usePreparedReelFeed(
    cards,
    "focused",
    deckId,
    replaceSession,
    onSessionStarted,
    strategy
  );
  if (!preparedFeed) {
    return <LoadingState />;
  }

  return (
    <ReelFeed
      initialReelPosition={preparedFeed.currentReelPosition}
      key={preparedFeed.studySessionId}
      occurrences={preparedFeed.occurrences}
      showMainFeedLink
      sourceCards={cards}
      studySessionId={preparedFeed.studySessionId}
    />
  );
}

function ReadyFocusedFeed({
  focusedFeed,
  onSessionStarted,
}: Readonly<{
  focusedFeed: Extract<FocusedFeedState, { status: "ready" }>;
  onSessionStarted: () => void;
}>) {
  const { cards, loading } = useFlashcards(focusedFeed.deckId);

  if (loading) {
    return <LoadingState />;
  }

  return (
    <ReadyFocusedFeedContent
      cards={cards}
      deckId={focusedFeed.deckId}
      onSessionStarted={onSessionStarted}
      replaceSession={focusedFeed.replaceSession}
      strategy={focusedFeed.strategy}
    />
  );
}

export default function FocusedFeedScreen() {
  const router = useRouter();
  const { consumeFocusedFeedReplacement, focusedFeed, startFocusedFeed } = useFeedScope();

  if (focusedFeed.status === "empty") {
    return <EmptyFocusedFeed onChooseDeck={() => router.navigate("../library")} />;
  }

  return (
    <View style={styles.screen}>
      <View style={styles.strategySwitcher}>
        {(["shuffle", "ordered"] as const).map((strategy) => (
          <Pressable
            key={strategy}
            onPress={() => {
              if (focusedFeed.strategy !== strategy) {
                startFocusedFeed(focusedFeed.deckId, strategy);
              }
            }}
            style={[
              styles.strategyButton,
              focusedFeed.strategy === strategy && styles.activeButton,
            ]}
          >
            <Text
              style={[
                styles.strategyLabel,
                focusedFeed.strategy === strategy && styles.activeLabel,
              ]}
            >
              {strategy === "shuffle" ? "Shuffle" : "Ordered"}
            </Text>
          </Pressable>
        ))}
      </View>
      <ReadyFocusedFeed
        focusedFeed={focusedFeed}
        key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}`}
        onSessionStarted={consumeFocusedFeedReplacement}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  strategySwitcher: {
    backgroundColor: palette.background,
    flexDirection: "row",
    gap: sizes.spacing.small,
    padding: sizes.spacing.content,
  },
  strategyButton: {
    borderColor: palette.border,
    borderRadius: sizes.radius.medium,
    borderWidth: sizes.border,
    flex: 1,
    padding: sizes.spacing.small,
  },
  activeButton: { backgroundColor: palette.surface, borderColor: palette.accent },
  strategyLabel: { color: palette.textMuted, fontSize: 13, textAlign: "center" },
  activeLabel: { color: palette.textPrimary, fontWeight: "700" },
});
