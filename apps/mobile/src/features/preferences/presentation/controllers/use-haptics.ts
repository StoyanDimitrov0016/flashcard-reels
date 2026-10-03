import { createHapticPolicy } from "@/features/preferences/application/haptics-policy";
import { usePreferencesContext } from "@/features/preferences/presentation/controllers/preferences-context";
import { triggerHaptic } from "@/features/preferences/presentation/haptics";

export function useHaptics() {
  const { preferences } = usePreferencesContext();
  return createHapticPolicy(preferences.hapticsEnabled, triggerHaptic);
}
