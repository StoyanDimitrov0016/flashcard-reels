import { useCallback, useState } from "react";
import type { LayoutChangeEvent } from "react-native";

type ReelViewport = Readonly<{ height: number; width: number }>;
const initialViewport: ReelViewport = { height: 0, width: 0 };

export function useReelViewport() {
  const [viewport, setViewport] = useState(initialViewport);
  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setViewport({ height, width });
  }, []);
  return { handleLayout, viewport };
}
