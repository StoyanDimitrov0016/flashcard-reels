import { SymbolView } from "expo-symbols";
import {
  ActivityIndicator,
  FlatList,
  Modal,
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
  type DeckAppearancePreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, textStyles } from "@/shared/presentation/typography";

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
  const selected = appearance ? isCurrentPreset(preset, appearance) : false;
  const pending = pendingPreset === preset;

  return (
    <Pressable
      accessibilityHint="Applies this theme immediately"
      accessibilityLabel={`${preset.name} palette`}
      accessibilityRole="radio"
      accessibilityState={{ busy: pending, checked: selected, disabled: pendingPreset !== null }}
      disabled={pendingPreset !== null}
      onPress={() => onSelect(preset)}
      style={({ pressed }) => [
        styles.preset,
        { backgroundColor: preset.backgroundColor },
        selected && { borderColor: preset.accentColor },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.swatch, { backgroundColor: preset.accentColor }]} />
      <Text style={styles.presetName}>{preset.name}</Text>
      {pending && <ActivityIndicator color={preset.accentColor} size="small" />}
      {!pending && selected ? (
        <SymbolView
          name={{ android: "check_circle", ios: "checkmark.circle.fill", web: "check_circle" }}
          size={sizes.icon.medium}
          tintColor={preset.accentColor}
        />
      ) : null}
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
  const { width } = useWindowDimensions();
  const columnCount = width >= 520 ? 2 : 1;
  const renderPreset: ListRenderItem<DeckAppearancePreset> = ({ item }) => (
    <PresetItem
      appearance={appearance}
      onSelect={onSelect}
      pendingPreset={pendingPreset}
      preset={item}
    />
  );

  return (
    <Modal
      animationType="slide"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={isPresented}
    >
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close deck appearance"
          accessibilityRole="button"
          onPress={onDismiss}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <View style={styles.headingCopy}>
              <Text accessibilityRole="header" style={styles.title}>
                Deck appearance
              </Text>
              <Text style={styles.subtitle}>Choose a curated, high-contrast theme.</Text>
            </View>
            <Pressable
              accessibilityLabel="Close deck appearance"
              accessibilityRole="button"
              onPress={onDismiss}
              style={styles.closeButton}
            >
              <SymbolView
                name={{ android: "close", ios: "xmark", web: "close" }}
                size={sizes.icon.medium}
                tintColor={palette.textPrimary}
              />
            </Pressable>
          </View>
          <FlatList
            columnWrapperStyle={columnCount === 2 ? styles.row : undefined}
            contentContainerStyle={styles.list}
            data={deckAppearancePresets}
            extraData={{ appearance, pendingPreset }}
            key={columnCount}
            keyExtractor={({ name }) => name}
            numColumns={columnCount}
            renderItem={renderPreset}
          />
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  error: {
    color: palette.danger,
    fontSize: fontSize.footnote,
    paddingHorizontal: sizes.spacing.content,
  },
  handle: {
    alignSelf: "center",
    backgroundColor: palette.textMuted,
    borderRadius: sizes.radius.pill,
    height: 4,
    marginTop: sizes.spacing.medium,
    width: 40,
  },
  header: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: sizes.spacing.medium,
    padding: sizes.spacing.content,
  },
  headingCopy: { flex: 1, gap: sizes.spacing.small },
  list: { gap: sizes.spacing.medium, padding: sizes.spacing.content, paddingTop: 0 },
  modalRoot: { flex: 1, justifyContent: "flex-end" },
  preset: {
    alignItems: "center",
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.card,
    borderWidth: 2,
    flex: 1,
    flexDirection: "row",
    gap: sizes.spacing.large,
    minHeight: 64,
    padding: sizes.spacing.xLarge,
  },
  presetName: {
    color: palette.textPrimary,
    flex: 1,
    fontSize: fontSize.footnote,
    fontWeight: fontWeight.bold,
  },
  pressed: { opacity: 0.72 },
  row: { gap: sizes.spacing.medium },
  scrim: {
    backgroundColor: palette.scrim,
    bottom: 0,
    left: 0,
    position: "absolute",
    right: 0,
    top: 0,
  },
  sheet: {
    alignSelf: "center",
    backgroundColor: palette.surfaceRaised,
    borderTopLeftRadius: sizes.radius.panel,
    borderTopRightRadius: sizes.radius.panel,
    maxHeight: "82%",
    maxWidth: 680,
    paddingBottom: sizes.spacing.content,
    width: "100%",
  },
  subtitle: { color: palette.textSecondary, fontSize: fontSize.body },
  swatch: { borderRadius: sizes.radius.pill, height: 24, width: 24 },
  title: { color: palette.textPrimary, ...textStyles.screenTitle },
});
