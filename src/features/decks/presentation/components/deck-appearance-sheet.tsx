import { BottomSheet } from "@expo/ui";
import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import {
  deckAppearancePresets,
  isCurrentPreset,
  type DeckAppearancePreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";

type DeckAppearanceSheetProps = Readonly<{
  appearance: DeckAppearance | null;
  error: string | null;
  isPresented: boolean;
  onDismiss: () => void;
  onSelect: (preset: DeckAppearancePreset) => void;
  pendingPreset: DeckAppearancePreset | null;
}>;

export function DeckAppearanceSheet({
  appearance,
  error,
  isPresented,
  onDismiss,
  onSelect,
  pendingPreset,
}: DeckAppearanceSheetProps) {
  return (
    <BottomSheet
      containerColor={palette.surfaceRaised}
      contentPadding={sizes.spacing.content}
      isPresented={isPresented}
      onDismiss={onDismiss}
      showDragIndicator
      snapPoints={["half", "full"]}
    >
      <View style={styles.content}>
        <Text accessibilityRole="header" style={styles.title}>
          Deck appearance
        </Text>
        <Text style={styles.subtitle}>Choose a curated, high-contrast theme.</Text>
        <View style={styles.grid}>
          {deckAppearancePresets.map((preset) => {
            const selected = appearance ? isCurrentPreset(preset, appearance) : false;
            const pending = pendingPreset === preset;
            return (
              <Pressable
                accessibilityLabel={`${preset.name} palette`}
                accessibilityRole="radio"
                accessibilityState={{
                  busy: pending,
                  checked: selected,
                  disabled: pendingPreset !== null,
                }}
                disabled={pendingPreset !== null}
                key={preset.name}
                onPress={() => onSelect(preset)}
                style={[styles.preset, { backgroundColor: preset.backgroundColor }]}
              >
                <View style={[styles.swatch, { backgroundColor: preset.accentColor }]} />
                <Text style={styles.presetName}>{preset.name}</Text>
                {pending && <ActivityIndicator color={preset.accentColor} size="small" />}
                {!pending && selected ? (
                  <SymbolView
                    name={{
                      android: "check_circle",
                      ios: "checkmark.circle.fill",
                      web: "check_circle",
                    }}
                    size={sizes.icon.medium}
                    tintColor={preset.accentColor}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  content: { gap: sizes.spacing.medium },
  error: { color: palette.danger, fontSize: 13 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: sizes.spacing.medium },
  preset: {
    alignItems: "center",
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.card,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.large,
    minHeight: 60,
    padding: sizes.spacing.xLarge,
    width: "48%",
  },
  presetName: { color: palette.textPrimary, flex: 1, fontSize: 13, fontWeight: "700" },
  subtitle: { color: palette.textSecondary, fontSize: 14, marginBottom: sizes.spacing.medium },
  swatch: { borderRadius: sizes.radius.pill, height: 22, width: 22 },
  title: { color: palette.textPrimary, fontSize: 24, fontWeight: "800" },
});
