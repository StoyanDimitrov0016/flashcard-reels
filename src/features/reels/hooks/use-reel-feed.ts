import { useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type UseReelFeedParameters = Readonly<{
  initialPosition: number;
  itemHeight: number;
  itemCount: number;
}>;

export function useReelFeed({ initialPosition, itemCount, itemHeight }: UseReelFeedParameters) {
  const normalizedInitialPosition =
    itemCount === 0 ? 0 : Math.min(itemCount - 1, Math.max(0, initialPosition));
  const [activeIndex, setActiveIndex] = useState(normalizedInitialPosition);
  const activeIndexReference = useRef(normalizedInitialPosition);

  const handleMomentumScrollEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.min(
      itemCount - 1,
      Math.max(0, Math.round(event.nativeEvent.contentOffset.y / itemHeight))
    );

    if (nextIndex !== activeIndexReference.current) {
      activeIndexReference.current = nextIndex;
      setActiveIndex(nextIndex);
    }
  };

  return { activeIndex, handleMomentumScrollEnd };
}
