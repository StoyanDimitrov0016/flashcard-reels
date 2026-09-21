import { createHapticPolicy } from "@/features/preferences/application/haptics-policy";
import { triggerHaptic } from "@/features/preferences/presentation/haptics";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";

export function useHaptics() {
  const { preferences } = usePreferences();
  return createHapticPolicy(preferences.hapticsEnabled, triggerHaptic);
}
