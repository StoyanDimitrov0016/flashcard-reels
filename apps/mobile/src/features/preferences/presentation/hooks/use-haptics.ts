import { useMemo } from "react";

import { createHapticPolicy } from "@/features/preferences/application/haptics-policy";
import { usePreferences } from "@/features/preferences/presentation/hooks/use-preferences";
import { triggerHaptic } from "@/shared/presentation/haptics";

export function useHaptics() {
  const { preferences } = usePreferences();
  return useMemo(
    () => createHapticPolicy(preferences.hapticsEnabled, triggerHaptic),
    [preferences.hapticsEnabled]
  );
}
