import { createHapticPolicy } from "@/features/preferences/application/haptics-policy";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { triggerHaptic } from "@/features/preferences/presentation/haptics";

export function useHaptics() {
  const { preferences } = usePreferences();
  return createHapticPolicy(preferences.hapticsEnabled, triggerHaptic);
}
