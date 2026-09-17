import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, letterSpacing } from "@/shared/presentation/typography";

type GestureHintProps = Readonly<{
  label: string;
  symbol: SymbolViewProps["name"];
}>;

function GestureHint({ label, symbol }: GestureHintProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View accessible accessibilityLabel={label} style={styles.gestureHint}>
      <SymbolView name={symbol} size={sizes.icon.small} tintColor={colors.textTertiary} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

type GestureFooterProps = Readonly<{ showHoldHint: boolean }>;

export function GestureFooter({ showHoldHint }: GestureFooterProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.gestureFooter}>
      <GestureHint
        label="Swipe up"
        symbol={{ android: "arrow_upward", ios: "arrow.up", web: "arrow_upward" }}
      />
      <GestureHint
        label="Double tap"
        symbol={{ android: "touch_app", ios: "hand.tap.fill", web: "touch_app" }}
      />
      {showHoldHint && (
        <GestureHint
          label="Hold"
          symbol={{ android: "pan_tool", ios: "hand.raised.fill", web: "pan_tool" }}
        />
      )}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    gestureFooter: {
      alignItems: "center",
      columnGap: sizes.spacing.section,
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      minHeight: sizes.touchTarget.minimum,
      paddingBottom: sizes.spacing.small,
      paddingTop: sizes.spacing.small,
      rowGap: sizes.spacing.small,
    },
    gestureHint: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.xSmall },
    hint: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      letterSpacing: letterSpacing.wider,
    },
  });
}
