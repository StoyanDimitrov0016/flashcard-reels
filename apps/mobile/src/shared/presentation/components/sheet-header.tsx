import type { ReactNode } from "react";

import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { textStyles } from "@/shared/presentation/typography";

type SheetHeaderProps = Readonly<{
  /** Adds a back button before the title for a sheet's second step. */
  back?: Readonly<{ label: string; onPress: () => void }>;
  closeDisabled?: boolean;
  /** Spoken label for the close button, such as "Close deck information". */
  closeLabel: string;
  onClose: () => void;
  /** Plain text, or rich text such as a question with code spans styled with `textStyles.sheetTitle`. */
  title: ReactNode;
}>;

/** The one sheet header: title on the left, close on the right, both on the first line. */
export function SheetHeader({
  back,
  closeDisabled = false,
  closeLabel,
  onClose,
  title,
}: SheetHeaderProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.header}>
      {!!back && (
        <Pressable
          accessibilityLabel={back.label}
          accessibilityRole="button"
          hitSlop={4}
          onPress={back.onPress}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
            size={sizes.icon.medium}
            tintColor={colors.textPrimary}
          />
        </Pressable>
      )}
      {typeof title === "string" ? (
        <Text accessibilityRole="header" style={[styles.title, styles.titleText]}>
          {title}
        </Text>
      ) : (
        <View accessibilityRole="header" style={styles.title}>
          {title}
        </View>
      )}
      <Pressable
        accessibilityLabel={closeLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: closeDisabled }}
        disabled={closeDisabled}
        hitSlop={4}
        onPress={onClose}
        style={({ pressed }) => [
          styles.close,
          closeDisabled && styles.disabled,
          pressed && styles.pressed,
        ]}
      >
        <SymbolView
          name={{ android: "close", ios: "xmark", web: "close" }}
          size={sizes.icon.medium}
          tintColor={colors.textSecondary}
        />
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    back: {
      alignItems: "center",
      height: sizes.control.compact,
      justifyContent: "center",
      marginLeft: -sizes.spacing.small,
      width: sizes.control.compact,
    },
    close: {
      alignItems: "center",
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.pill,
      height: sizes.control.compact,
      justifyContent: "center",
      width: sizes.control.compact,
    },
    disabled: { opacity: 0.4 },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      paddingBottom: sizes.spacing.large,
      paddingHorizontal: sizes.spacing.content,
    },
    pressed: { opacity: 0.72 },
    // Centers a one-line title on the close button.
    title: { flex: 1, justifyContent: "center", minHeight: sizes.control.compact },
    titleText: { color: colors.textPrimary, textAlignVertical: "center", ...textStyles.sheetTitle },
  });
}
