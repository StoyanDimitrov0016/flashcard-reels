import { useRouter } from "expo-router";
import { StyleSheet } from "react-native";
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
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";

type ReadyFocusedFeedContentProps = Readonly<{
  cards: Flashcard[];
  deckId: DeckId;
  onSessionStarted: () => void;
  replaceSession: boolean;
  anchorFlashcardId: string | null;
}>;

function ReadyFocusedFeedContent({
  cards,
  deckId,
  onSessionStarted,
  replaceSession,
  anchorFlashcardId,
}: ReadyFocusedFeedContentProps) {
  const preparedFeed = usePreparedReelFeed(
    cards,
    "focused",
    deckId,
    replaceSession,
    onSessionStarted,
    anchorFlashcardId
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
type ReadyFocusedFeedProps = Readonly<{
  focusedFeed: Extract<FocusedFeedState, { status: "ready" }>;
  onSessionStarted: () => void;
}>;

function ReadyFocusedFeed({ focusedFeed, onSessionStarted }: ReadyFocusedFeedProps) {
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
      anchorFlashcardId={focusedFeed.anchorFlashcardId}
    />
  );
}

export default function FocusedFeedScreen() {
  const router = useRouter();
  const { consumeFocusedFeedReplacement, focusedFeed, focusRestoring, focusRevision } =
    useFeedScope();

  let content: React.ReactNode;
  if (focusedFeed.status === "empty") {
    content = focusRestoring ? (
      <LoadingState />
    ) : (
      <EmptyFocusedFeed onChooseDeck={() => router.navigate("../library")} />
    );
  } else {
    content = (
      <ReadyFocusedFeed
        focusedFeed={focusedFeed}
        key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}-${focusRevision}`}
        onSessionStarted={consumeFocusedFeedReplacement}
      />
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
});
