import { useRouter } from "expo-router";
import { SegmentedControl } from "@expo/ui/community/segmented-control";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/presentation/hooks/use-flashcards";
import { EmptyFocusedFeed } from "@/features/reels/presentation/components/empty-focused-feed";
import { ReelFeed } from "@/features/reels/presentation/components/reel-feed";
import {
  useFeedScope,
  type FocusedFeedState,
} from "@/features/reels/presentation/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/presentation/hooks/use-prepared-reel-feed";
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
      key={preparedFeed.studySessionId}
      preparedFeed={preparedFeed}
      showMainFeedLink
      sourceCards={cards}
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
  const {
    consumeFocusedFeedReplacement,
    focusedFeed,
    focusRestoring,
    focusRevision,
    startFocusedFeed,
  } = useFeedScope();

  let content: React.ReactNode;
  if (focusedFeed.status === "empty") {
    content = focusRestoring ? (
      <LoadingState />
    ) : (
      <EmptyFocusedFeed onChooseDeck={() => router.navigate("../library")} />
    );
  } else {
    content = (
      <>
        <View style={styles.strategySwitcher}>
          <SegmentedControl
            appearance="dark"
            onValueChange={(value) => {
              const nextStrategy = value === "Ordered" ? "ordered" : "shuffle";
              if (focusedFeed.strategy !== nextStrategy) {
                startFocusedFeed(focusedFeed.deckId, nextStrategy);
              }
            }}
            selectedIndex={focusedFeed.strategy === "shuffle" ? 0 : 1}
            style={styles.strategyControl}
            tintColor={palette.accent}
            values={["Shuffle", "Ordered"]}
          />
        </View>
        <ReadyFocusedFeed
          focusedFeed={focusedFeed}
          key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}-${focusRevision}`}
          onSessionStarted={consumeFocusedFeedReplacement}
        />
      </>
    );
  }

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: palette.background, flex: 1 },
  loading: { alignItems: "center", flex: 1, justifyContent: "center" },
  strategySwitcher: {
    backgroundColor: palette.background,
    padding: sizes.spacing.content,
  },
  strategyControl: { width: "100%" },
});
