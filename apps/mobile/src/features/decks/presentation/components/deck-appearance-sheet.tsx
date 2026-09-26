import { SymbolView } from "expo-symbols";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckCoverAsset } from "@/features/decks/domain/deck.model";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import {
  deckAppearancePresets,
  isCurrentPreset,
  resolveDeckAppearance,
  type DeckAppearancePreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

// Ten presets fill two rows of five exactly.
const SWATCH_COLUMNS = 5;
const SWATCH_SIZE = 48;
const SWATCH_RING_GAP = 3;

type PreviewDeck = Readonly<{ coverAsset: DeckCoverAsset; title: string }>;

type PalettePreviewProps = Readonly<{ deck: PreviewDeck | null; preset: DeckAppearancePreset }>;

/** A small reel card in the chosen palette, since reels are where deck colors show most. */
function PalettePreview({ deck, preset }: PalettePreviewProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const palette = resolveDeckAppearance(preset.id, resolvedScheme);

  return (
    <View
      accessibilityLabel={`Preview of the ${preset.name} palette`}
      style={[styles.preview, { backgroundColor: palette.background }]}
    >
      <View style={styles.previewDeck}>
        {!!deck && <DeckCover accentColor={palette.accent} asset={deck.coverAsset} />}
        <View style={styles.previewDeckCopy}>
          {!!deck && (
            <Text
              numberOfLines={1}
              style={[styles.previewDeckTitle, { color: palette.textPrimary }]}
            >
              {deck.title}
            </Text>
          )}
          <Text style={[styles.previewPaletteName, { color: palette.accent }]}>{preset.name}</Text>
        </View>
      </View>
      <Text style={[styles.previewQuestion, { color: palette.textPrimary }]}>
        Every card in this deck uses these colors.
      </Text>
      <Text style={[styles.previewInstruction, { color: palette.textSecondary }]}>
        Tap to reveal the answer
      </Text>
    </View>
  );
}

type PaletteSwatchProps = Readonly<{
  disabled: boolean;
  onSelect: (preset: DeckAppearancePreset) => void;
  pending: boolean;
  preset: DeckAppearancePreset;
  selected: boolean;
}>;

function PaletteSwatch({ disabled, onSelect, pending, preset, selected }: PaletteSwatchProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const palette = resolveDeckAppearance(preset.id, resolvedScheme);

  return (
    <Pressable
      accessibilityHint="Applies this palette immediately"
      accessibilityLabel={preset.name + " palette"}
      accessibilityRole="radio"
      accessibilityState={{ busy: pending, checked: selected, disabled }}
      disabled={disabled}
      onPress={() => onSelect(preset)}
      style={({ pressed }) => [styles.swatchItem, pressed && styles.pressed]}
    >
      <View style={[styles.swatchRing, selected && { borderColor: palette.accent }]}>
        <View style={[styles.swatch, { backgroundColor: palette.background }]}>
          <View style={[styles.swatchAccent, { backgroundColor: palette.accent }]}>
            {pending ? (
              <ActivityIndicator color={palette.background} size="small" />
            ) : (
              selected && (
                <SymbolView
                  name={{ android: "check", ios: "checkmark", web: "check" }}
                  size={sizes.icon.small}
                  tintColor={palette.background}
                />
              )
            )}
          </View>
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[styles.swatchName, (selected || pending) && styles.swatchNameSelected]}
      >
        {preset.name}
      </Text>
    </Pressable>
  );
}

type DeckAppearanceSheetProps = Readonly<{
  appearance: DeckAppearance | null;
  /** The deck being themed, shown in the preview. */
  deck: PreviewDeck | null;
  error: string | null;
  isPresented: boolean;
  onDismiss: () => void;
  onSelect: (preset: DeckAppearancePreset) => void;
  pendingPreset: DeckAppearancePreset | null;
}>;

export function DeckAppearanceSheet({
  appearance,
  deck,
  error,
  isPresented,
  onDismiss,
  onSelect,
  pendingPreset,
}: DeckAppearanceSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const currentPreset = appearance
    ? deckAppearancePresets.find((preset) => isCurrentPreset(preset, appearance))
    : undefined;
  const previewPreset = pendingPreset ?? currentPreset ?? deckAppearancePresets[0];

  return (
    <AppBottomSheet onClose={onDismiss} size="content" visible={isPresented}>
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
        {!!previewPreset && <PalettePreview deck={deck} preset={previewPreset} />}
        <View accessibilityRole="radiogroup" style={styles.swatches}>
          {deckAppearancePresets.map((preset) => (
            <PaletteSwatch
              disabled={pendingPreset !== null}
              key={preset.id}
              onSelect={onSelect}
              pending={pendingPreset === preset}
              preset={preset}
              selected={preset === currentPreset && pendingPreset === null}
            />
          ))}
        </View>
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
    error: { color: colors.error, fontSize: fontSize.footnote },
    header: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium },
    pressed: { opacity: 0.72 },
    preview: {
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.card,
      borderWidth: sizes.border,
      gap: sizes.spacing.medium,
      padding: sizes.spacing.content,
    },
    previewDeck: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      marginBottom: sizes.spacing.medium,
    },
    previewDeckCopy: { flex: 1, gap: 2 },
    previewDeckTitle: { fontSize: fontSize.body, fontWeight: fontWeight.bold },
    previewInstruction: { fontSize: fontSize.footnote, lineHeight: lineHeight.footnote },
    previewPaletteName: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    previewQuestion: {
      fontSize: fontSize.title3,
      fontWeight: fontWeight.heavy,
      lineHeight: lineHeight.title3,
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      gap: sizes.spacing.xLarge,
      maxWidth: sizes.sheet.maxWidthCompact,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
      width: "100%",
    },
    swatch: {
      alignItems: "center",
      borderColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      borderWidth: sizes.border,
      height: SWATCH_SIZE,
      justifyContent: "center",
      width: SWATCH_SIZE,
    },
    swatchAccent: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: SWATCH_SIZE / 2,
      justifyContent: "center",
      width: SWATCH_SIZE / 2,
    },
    swatchItem: {
      alignItems: "center",
      gap: sizes.spacing.small,
      paddingVertical: sizes.spacing.small,
      width: `${100 / SWATCH_COLUMNS}%`,
    },
    swatchName: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.semibold,
    },
    swatchNameSelected: { color: colors.textPrimary, fontWeight: fontWeight.bold },
    swatchRing: {
      borderColor: "transparent",
      borderRadius: sizes.radius.pill,
      borderWidth: 2,
      padding: SWATCH_RING_GAP,
    },
    swatches: { flexDirection: "row", flexWrap: "wrap", rowGap: sizes.spacing.medium },
    title: { color: colors.textPrimary, flex: 1, ...textStyles.screenTitle },
  });
}
