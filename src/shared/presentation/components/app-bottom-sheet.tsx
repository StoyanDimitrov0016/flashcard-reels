import { BottomSheet, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import { StyleSheet } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";

type AppBottomSheetProps = Readonly<{
  children: ReactNode;
  dismissible?: boolean;
  onClose: () => void;
  snapPoints?: (string | number)[];
  visible: boolean;
}>;

export function AppBottomSheet({
  children,
  dismissible = true,
  onClose,
  snapPoints,
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
      snapPoints={snapPoints}
    >
      <BottomSheetView style={snapPoints ? styles.fixedContent : styles.content}>
        {children}
      </BottomSheetView>
    </BottomSheet>
  );
}

function createStyles(backgroundColor: string) {
  return StyleSheet.create({
    background: { backgroundColor },
    content: { backgroundColor },
    fixedContent: { backgroundColor, flex: 1 },
  });
}
