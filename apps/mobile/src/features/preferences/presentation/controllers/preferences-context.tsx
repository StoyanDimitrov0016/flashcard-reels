import { createContext, type ReactNode, useContext, useEffect, useRef, useState } from "react";
import { useColorScheme } from "react-native";

import type { PreferencesService as PreferencesServiceType } from "@/features/preferences/application/preferences.service";

import {
  defaultAppPreferences,
  resolveColorScheme,
  type AppPreferences,
  type ColorMode,
  type AudioSide,
  type ControlSide,
  type RatingDirection,
  type StudyIslandPosition,
  type ResolvedColorScheme,
} from "@/features/preferences/domain/app-preferences";
import { toOperationError } from "@/shared/errors/normalize-error";
import { reportError } from "@/shared/errors/report-error";

type PreferencesContextValue = Readonly<{
  preferences: AppPreferences;
  ready: boolean;
  storageError: Error | null;
  resolvedScheme: ResolvedColorScheme;
  setColorMode: (colorMode: ColorMode) => void;
  setAudioEnabled: (enabled: boolean) => void;
  setAudioSide: (audioSide: AudioSide) => void;
  setHapticsEnabled: (enabled: boolean) => void;
  setReadingEnabled: (enabled: boolean) => void;
  setReadingSide: (readingSide: ControlSide) => void;
  setRatingDirection: (ratingDirection: RatingDirection) => void;
  setStudyIslandPosition: (position: StudyIslandPosition) => void;
}>;

const PreferencesContext = createContext<PreferencesContextValue | null>(null);

type PreferencesProviderProps = Readonly<{
  children: ReactNode;
  service: PreferencesServiceType;
}>;

export function PreferencesProvider({ children, service }: PreferencesProviderProps) {
  const deviceScheme = useColorScheme();
  const [preferences, setPreferences] = useState<AppPreferences>(defaultAppPreferences);
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState<Error | null>(null);
  const preferencesReference = useRef(defaultAppPreferences);
  const writeQueue = useRef(Promise.resolve());

  useEffect(
    function loadPreferences() {
      let active = true;
      void service
        .load()
        .then((loadedPreferences) => {
          if (!active) {
            return;
          }
          preferencesReference.current = loadedPreferences;
          setPreferences(loadedPreferences);
          setReady(true);
        })
        .catch((error: unknown) => {
          if (!active) {
            return;
          }
          const normalized = toOperationError(error, {
            code: "PREFERENCES_READ_FAILED",
            context: { operation: "preferences.load" },
            message: "Preferences could not be loaded. Using defaults.",
          });
          reportError(normalized, "Preferences read failure");
          setStorageError(normalized);
          setReady(true);
        });
      return function deactivatePreferences() {
        active = false;
      };
    },
    [service]
  );

  const updatePreferences = <K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    const nextPreferences = { ...preferencesReference.current, [key]: value };
    preferencesReference.current = nextPreferences;
    setPreferences(nextPreferences);
    writeQueue.current = writeQueue.current
      .catch(() => undefined)
      .then(() => service.save(nextPreferences))
      .then(() => setStorageError(null))
      .catch((error: unknown) => {
        const normalized = toOperationError(error, {
          code: "PREFERENCES_WRITE_FAILED",
          context: { operation: "preferences.save" },
          message: "Preferences could not be saved. Changes may be lost when you close the app.",
        });
        reportError(normalized, "Preferences write failure");
        setStorageError(normalized);
      });
  };

  const contextValue: PreferencesContextValue = {
    preferences,
    ready,
    storageError,
    resolvedScheme: resolveColorScheme(
      preferences.colorMode,
      deviceScheme === "light" || deviceScheme === "dark" ? deviceScheme : null
    ),
    setColorMode: (colorMode) => updatePreferences("colorMode", colorMode),
    setAudioEnabled: (enabled) => updatePreferences("audioEnabled", enabled),
    setAudioSide: (audioSide) => updatePreferences("audioSide", audioSide),
    setHapticsEnabled: (enabled) => updatePreferences("hapticsEnabled", enabled),
    setReadingEnabled: (enabled) => updatePreferences("readingEnabled", enabled),
    setReadingSide: (readingSide) => updatePreferences("readingSide", readingSide),
    setRatingDirection: (ratingDirection) => updatePreferences("ratingDirection", ratingDirection),
    setStudyIslandPosition: (position) => updatePreferences("studyIslandPosition", position),
  };

  return <PreferencesContext.Provider value={contextValue}>{children}</PreferencesContext.Provider>;
}

export function usePreferencesContext(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error("usePreferencesContext requires PreferencesProvider");
  }
  return context;
}
