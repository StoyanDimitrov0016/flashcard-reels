import type { ReactElement } from "react";

import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AppPreferences,
  ControlSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";

import { recallOptions } from "@/features/reels/presentation/recall-options";
import {
  deriveControlPlacement,
  getControlSideLabel,
  getRatingDirectionLabel,
  isBeforeRatings,
  resolveStudyControlLayout,
  type ResolvedStudyControlLayout,
} from "@/features/reels/presentation/study-control-layout";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";
import { SheetHeader } from "@/shared/presentation/components/sheet-header";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

const positions: readonly RecollectionIslandPosition[] = ["left", "bottom", "right"];

// The preview is a small card, so its island uses compact markers instead of the real 40pt ones.
const PREVIEW_MARKER = 24;
const PREVIEW_TOOL = 28;

type PreviewToolProps = Readonly<{ symbol: SymbolViewProps["name"] }>;

function PreviewTool({ symbol }: PreviewToolProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.previewTool}>
      <SymbolView name={symbol} size={14} tintColor={colors.textPrimary} />
    </View>
  );
}

type StudyIslandPreviewProps = Readonly<{ layout: ResolvedStudyControlLayout }>;

/** A small answer card showing where the island, audio, and reading buttons will sit. */
function StudyIslandPreview({ layout }: StudyIslandPreviewProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const horizontal = layout.orientation === "horizontal";
  const before: ReactElement[] = [];
  const after: ReactElement[] = [];
  if (layout.audioEnabled) {
    (isBeforeRatings(layout.audioPosition) ? before : after).push(
      <PreviewTool
        key="audio"
        symbol={{ android: "volume_up", ios: "speaker.wave.2.fill", web: "volume_up" }}
      />
    );
  }
  if (layout.readingEnabled) {
    const reading = (
      <PreviewTool
        key="reading"
        symbol={{ android: "menu_book", ios: "book.fill", web: "menu_book" }}
      />
    );
    if (isBeforeRatings(layout.readingPosition)) {
      before.unshift(reading);
    } else {
      after.push(reading);
    }
  }
  const toolGroup = (tools: ReactElement[]) =>
    tools.length > 0 && (
      <View style={[styles.previewTools, horizontal && styles.previewToolsHorizontal]}>
        {tools}
      </View>
    );

  const cluster = (
    <View style={[styles.previewCluster, horizontal && styles.previewClusterHorizontal]}>
      {toolGroup(before)}
      <View style={[styles.previewIsland, horizontal && styles.previewIslandHorizontal]}>
        {layout.ratingOrder.map((level) => {
          const option = recallOptions.find((current) => current.level === level);
          if (!option) {
            return null;
          }
          return (
            <View key={level} style={[styles.previewAction, horizontal && styles.flexOne]}>
              <View style={[styles.previewMarker, { backgroundColor: colors[option.color] }]}>
                <SymbolView name={option.symbol} size={13} tintColor={colors.actionPrimaryText} />
              </View>
              <Text numberOfLines={1} style={styles.previewLabel}>
                {option.label}
              </Text>
            </View>
          );
        })}
      </View>
      {toolGroup(after)}
    </View>
  );

  return (
    <View
      accessibilityLabel={`Preview: island on the ${layout.position}`}
      style={[
        styles.preview,
        horizontal ? styles.previewBottom : styles.previewSide,
        layout.position === "left" && styles.previewLeft,
      ]}
    >
      <View style={styles.previewAnswer}>
        <View style={[styles.previewLine, styles.previewLineShort]} />
        <View style={styles.previewLine} />
        <View style={styles.previewLine} />
        <View style={[styles.previewLine, styles.previewLineMedium]} />
      </View>
      {cluster}
    </View>
  );
}

function animateNext() {
  LayoutAnimation.configureNext({
    duration: 180,
    update: { type: LayoutAnimation.Types.easeInEaseOut },
  });
}

type StudyControlsSheetProps = Readonly<{
  onAudioSideChange: (value: ControlSide) => void;
  onClose: () => void;
  onPositionChange: (value: RecollectionIslandPosition) => void;
  onRatingDirectionChange: (value: RatingDirection) => void;
  onReadingSideChange: (value: ControlSide) => void;
  preferences: AppPreferences;
  visible: boolean;
}>;

export function StudyControlsSheet({
  onAudioSideChange,
  onClose,
  onPositionChange,
  onRatingDirectionChange,
  onReadingSideChange,
  preferences,
  visible,
}: StudyControlsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const layout = resolveStudyControlLayout(preferences);
  const position = preferences.recollectionIslandPosition;
  const sideOptions = [
    {
      label: getControlSideLabel(position, "primary"),
      symbol: getPlacementSymbol(position, "primary"),
      value: "primary" as const,
    },
    {
      label: getControlSideLabel(position, "opposite"),
      symbol: getPlacementSymbol(position, "opposite"),
      value: "opposite" as const,
    },
  ];

  return (
    <AppBottomSheet onClose={onClose} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <SheetHeader closeLabel="Close study island" onClose={onClose} title="Study island" />
        <View style={styles.content}>
          <StudyIslandPreview layout={layout} />
          <View style={styles.controls}>
            <OptionGroup
              label="Position"
              options={positions.map((value) => ({
                label: value.charAt(0).toUpperCase() + value.slice(1),
                symbol: getPositionSymbol(value),
                value,
              }))}
              selected={position}
              onChange={(value) => {
                if (value !== position) {
                  animateNext();
                }
                onPositionChange(value);
              }}
            />
            <OptionGroup
              label="Order"
              options={[
                {
                  label: getRatingDirectionLabel(position, "forward"),
                  symbol: getDirectionSymbol(position, "forward"),
                  value: "forward" as const,
                },
                {
                  label: getRatingDirectionLabel(position, "reverse"),
                  symbol: getDirectionSymbol(position, "reverse"),
                  value: "reverse" as const,
                },
              ]}
              selected={preferences.ratingDirection}
              onChange={onRatingDirectionChange}
            />
            <OptionGroup
              disabled={!preferences.audioEnabled}
              label="Audio"
              options={sideOptions}
              selected={preferences.audioSide}
              onChange={(value) => {
                animateNext();
                onAudioSideChange(value);
              }}
            />
            <OptionGroup
              disabled={!preferences.readingEnabled}
              label="Reading"
              options={sideOptions}
              selected={preferences.readingSide}
              onChange={(value) => {
                animateNext();
                onReadingSideChange(value);
              }}
            />
          </View>
          {(!preferences.audioEnabled || !preferences.readingEnabled) && (
            <Text style={styles.footnote}>Turned-off buttons can be switched on in Controls.</Text>
          )}
        </View>
      </View>
    </AppBottomSheet>
  );
}

function getPositionSymbol(position: RecollectionIslandPosition): SymbolViewProps["name"] {
  if (position === "left") {
    return {
      android: "align_horizontal_left",
      ios: "align.horizontal.left.fill",
      web: "align_horizontal_left",
    };
  }
  if (position === "right") {
    return {
      android: "align_horizontal_right",
      ios: "align.horizontal.right.fill",
      web: "align_horizontal_right",
    };
  }
  return {
    android: "vertical_align_bottom",
    ios: "align.vertical.bottom.fill",
    web: "vertical_align_bottom",
  };
}

function getDirectionSymbol(
  position: RecollectionIslandPosition,
  direction: RatingDirection
): SymbolViewProps["name"] {
  if (position === "bottom") {
    return direction === "forward"
      ? { android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" }
      : { android: "arrow_back", ios: "arrow.left", web: "arrow_back" };
  }
  return direction === "forward"
    ? { android: "arrow_downward", ios: "arrow.down", web: "arrow_downward" }
    : { android: "arrow_upward", ios: "arrow.up", web: "arrow_upward" };
}

function getPlacementSymbol(
  position: RecollectionIslandPosition,
  side: ControlSide
): SymbolViewProps["name"] {
  const names = {
    above: { android: "arrow_upward", ios: "arrow.up", web: "arrow_upward" },
    below: { android: "arrow_downward", ios: "arrow.down", web: "arrow_downward" },
    left: { android: "arrow_back", ios: "arrow.left", web: "arrow_back" },
    right: { android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" },
  } as const;
  return names[deriveControlPlacement(position, side)];
}

type OptionGroupProps<T extends string> = Readonly<{
  /** Dims the group while its button is switched off; the choice is kept. */
  disabled?: boolean;
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; symbol: SymbolViewProps["name"]; value: T }[];
  selected: T;
}>;

function OptionGroup<T extends string>({
  disabled = false,
  label,
  onChange,
  options,
  selected,
}: OptionGroupProps<T>) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={[styles.optionGroup, disabled && styles.disabled]}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View accessibilityRole="radiogroup" style={styles.options}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityLabel={`${label}: ${option.label}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled, selected: isSelected }}
              disabled={disabled}
              hitSlop={4}
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <SymbolView
                name={option.symbol}
                size={16}
                tintColor={isSelected ? colors.textPrimary : colors.textSecondary}
              />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      gap: sizes.spacing.screen,
      paddingBottom: sizes.spacing.spacious,
      paddingHorizontal: sizes.spacing.content,
    },
    controls: { gap: sizes.spacing.section },
    disabled: { opacity: 0.45 },
    flexOne: { flex: 1 },
    footnote: { color: colors.textTertiary, fontSize: fontSize.caption, textAlign: "center" },
    option: {
      alignItems: "center",
      borderColor: colors.studyIslandBorder,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      flex: 1,
      height: sizes.control.compact,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.xSmall,
    },
    optionGroup: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium },
    optionLabel: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      width: 64,
    },
    optionSelected: { backgroundColor: colors.surfaceHover, borderColor: colors.actionPrimary },
    options: { flex: 1, flexDirection: "row", gap: sizes.spacing.large },
    preview: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.card,
      borderWidth: sizes.border,
      gap: sizes.spacing.medium,
      // Fits a vertical island with a button above and below it.
      height: 272,
      maxWidth: 300,
      overflow: "hidden",
      padding: sizes.spacing.large,
      width: "78%",
    },
    previewAction: { alignItems: "center", gap: 2, minWidth: 30 },
    previewAnswer: {
      backgroundColor: colors.surfaceSubtle,
      borderRadius: sizes.radius.medium,
      flex: 1,
      gap: sizes.spacing.small,
      justifyContent: "center",
      padding: sizes.spacing.large,
    },
    previewBottom: { flexDirection: "column" },
    previewCluster: { alignItems: "center", flexDirection: "column", gap: sizes.spacing.small },
    previewClusterHorizontal: {
      alignSelf: "stretch",
      flexDirection: "row",
      justifyContent: "center",
    },
    previewIsland: {
      alignItems: "center",
      backgroundColor: colors.studyIslandSurface,
      borderColor: colors.studyIslandBorder,
      borderRadius: sizes.radius.island,
      borderWidth: sizes.border,
      flexDirection: "column",
      gap: sizes.spacing.small,
      padding: sizes.spacing.small,
    },
    previewIslandHorizontal: {
      flexBasis: 0,
      flexDirection: "row",
      flexGrow: 1,
      flexShrink: 1,
      gap: 0,
      maxWidth: 176,
    },
    previewLabel: { color: colors.textSecondary, fontSize: 9, fontWeight: fontWeight.bold },
    previewLeft: { flexDirection: "row-reverse" },
    previewLine: { backgroundColor: colors.borderStrong, borderRadius: 3, height: 6 },
    previewLineMedium: { width: "70%" },
    previewLineShort: { marginBottom: sizes.spacing.xSmall, opacity: 0.6, width: "45%" },
    previewMarker: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: PREVIEW_MARKER,
      justifyContent: "center",
      width: PREVIEW_MARKER,
    },
    previewSide: { flexDirection: "row" },
    previewTool: {
      alignItems: "center",
      backgroundColor: colors.surfaceHover,
      borderRadius: sizes.radius.pill,
      height: PREVIEW_TOOL,
      justifyContent: "center",
      width: PREVIEW_TOOL,
    },
    previewTools: { alignItems: "center", gap: sizes.spacing.small },
    previewToolsHorizontal: { flexDirection: "row" },
    sheet: { flexShrink: 1 },
  });
}
