import { FlashList, type FlashListRef, type ListRenderItem } from "@shopify/flash-list";
import { useCallback, useRef, useState } from "react";
import { StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from "react-native";

import type { PreparedReelOccurrence } from "@/features/study/domain/study-feed";

import { LoadingState } from "@/shared/presentation/components/loading-state";

function occurrenceKey(occurrence: PreparedReelOccurrence): string {
  return occurrence.key;
}

type ReelPagerProps = Readonly<{
  occurrences: readonly PreparedReelOccurrence[];
  initialIndex: number;
  height: number;
  width: number;
  extraData: unknown;
  renderItem: ListRenderItem<PreparedReelOccurrence>;
  onEndReached: () => void;
  onMomentumScrollEnd: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}>;

/** Keeps native list measurement and scroll restoration out of the study controller. */
export function ReelPager({
  occurrences,
  initialIndex,
  height,
  width,
  extraData,
  renderItem,
  onEndReached,
  onMomentumScrollEnd,
}: ReelPagerProps) {
  const list = useRef<FlashListRef<PreparedReelOccurrence>>(null);
  // These are mount inputs. Feed extensions and normal swipes must not restart restoration.
  const [entryIndex] = useState(() => initialIndex);
  const [initialOffset] = useState(() => initialIndex * height);
  const [loaded, setLoaded] = useState(false);
  const [aligned, setAligned] = useState(initialOffset === 0);
  const ready = occurrences.length === 0 || (loaded && aligned);

  const observeInitialAlignment = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!ready) {
        setAligned(Math.abs(event.nativeEvent.contentOffset.y - initialOffset) < 1);
      }
    },
    [initialOffset, ready]
  );
  const finishInitialLayout = useCallback(() => {
    // FlashList 2 measures before positioning. Full-height reels give us an exact native offset,
    // so its initial estimates must not become a visible partial page or a persisted swipe.
    list.current?.scrollToOffset({ offset: initialOffset, animated: false });
    setLoaded(true);
  }, [initialOffset]);

  return (
    <View style={[styles.pager, { height, width }]}>
      <View
        style={[styles.pager, !ready && styles.restoring]}
        pointerEvents={ready ? "auto" : "none"}
        accessibilityElementsHidden={!ready}
        importantForAccessibility={ready ? "auto" : "no-hide-descendants"}
      >
        <FlashList
          data={occurrences}
          decelerationRate="fast"
          extraData={extraData}
          initialScrollIndex={entryIndex}
          keyExtractor={occurrenceKey}
          maintainVisibleContentPosition={{ disabled: false }}
          onEndReached={() => {
            if (ready) {
              onEndReached();
            }
          }}
          onEndReachedThreshold={1}
          onLoad={finishInitialLayout}
          onMomentumScrollEnd={(event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (ready) {
              onMomentumScrollEnd(event);
            }
          }}
          onScroll={observeInitialAlignment}
          pagingEnabled
          ref={list}
          renderItem={renderItem}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
        />
      </View>
      {!ready && (
        <View style={styles.loading}>
          <LoadingState accessibilityLabel="Restoring study position" />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  pager: { flex: 1 },
  restoring: { opacity: 0 },
  loading: { position: "absolute", top: 0, right: 0, bottom: 0, left: 0 },
});
