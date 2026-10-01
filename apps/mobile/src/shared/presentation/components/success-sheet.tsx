import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type SuccessSheetProps = Readonly<{
  message: string;
  onClose: () => void;
  title: string;
  visible: boolean;
}>;

/** Confirms that a finished action worked, such as a reset, with one Done button. */
export function SuccessSheet({ message, onClose, title, visible }: SuccessSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet onClose={onClose} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.iconShell}>
          <SymbolView
            name={{ android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" }}
            size={sizes.icon.large}
            tintColor={colors.success}
          />
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          {title}
        </Text>
        <Text style={styles.message}>{message}</Text>
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
      backgroundColor: colors.actionPrimary,
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
      backgroundColor: colors.success + "18",
      borderColor: colors.success + "38",
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      height: sizes.iconBadge.large,
      justifyContent: "center",
      marginTop: sizes.spacing.section,
      width: sizes.iconBadge.large,
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
