import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

type ScreenHeaderProps = Readonly<{ children: ReactNode }>;

export function ScreenHeader({ children }: ScreenHeaderProps) {
  const { colors } = useAppTheme();

  return <View style={[styles.header, { borderBottomColor: colors.border }]}>{children}</View>;
}

const styles = StyleSheet.create({
  header: {
    alignItems: "center",
    borderBottomWidth: sizes.border,
    flexDirection: "row",
    height: screenLayout.headerHeight,
    justifyContent: "space-between",
    paddingHorizontal: screenLayout.horizontalPadding,
  },
});
