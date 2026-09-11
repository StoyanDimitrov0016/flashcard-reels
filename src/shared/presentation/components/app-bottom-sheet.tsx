import { BottomSheet, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";

type AppBottomSheetProps = Readonly<{
  children: ReactNode;
  contentHeight?: number;
  dismissible?: boolean;
  onClose: () => void;
  visible: boolean;
}>;

export function AppBottomSheet({
  children,
  contentHeight,
  dismissible = true,
  onClose,
  visible,
}: AppBottomSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors.surfaceRaised);

  return (
    <BottomSheet
      backgroundStyle={styles.background}
      enablePanDownToClose={dismissible}
      index={visible ? 0 : -1}
      onClose={onClose}
    >
      <BottomSheetView
        style={[styles.content, contentHeight !== undefined && { height: contentHeight }]}
      >
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

function createStyles(backgroundColor: string) {
  return StyleSheet.create({
    background: { backgroundColor },
    content: { backgroundColor },
  });
}
