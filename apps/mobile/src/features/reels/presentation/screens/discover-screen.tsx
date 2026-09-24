import { StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";

import { useFlashcards } from "@/features/flashcards/presentation/controllers/use-flashcards";
import { ReelFeed } from "@/features/reels/presentation/components/reel-feed";
import { useStudyFeedContentInset } from "@/features/reels/presentation/components/study-feed-header";
import { usePreparedReelFeed } from "@/features/reels/presentation/controllers/use-prepared-reel-feed";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";

type ReadyMixedFeedProps = Readonly<{ cards: Flashcard[] }>;

function ReadyMixedFeed({ cards }: ReadyMixedFeedProps) {
  const preparedFeed = usePreparedReelFeed(cards, "mixed", null, false);
  const contentInsetTop = useStudyFeedContentInset();
  if (!preparedFeed) {
    return <LoadingState />;
  }

  return (
    <ReelFeed
      contentInsetTop={contentInsetTop}
      key={preparedFeed.studySessionId}
      preparedFeed={preparedFeed}
      sourceCards={cards}
    />
  );
}

export default function DiscoverScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { cards, loading } = useFlashcards(null);

  return (
    <SafeAreaView edges={["right", "left"]} style={styles.screen}>
      {loading ? <LoadingState /> : <ReadyMixedFeed cards={cards} />}
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    // Cards run full-bleed under the status bar and the study feed header.
    screen: { backgroundColor: colors.canvas, flex: 1 },
  });
}
