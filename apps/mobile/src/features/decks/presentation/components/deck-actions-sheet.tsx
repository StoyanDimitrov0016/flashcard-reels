import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

export type DeckAction = "theme" | "info" | "reset" | "delete";

type DeckActionOption = Readonly<{
  action: DeckAction;
  label: string;
  icon: SymbolViewProps["name"];
  destructive: boolean;
}>;

const deckActionOptions: readonly DeckActionOption[] = [
  {
    action: "theme",
    destructive: false,
    icon: { android: "palette", ios: "paintpalette", web: "palette" },
    label: "Theme",
  },
  {
    action: "info",
    destructive: false,
    icon: { android: "info", ios: "info.circle", web: "info" },
    label: "Deck info",
  },
  {
    action: "reset",
    destructive: true,
    icon: { android: "restart_alt", ios: "arrow.counterclockwise", web: "restart_alt" },
    label: "Reset progress",
  },
  {
    action: "delete",
    destructive: true,
    icon: { android: "delete", ios: "trash.fill", web: "delete" },
    label: "Delete deck",
  },
];

type DeckActionsSheetProps = Readonly<{
  deckTitle: string;
  onClose: () => void;
  onSelect: (action: DeckAction) => void;
  visible: boolean;
}>;

/** The deck page's less frequent actions, kept out of the way behind one button. */
export function DeckActionsSheet({ deckTitle, onClose, onSelect, visible }: DeckActionsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <AppBottomSheet onClose={onClose} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <SheetHeader closeLabel="Close deck actions" onClose={onClose} title={deckTitle} />
        <View style={styles.group}>
          {deckActionOptions.map((option, index) => {
            const tint = option.destructive ? colors.error : colors.textPrimary;
            return (
              <Pressable
                accessibilityRole="button"
                key={option.action}
                onPress={() => onSelect(option.action)}
                style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              >
                {index > 0 && <View style={styles.divider} />}
                <SymbolView name={option.icon} size={sizes.icon.small} tintColor={tint} />
                <Text style={[styles.label, { color: tint }]}>{option.label}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    group: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      marginHorizontal: sizes.spacing.content,
      overflow: "hidden",
    },
    label: { flex: 1, fontSize: fontSize.body, fontWeight: fontWeight.semibold },
    row: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      minHeight: sizes.input.standard + sizes.spacing.xSmall,
      paddingHorizontal: sizes.spacing.xLarge,
    },
    // Inset past the icon, as in the grouped setting rows.
    divider: {
      backgroundColor: colors.borderSubtle,
      height: StyleSheet.hairlineWidth,
      left: sizes.spacing.xLarge * 2 + sizes.icon.small,
      position: "absolute",
      right: 0,
      top: 0,
    },
    rowPressed: { backgroundColor: colors.surfaceHover },
    sheet: { gap: sizes.spacing.section, paddingBottom: sizes.spacing.content },
  });
}
