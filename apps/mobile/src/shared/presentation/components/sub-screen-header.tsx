import type { ReactNode } from "react";

import { StyleSheet, Text, View } from "react-native";

import { ScreenBackButton } from "@/shared/presentation/components/screen-back-button";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";
import { textStyles } from "@/shared/presentation/typography";

type SubScreenHeaderProps = Readonly<{
  /** Icon buttons on the right, such as delete. */
  actions?: ReactNode;
  /** Spoken label for the back button, such as "Back to Settings". */
  backLabel: string;
  onBack: () => void;
  title?: string;
}>;

/** Header for screens pushed from a tab: back arrow, then the title, then any actions. */
export function SubScreenHeader({ actions, backLabel, onBack, title }: SubScreenHeaderProps) {
  const { colors } = useAppTheme();

  return (
    <ScreenHeader>
      <View style={styles.leading}>
        <ScreenBackButton accessibilityLabel={backLabel} onPress={onBack} />
        {!!title && (
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.title, { color: colors.textPrimary }]}
          >
            {title}
          </Text>
        )}
      </View>
      {actions}
    </ScreenHeader>
  );
}

const styles = StyleSheet.create({
  leading: { alignItems: "center", flex: 1, flexDirection: "row", gap: sizes.spacing.xSmall },
  title: { flexShrink: 1, ...textStyles.sheetTitle },
});
