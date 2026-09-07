import { useEffect, useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type UseReelFeedParameters = Readonly<{
  initialReelPosition: number;
  itemHeight: number;
  itemCount: number;
  loadedFromReelPosition: number;
}>;

export function useReelFeed({
  initialReelPosition,
  itemCount,
  itemHeight,
  loadedFromReelPosition,
}: UseReelFeedParameters) {
  const normalizedInitialIndex = getLocalReelIndex(
    initialReelPosition,
    loadedFromReelPosition,
    itemCount
  );
  const [activeIndex, setActiveIndex] = useState(normalizedInitialIndex);
  const [activeReelPosition, setActiveReelPosition] = useState(initialReelPosition);
  const activeIndexReference = useRef(normalizedInitialIndex);
  const activeReelPositionReference = useRef(initialReelPosition);

  useEffect(
    function synchronizeRollingFeedWindow() {
      const nextIndex = getLocalReelIndex(
        activeReelPositionReference.current,
        loadedFromReelPosition,
        itemCount
      );
      activeIndexReference.current = nextIndex;
      activeReelPositionReference.current = loadedFromReelPosition + nextIndex;
      setActiveIndex(nextIndex);
      setActiveReelPosition(activeReelPositionReference.current);
    },
    [itemCount, loadedFromReelPosition]
  );

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.min(
      itemCount - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.y / itemHeight))
    );

    if (nextIndex !== activeIndexReference.current) {
      activeIndexReference.current = nextIndex;
      activeReelPositionReference.current = loadedFromReelPosition + nextIndex;
      setActiveIndex(nextIndex);
      setActiveReelPosition(activeReelPositionReference.current);
    }
  };

  return {
    activeIndex,
    activeReelPosition,
    handleMomentumScrollEnd,
  };
}

export function getLocalReelIndex(
  absoluteReelPosition: number,
  loadedFromReelPosition: number,
  itemCount: number
): number {
  const localIndex = absoluteReelPosition - loadedFromReelPosition;
  return itemCount === 0 ? 0 : Math.min(itemCount - 1, Math.max(0, localIndex));
}
