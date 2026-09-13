import { BottomSheet, BottomSheetView } from "@expo/ui/community/bottom-sheet";
import type { ReactNode } from "react";
import { StyleSheet, useWindowDimensions } from "react-native";

import { useAppTheme } from "@/shared/presentation/theme";
import {
  resolveAppBottomSheetConfig,
  type AppBottomSheetSize,
} from "@/shared/presentation/components/app-bottom-sheet-config";

type AppBottomSheetProps = Readonly<{
  children: ReactNode;
  dismissible?: boolean;
  onClose: () => void;
  size: AppBottomSheetSize;
  visible: boolean;
}>;

export function AppBottomSheet({
  children,
  dismissible = true,
  onClose,
  size,
  visible,
}: AppBottomSheetProps) {
  const { colors } = useAppTheme();
  const { height: windowHeight } = useWindowDimensions();
  const styles = createStyles(colors.surfaceRaised);
  const config = resolveAppBottomSheetConfig(size);
  const contentHeight = config.contentHeightRatio
    ? windowHeight * config.contentHeightRatio
    : undefined;

  return (
    <BottomSheet
      backgroundStyle={styles.background}
      enablePanDownToClose={dismissible}
      enableDynamicSizing={config.enableDynamicSizing}
      index={visible ? 0 : -1}
      onClose={onClose}
      snapPoints={config.snapPoints}
    >
      <BottomSheetView
        style={[
          config.snapPoints ? styles.fixedContent : styles.content,
          contentHeight === undefined ? null : { height: contentHeight },
        ]}
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
    fixedContent: { backgroundColor, flex: 1 },
  });
}
