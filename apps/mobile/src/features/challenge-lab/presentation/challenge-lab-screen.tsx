import { useReducer, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { FeedItem } from "@/features/challenge-lab/domain/pacing-composer";

import { interleavedSampleIdeas } from "@/features/challenge-lab/domain/sample-decks";
import {
  createLabFeed,
  reduceLabFeed,
  scoreResponse,
  type LabFeed,
  type LabFeedAction,
} from "@/features/challenge-lab/presentation/challenge-lab-feed";
import { ChallengeReelCard } from "@/features/challenge-lab/presentation/components/challenge-reel-card";
import { placementsByIdeaId } from "@/features/challenge-lab/presentation/lab-deck-placements";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { useStudyFeedContentInset } from "@/features/reels/presentation/components/study-feed-header";
import { TabBarInsetProvider } from "@/shared/presentation/context/tab-bar-inset-context";
import { useAppTheme } from "@/shared/presentation/theme";

const ideas = interleavedSampleIdeas;

function reduce(feed: LabFeed, action: LabFeedAction): LabFeed {
  return reduceLabFeed(ideas, feed, action);
}

function itemKey(item: FeedItem): string {
  return item.key;
}

/** Experimental: a feed of idea challenges, paced by the lab composer and held in memory only. */
export default function ChallengeLabScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const { bottom } = useSafeAreaInsets();
  const contentInsetTop = useStudyFeedContentInset();
  const [feed, dispatch] = useReducer(reduce, ideas, createLabFeed);
  const [viewport, setViewport] = useState({ height: 0, width: 0 });

  const measure = (event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setViewport({ height: Math.floor(height), width: Math.floor(width) });
  };
  const arrive = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (viewport.height > 0) {
      dispatch({
        type: "arrive",
        index: Math.round(event.nativeEvent.contentOffset.y / viewport.height),
      });
    }
  };

  return (
    // No tab bar here, so the bottom safe area takes its place below the gesture hints.
    <TabBarInsetProvider inset={bottom}>
      <View onLayout={measure} style={[styles.screen, { backgroundColor: colors.canvas }]}>
        {viewport.height > 0 && (
          <FlatList
            data={feed.items}
            decelerationRate="fast"
            extraData={feed.responses}
            getItemLayout={(_, index) => ({
              index,
              length: viewport.height,
              offset: viewport.height * index,
            })}
            keyExtractor={itemKey}
            onMomentumScrollEnd={arrive}
            pagingEnabled
            renderItem={({ item }) => {
              const placement = placementsByIdeaId.get(item.idea.id);
              const response = feed.responses[item.key];
              return placement ? (
                <ChallengeReelCard
                  card={placement.card}
                  contentInsetTop={contentInsetTop}
                  deck={placement.deck}
                  deckCardCount={placement.deckCardCount}
                  height={viewport.height}
                  item={item}
                  onRespond={(next) => dispatch({ type: "respond", key: item.key, response: next })}
                  outcome={
                    item.kind === "challenge" ? scoreResponse(item.challenge, response) : null
                  }
                  response={response}
                  theme={resolveDeckTheme(placement.theme, resolvedScheme)}
                  width={viewport.width}
                />
              ) : null;
            }}
            showsVerticalScrollIndicator={false}
            windowSize={5}
          />
        )}
      </View>
    </TabBarInsetProvider>
  );
}

const styles = StyleSheet.create({
  // Cards run full-bleed under the status bar, as in the study feeds.
  screen: { flex: 1 },
});
