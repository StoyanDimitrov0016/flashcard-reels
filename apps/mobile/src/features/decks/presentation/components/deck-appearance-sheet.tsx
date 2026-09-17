import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type ListRenderItem,
} from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import {
  deckAppearancePresets,
  isCurrentPreset,
  resolveDeckAppearance,
  type DeckAppearancePreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, textStyles } from "@/shared/presentation/typography";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";

type DeckAppearanceSheetProps = Readonly<{
  appearance: DeckAppearance | null;
  error: string | null;
  isPresented: boolean;
  onDismiss: () => void;
  onSelect: (preset: DeckAppearancePreset) => void;
  pendingPreset: DeckAppearancePreset | null;
}>;

type PresetItemProps = Readonly<{
  appearance: DeckAppearance | null;
  onSelect: (preset: DeckAppearancePreset) => void;
  pendingPreset: DeckAppearancePreset | null;
  preset: DeckAppearancePreset;
}>;

function PresetItem({ appearance, onSelect, pendingPreset, preset }: PresetItemProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const previewColors = resolveDeckAppearance(preset.id, resolvedScheme);
  const selected = appearance ? isCurrentPreset(preset, appearance) : false;
  const pending = pendingPreset === preset;

  return (
    <Pressable
      accessibilityHint="Applies this theme immediately"
      accessibilityLabel={preset.name + " palette"}
      accessibilityRole="radio"
      accessibilityState={{ busy: pending, checked: selected, disabled: pendingPreset !== null }}
      disabled={pendingPreset !== null}
      onPress={() => onSelect(preset)}
      style={({ pressed }) => [styles.preset, pressed && styles.pressed]}
    >
      <View style={[styles.swatch, { backgroundColor: previewColors.background }]}>
        <View style={[styles.swatchAccent, { backgroundColor: previewColors.accent }]} />
      </View>
      <Text style={styles.presetName}>{preset.name}</Text>
      {pending ||
        (selected && (
          <View pointerEvents="none" style={styles.presetStatus}>
            {pending ? (
              <ActivityIndicator color={previewColors.accent} size="small" />
            ) : (
              <SymbolView
                name={{
                  android: "check_circle",
                  ios: "checkmark.circle.fill",
                  web: "check_circle",
                }}
                size={sizes.icon.medium}
                tintColor={previewColors.accent}
              />
            )}
          </View>
        ))}
    </Pressable>
  );
}

export function DeckAppearanceSheet({
  appearance,
  error,
  isPresented,
  onDismiss,
  onSelect,
  pendingPreset,
}: DeckAppearanceSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { width } = useWindowDimensions();
  const columnCount = width >= 680 ? 4 : 3;
  const renderPreset: ListRenderItem<DeckAppearancePreset> = ({ item }) => (
    <PresetItem
      appearance={appearance}
      onSelect={onSelect}
      pendingPreset={pendingPreset}
      preset={item}
    />
  );

  return (
    <AppBottomSheet onClose={onDismiss} size="medium" visible={isPresented}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            Deck appearance
          </Text>
          <Pressable
            accessibilityLabel="Close deck appearance"
            accessibilityRole="button"
            onPress={onDismiss}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ android: "close", ios: "xmark", web: "close" }}
              size={sizes.icon.medium}
              tintColor={colors.textPrimary}
            />
          </Pressable>
        </View>
        <FlatList
          columnWrapperStyle={styles.row}
          contentContainerStyle={styles.list}
          data={deckAppearancePresets}
          extraData={{ appearance, pendingPreset }}
          key={columnCount}
          keyExtractor={({ id }) => id}
          numColumns={columnCount}
          renderItem={renderPreset}
          style={styles.listView}
        />
        {!!error && (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        )}
      </View>
    </AppBottomSheet>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    closeButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    error: {
      color: colors.error,
      fontSize: fontSize.footnote,
      paddingHorizontal: sizes.spacing.content,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.small,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: 0,
    },
    list: { gap: sizes.spacing.medium, padding: sizes.spacing.content, paddingTop: 0 },
    preset: {
      alignItems: "center",
      flex: 1,
      gap: sizes.spacing.medium,
      minHeight: 104,
      padding: sizes.spacing.medium,
    },
    presetName: {
      color: colors.textPrimary,
      textAlign: "center",
      fontSize: fontSize.footnote,
      fontWeight: fontWeight.bold,
    },
    presetStatus: {
      position: "absolute",
      right: sizes.spacing.medium,
      top: sizes.spacing.medium,
    },
    pressed: { opacity: 0.72 },
    row: { gap: sizes.spacing.medium },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      flex: 1,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      maxWidth: sizes.sheet.maxWidthWide,
      paddingBottom: sizes.spacing.content,
      width: "100%",
    },
    listView: { flex: 1 },
    swatch: {
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      height: 52,
      overflow: "hidden",
      width: "100%",
    },
    swatchAccent: { height: "100%", opacity: 0.88, width: "55%" },
    title: { color: colors.textPrimary, flex: 1, ...textStyles.screenTitle },
  });
}
