import { SymbolView } from "expo-symbols";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast, { type ToastConfig, type ToastConfigParams } from "react-native-toast-message";
import { StyleSheet, Text, View } from "react-native";

import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { getTopToastOffset } from "@/shared/presentation/toast-layout";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

type ToastConfigProps = Readonly<{ focused?: boolean; success?: boolean }>;
type FlashcardToastProps = Readonly<ToastConfigParams<ToastConfigProps>>;

function FlashcardToast({ text1, props }: FlashcardToastProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const focused = props?.focused ?? false;
  const success = props?.success ?? false;
  const focusIcon = focused
    ? ({ android: "center_focus_strong", ios: "scope", web: "center_focus_strong" } as const)
    : ({ android: "pan_tool", ios: "hand.raised.fill", web: "pan_tool" } as const);

  return (
    <View accessibilityLiveRegion="polite" style={styles.toast}>
      <SymbolView
        name={
          success
            ? { android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" }
            : focusIcon
        }
        size={sizes.icon.small}
        tintColor={colors.interactive}
      />
      <Text style={styles.label}>{text1}</Text>
    </View>
  );
}

const toastConfig: ToastConfig = {
  flashcardReels: (props) => <FlashcardToast {...props} />,
};
let activeToast: "focus" | "success" | null = null;

export function showSuccessToast(message: string): void {
  activeToast = "success";
  Toast.show({
    props: { success: true },
    text1: message,
    type: "flashcardReels",
    visibilityTime: 2500,
  });
}

export function showHoldToast(): void {
  activeToast = "focus";
  Toast.show({
    autoHide: false,
    props: { focused: false },
    swipeable: false,
    text1: "Hold to Focus",
    type: "flashcardReels",
  });
}

export function showFocusedToast(): void {
  activeToast = "focus";
  Toast.show({
    props: { focused: true },
    text1: "Focused on this deck",
    type: "flashcardReels",
    visibilityTime: 1200,
  });
}

export function hideFlashcardToast(): void {
  if (activeToast === "focus") {
    activeToast = null;
    Toast.hide();
  }
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
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.small,
      minHeight: sizes.touchTarget.minimum,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.medium,
    },
  });
}
