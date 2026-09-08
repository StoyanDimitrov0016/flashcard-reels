import * as Haptics from "expo-haptics";

export function confirmAction(): void {
  void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
}

export function selectAction(): void {
  void Haptics.selectionAsync().catch(() => undefined);
}
