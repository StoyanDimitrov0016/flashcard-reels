import type { ReactNode } from "react";

import { BottomSheet, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import { StyleSheet, useWindowDimensions } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";

// A sliver of the screen behind stays visible, so a sheet never reads as a new screen.
const MAX_HEIGHT_RATIO = 0.88;

type AppBottomSheetProps = Readonly<{
  children: ReactNode;
  dismissible?: boolean;
  onClose: () => void;
  visible: boolean;
}>;

/**
 * A native sheet sized to its content. Content taller than the cap scrolls inside a
 * `BottomSheetScrollView` with `flexShrink: 1`, below a fixed `SheetHeader`.
 */
export function AppBottomSheet({
  children,
  dismissible = true,
  onClose,
  visible,
}: AppBottomSheetProps) {
  const { colors } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(colors.surfaceRaised, windowHeight * MAX_HEIGHT_RATIO);

  return (
    <BottomSheet
      backgroundStyle={styles.background}
      enableDynamicSizing
      enablePanDownToClose={dismissible}
      index={visible ? 0 : -1}
      onClose={onClose}
    >
      <BottomSheetView style={styles.content}>{children}</BottomSheetView>
    </BottomSheet>
  );
}

function createStyles(backgroundColor: string, maxHeight: number) {
  return StyleSheet.create({
    background: { backgroundColor },
    content: { backgroundColor, maxHeight },
  });
}
