import { useRef, useState } from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";

type UseReelFeedParameters = Readonly<{
  itemHeight: number;
  itemCount: number;
}>;

export function useReelFeed({ itemCount, itemHeight }: UseReelFeedParameters) {
  const [activeIndex, setActiveIndex] = useState(0);
  const activeIndexReference = useRef(0);

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
