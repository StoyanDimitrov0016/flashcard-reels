import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { getTopToastOffset } from "@/shared/presentation/toast-layout";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type ToastConfigProps = Readonly<{ focused?: boolean }>;
type FlashcardToastProps = Readonly<ToastConfigParams<ToastConfigProps>>;

function FlashcardToast({ text1, props }: FlashcardToastProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const focused = props?.focused ?? false;

  return (
    <View accessibilityLiveRegion="polite" style={styles.toast}>
      <SymbolView
        name={
          focused
            ? { android: "center_focus_strong", ios: "scope", web: "center_focus_strong" }
            : { android: "pan_tool", ios: "hand.raised.fill", web: "pan_tool" }
        }
        size={sizes.icon.small}
        tintColor={colors.accent}
      />
      <Text style={styles.label}>{text1}</Text>
    </View>
  );
}

const toastConfig: ToastConfig = {
  flashcardReels: (props) => <FlashcardToast {...props} />,
};

export function showHoldToast(): void {
  Toast.show({
    autoHide: false,
    props: { focused: false },
    swipeable: false,
    text1: "Hold to Focus",
    type: "flashcardReels",
  });
}

export function showFocusedToast(): void {
  Toast.show({
    props: { focused: true },
    text1: "Focused on this deck",
    type: "flashcardReels",
    visibilityTime: 1200,
  });
}

export function hideFlashcardToast(): void {
  Toast.hide();
}

export function FlashcardToastHost() {
  const { top } = useSafeAreaInsets();

  return (
    <Toast
      config={toastConfig}
      position="top"
      topOffset={getTopToastOffset(top, sizes.spacing.small)}
    />
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    label: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    toast: {
      alignItems: "center",
      backgroundColor: colors.controlOverlay,
      borderColor: colors.controlBorder,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.small,
      minHeight: 44,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.medium,
    },
  });
}
