import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/presentation/hooks/use-flashcards";
import { EmptyFocusedFeed } from "@/features/reels/presentation/components/empty-focused-feed";
import { ReelFeed } from "@/features/reels/presentation/components/reel-feed";
import {
  useFeedScope,
  type FocusTransition,
  type FocusedFeedState,
} from "@/features/reels/presentation/context/feed-scope-context";
import { usePreparedReelFeed } from "@/features/reels/presentation/hooks/use-prepared-reel-feed";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReadyFocusedFeedContentProps = Readonly<{
  cards: Flashcard[];
  deckId: DeckId;
  expectedRevision: number;
  onSessionStarted: (sessionId: string, expectedRevision: number) => void;
  replaceSession: boolean;
  transition: FocusTransition | null;
}>;

function ReadyFocusedFeedContent({
  cards,
  deckId,
  expectedRevision,
  onSessionStarted,
  replaceSession,
  transition,
}: ReadyFocusedFeedContentProps) {
  const [entryTransition] = useState(() => transition);
  const consumed = useRef(false);
  const preparedFeed = usePreparedReelFeed(
    cards,
    "focused",
    deckId,
    replaceSession,
    entryTransition?.anchorFlashcardId ?? null
  );

  useEffect(
    function consumePreparedFocusedFeedTransition() {
      if (preparedFeed && !consumed.current) {
        consumed.current = true;
        onSessionStarted(preparedFeed.studySessionId, expectedRevision);
      }
    },
    [expectedRevision, onSessionStarted, preparedFeed]
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
      initialCardState={entryTransition?.cardState}
    />
  );
}

type ReadyFocusedFeedProps = Readonly<{
  focusedFeed: Extract<FocusedFeedState, { status: "ready" }>;
  onSessionStarted: (sessionId: string, expectedRevision: number) => void;
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
      expectedRevision={focusedFeed.revision}
      onSessionStarted={onSessionStarted}
      replaceSession={focusedFeed.replaceSession}
      transition={focusedFeed.transition}
    />
  );
}

export default function FocusedFeedScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const {
    confirmFocusedFeedSession,
    focusedFeed,
    focusRestoring,
    restorationError,
    retryFocusedFeedRestoration,
  } = useFeedScope();

  let content: React.ReactNode;
  if (focusedFeed.status === "empty") {
    if (restorationError) {
      content = (
        <View style={styles.recoveryState}>
          <Text accessibilityRole="header" style={styles.recoveryTitle}>
            Focus could not be restored
          </Text>
          <Text style={styles.recoveryCopy}>
            Try again or choose a deck to start a new focused feed.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={retryFocusedFeedRestoration}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Try again</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.navigate("../library")}
            style={styles.button}
          >
            <Text style={styles.buttonLabel}>Choose a deck</Text>
          </Pressable>
        </View>
      );
    } else {
      content = focusRestoring ? (
        <LoadingState />
      ) : (
        <EmptyFocusedFeed onChooseDeck={() => router.navigate("../library")} />
      );
    }
  } else {
    content = (
      <View style={styles.content}>
        {restorationError ? (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={styles.recoveryCopy}>
              Focus could not be refreshed. Your current feed is still available.
            </Text>
            <Pressable accessibilityRole="button" onPress={retryFocusedFeedRestoration}>
              <Text style={styles.buttonLabel}>Retry restore</Text>
            </Pressable>
          </View>
        ) : null}
        <ReadyFocusedFeed
          focusedFeed={focusedFeed}
          key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}`}
          onSessionStarted={confirmFocusedFeedSession}
        />
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      {content}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.actionPrimary,
      borderRadius: 999,
      marginTop: 12,
      paddingHorizontal: 22,
      paddingVertical: 13,
    },
    buttonLabel: { color: colors.actionPrimaryText, fontWeight: "700" },
    content: { flex: 1 },
    notice: { alignItems: "center", padding: 12 },
    recoveryCopy: { color: colors.textSecondary, textAlign: "center" },
    recoveryState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: 36,
    },
    recoveryTitle: { color: colors.textPrimary, fontSize: 20, fontWeight: "800" },
    screen: { backgroundColor: colors.canvas, flex: 1 },
  });
}
