import { SymbolView } from "expo-symbols";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type AppResetScheduledSheetProps = Readonly<{
  onClose: () => void;
  visible: boolean;
}>;

export function AppResetScheduledSheet({ onClose, visible }: AppResetScheduledSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet onClose={onClose} size="content" visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.iconShell}>
          <SymbolView
            name={{ android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" }}
            size={sizes.icon.large}
            tintColor={colors.interactive}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Reset scheduled
        </Text>
        <Text style={styles.message}>
          {Platform.OS === "android"
            ? "Force stop the app in Android Settings, then reopen it."
            : "Remove the app from recent apps, then reopen it."}{" "}
          Local data will be erased and bundled decks restored when you reopen the app.
        </Text>
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
          <Text style={styles.doneLabel}>Done</Text>
        </Pressable>
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    doneButton: {
      alignItems: "center",
      backgroundColor: colors.interactive,
      borderRadius: sizes.radius.pill,
      justifyContent: "center",
      marginTop: sizes.spacing.medium,
      minHeight: sizes.touchTarget.minimum,
    },
    doneLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
    iconShell: {
      alignItems: "center",
      alignSelf: "center",
      backgroundColor: colors.interactive + "18",
      borderColor: colors.interactive + "38",
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      height: 64,
      justifyContent: "center",
      marginTop: sizes.spacing.section,
      width: 64,
    },
    message: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
      textAlign: "center",
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      gap: sizes.spacing.xLarge,
      maxWidth: sizes.sheet.maxWidthCompact,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
      width: "100%",
    },
    title: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
      textAlign: "center",
    },
  });
}
