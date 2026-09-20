import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckId } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { useFlashcards } from "@/features/flashcards/presentation/controllers/use-flashcards";
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
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

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

type FocusRecoveryStateProps = Readonly<{
  onRetry: () => void;
  onChooseDeck: () => void;
}>;

function FocusRecoveryState({ onRetry, onChooseDeck }: FocusRecoveryStateProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.recoveryState}>
      <Text accessibilityRole="header" style={styles.recoveryTitle}>
        Couldn’t restore Focus
      </Text>
      <Text style={styles.recoveryCopy}>Try again or choose a deck.</Text>
      <Pressable accessibilityRole="button" onPress={onRetry} style={styles.button}>
        <Text style={styles.buttonLabel}>Try again</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onChooseDeck} style={styles.secondaryButton}>
        <Text style={styles.secondaryLabel}>Choose a deck</Text>
      </Pressable>
    </View>
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

  const isReady = focusedFeed.status === "ready" && !focusRestoring;
  const hasRestorationError = restorationError !== null;
  const showRecovery = !isReady && hasRestorationError;
  const showLoading = !isReady && !hasRestorationError && focusRestoring;
  const showEmpty = !isReady && !hasRestorationError && !focusRestoring;
  const chooseDeck = () => router.navigate("../library");

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      {showRecovery && (
        <FocusRecoveryState onRetry={retryFocusedFeedRestoration} onChooseDeck={chooseDeck} />
      )}
      {showLoading && <LoadingState />}
      {showEmpty && <EmptyFocusedFeed onChooseDeck={chooseDeck} />}
      {isReady && (
        <View style={styles.content}>
          {hasRestorationError && (
            <View style={styles.notice}>
              <Text accessibilityRole="alert" style={styles.recoveryCopy}>
                Couldn’t refresh Focus. Your current feed is available.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={retryFocusedFeedRestoration}
                style={styles.secondaryButton}
              >
                <Text style={styles.secondaryLabel}>Try again</Text>
              </Pressable>
            </View>
          )}
          <ReadyFocusedFeed
            focusedFeed={focusedFeed}
            key={`focused-${focusedFeed.deckId}-${focusedFeed.revision}`}
            onSessionStarted={confirmFocusedFeedSession}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    button: {
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.medium,
      marginTop: sizes.spacing.medium,
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.large,
    },
    buttonLabel: { color: colors.actionPrimaryText, fontWeight: fontWeight.bold },
    secondaryButton: {
      minHeight: sizes.touchTarget.minimum,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.medium,
    },
    secondaryLabel: { color: colors.actionPrimary, fontWeight: fontWeight.bold },
    content: { flex: 1 },
    notice: { alignItems: "center", padding: sizes.spacing.medium },
    recoveryCopy: { color: colors.textSecondary, textAlign: "center" },
    recoveryState: {
      alignItems: "center",
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.spacious,
    },
    recoveryTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
  });
}
