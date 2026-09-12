import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";

import type {
  AppPreferences,
  AudioSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";
import { recallOptions } from "@/features/reels/presentation/recall-options";
import {
  deriveAudioPosition,
  getAudioSideLabel,
  getRatingDirectionLabel,
  resolveStudyControlLayout,
} from "@/features/reels/presentation/study-control-layout";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";

type StudyControlsSheetProps = Readonly<{
  onAudioSideChange: (value: AudioSide) => void;
  onClose: () => void;
  onPositionChange: (value: RecollectionIslandPosition) => void;
  onRatingDirectionChange: (value: RatingDirection) => void;
  preferences: AppPreferences;
  visible: boolean;
}>;

const positions: readonly RecollectionIslandPosition[] = ["left", "bottom", "right"];

export function StudyControlsSheet({
  onAudioSideChange,
  onClose,
  onPositionChange,
  onRatingDirectionChange,
  preferences,
  visible,
}: StudyControlsSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const layout = resolveStudyControlLayout(preferences);
  const { audioPosition, orientation } = layout;
  const audioBeforeIsland = audioPosition === "left" || audioPosition === "above";
  const audioMarker = (
    <View style={styles.audioMarker}>
      <SymbolView
        name={{ android: "volume_up", ios: "speaker.wave.2.fill", web: "volume_up" }}
        size={sizes.icon.small}
        tintColor={colors.textPrimary}
      />
    </View>
  );
  const handlePositionChange = (position: RecollectionIslandPosition) => {
    if (position !== preferences.recollectionIslandPosition) {
      LayoutAnimation.configureNext({
        duration: 180,
        update: { type: LayoutAnimation.Types.easeInEaseOut },
      });
    }
    onPositionChange(position);
  };

  return (
    <AppBottomSheet onClose={onClose} size="half-full" visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <View style={styles.headingCopy}>
            <Text accessibilityRole="header" style={styles.title}>
              Study island
            </Text>
          </View>
          <Pressable
            accessibilityLabel="Close study island"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <SymbolView
              name={{ android: "close", ios: "xmark", web: "close" }}
              size={sizes.icon.medium}
              tintColor={colors.textPrimary}
            />
          </Pressable>
        </View>
        <View style={styles.content}>
          <View style={styles.preview}>
            <View
              style={[
                styles.previewStage,
                layout.position === "bottom" ? styles.previewStageBottom : styles.previewStageSide,
                layout.position === "left" && styles.previewStageLeft,
                layout.position === "right" && styles.previewStageRight,
              ]}
            >
              {layout.position === "left" ? null : <View style={styles.previewContentRegion} />}
              <View
                style={[
                  styles.previewCluster,
                  orientation === "horizontal" && styles.previewClusterHorizontal,
                ]}
              >
                <View
                  style={[
                    styles.previewControlsGroup,
                    orientation === "horizontal" && styles.previewControlsGroupHorizontal,
                  ]}
                >
                  {audioBeforeIsland ? audioMarker : null}
                  <View
                    style={[
                      styles.previewIsland,
                      orientation === "vertical" && styles.previewIslandSide,
                      orientation === "horizontal" && styles.previewIslandHorizontal,
                    ]}
                  >
                    <View
                      style={[
                        styles.previewRatingControls,
                        orientation === "vertical" && styles.previewRatingControlsSide,
                        orientation === "horizontal" && styles.previewRatingControlsHorizontal,
                      ]}
                    >
                      {layout.ratingOrder.map((level) => {
                        const option = recallOptions.find((current) => current.level === level);
                        if (!option) {
                          return null;
                        }
                        return (
                          <View
                            key={level}
                            style={[
                              styles.previewAction,
                              orientation === "vertical" && styles.previewActionSide,
                              orientation === "horizontal" && styles.previewActionHorizontal,
                            ]}
                          >
                            <View
                              style={[
                                styles.previewMarker,
                                orientation === "vertical" && styles.previewMarkerSide,
                                { backgroundColor: colors[option.color] },
                              ]}
                            >
                              <SymbolView
                                name={option.symbol}
                                size={sizes.icon.small}
                                tintColor={colors.actionPrimaryText}
                              />
                            </View>
                            <Text style={styles.previewLabel}>{option.label}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                  {audioBeforeIsland ? null : audioMarker}
                </View>
              </View>
              {layout.position === "left" ? <View style={styles.previewContentRegion} /> : null}
            </View>
          </View>
          <View style={styles.controls}>
            <OptionGroup
              label="Position"
              options={positions.map((value) => ({
                label: value.charAt(0).toUpperCase() + value.slice(1),
                symbol: getPositionSymbol(value),
                value,
              }))}
              selected={preferences.recollectionIslandPosition}
              onChange={handlePositionChange}
            />
            <OptionGroup
              label="Order"
              options={[
                {
                  label: getRatingDirectionLabel(preferences.recollectionIslandPosition, "forward"),
                  symbol: getDirectionSymbol(preferences.recollectionIslandPosition, "forward"),
                  value: "forward" as const,
                },
                {
                  label: getRatingDirectionLabel(preferences.recollectionIslandPosition, "reverse"),
                  symbol: getDirectionSymbol(preferences.recollectionIslandPosition, "reverse"),
                  value: "reverse" as const,
                },
              ]}
              selected={preferences.ratingDirection}
              onChange={onRatingDirectionChange}
            />
            <OptionGroup
              label="Audio"
              options={[
                {
                  label: getAudioSideLabel(preferences.recollectionIslandPosition, "primary"),
                  symbol: getAudioSymbol(preferences.recollectionIslandPosition, "primary"),
                  value: "primary" as const,
                },
                {
                  label: getAudioSideLabel(preferences.recollectionIslandPosition, "opposite"),
                  symbol: getAudioSymbol(preferences.recollectionIslandPosition, "opposite"),
                  value: "opposite" as const,
                },
              ]}
              selected={preferences.audioSide}
              onChange={onAudioSideChange}
            />
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
            <Text style={styles.doneLabel}>Done</Text>
          </Pressable>
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

function getAudioSymbol(
  position: RecollectionIslandPosition,
  side: AudioSide
): SymbolViewProps["name"] {
  const concrete = deriveAudioPosition(position, side);
  const names = {
    above: { android: "arrow_upward", ios: "arrow.up", web: "arrow_upward" },
    below: { android: "arrow_downward", ios: "arrow.down", web: "arrow_downward" },
    left: { android: "arrow_back", ios: "arrow.left", web: "arrow_back" },
    right: { android: "arrow_forward", ios: "arrow.right", web: "arrow_forward" },
  } as const;
  return names[concrete];
}
type OptionGroupProps<T extends string> = Readonly<{
  label: string;
  onChange: (value: T) => void;
  options: readonly { label: string; symbol: SymbolViewProps["name"]; value: T }[];
  selected: T;
}>;
function OptionGroup<T extends string>({
  label,
  onChange,
  options,
  selected,
}: OptionGroupProps<T>) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.optionGroup}>
      <Text style={styles.optionLabel}>{label}</Text>
      <View style={styles.options}>
        {options.map((option) => {
          const isSelected = selected === option.value;
          return (
            <Pressable
              accessibilityLabel={option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, selected: isSelected }}
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
    closeButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
    },
    content: {
      flex: 1,
      gap: sizes.spacing.screen,
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
    },
    controls: { gap: sizes.spacing.section },
    doneButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      justifyContent: "center",
      minHeight: sizes.control.standard,
    },
    doneLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
    header: {
      alignItems: "flex-start",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.small,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: 0,
    },
    headingCopy: { flex: 1, gap: sizes.spacing.small },
    option: {
      alignItems: "center",
      borderColor: colors.studyIslandBorder,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      flex: 1,
      justifyContent: "center",
      height: sizes.control.compact,
      paddingHorizontal: sizes.spacing.xSmall,
    },
    optionGroup: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
    },
    optionLabel: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      width: 56,
    },
    optionSelected: { backgroundColor: colors.surfaceHover, borderColor: colors.actionPrimary },
    options: { flex: 1, flexDirection: "row", gap: sizes.spacing.large },
    preview: {
      alignSelf: "center",
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.card,
      borderWidth: sizes.border,
      flex: 1,
      justifyContent: "center",
      minHeight: 160,
      overflow: "hidden",
      position: "relative",
      width: "75%",
    },
    previewAction: { alignItems: "center", gap: sizes.spacing.xSmall },
    previewActionSide: { gap: sizes.spacing.xSmall / 2 },
    previewActionHorizontal: { minWidth: sizes.touchTarget.minimum },
    previewCluster: {
      alignItems: "center",
      flexDirection: "column",
      gap: sizes.spacing.small,
    },
    previewClusterHorizontal: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "center",
    },
    previewControlsGroup: {
      alignItems: "center",
      flexDirection: "column",
      gap: sizes.spacing.small,
    },
    previewControlsGroupHorizontal: {
      alignSelf: "center",
      flexDirection: "row",
      flexShrink: 0,
    },
    previewStage: {
      alignItems: "center",
      alignSelf: "stretch",
      flex: 1,
      gap: sizes.spacing.medium,
      justifyContent: "center",
    },
    previewStageSide: { flexDirection: "row" },
    previewStageBottom: {
      alignItems: "stretch",
      flexDirection: "column",
      justifyContent: "flex-end",
      paddingBottom: sizes.spacing.medium,
    },
    previewStageLeft: { paddingLeft: sizes.spacing.medium },
    previewStageRight: { paddingRight: sizes.spacing.medium },
    previewContentRegion: {
      alignSelf: "stretch",
      backgroundColor: colors.surfaceSubtle,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      flex: 1,
      minHeight: 0,
      minWidth: 0,
    },
    previewIsland: {
      alignItems: "center",
      backgroundColor: colors.studyIslandSurface,
      borderColor: colors.studyIslandBorder,
      borderRadius: sizes.radius.island,
      borderWidth: sizes.border,
      flexDirection: "column",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.medium,
      paddingVertical: sizes.spacing.content,
    },
    previewIslandSide: {
      gap: sizes.spacing.small,
      paddingHorizontal: sizes.spacing.small,
      paddingVertical: sizes.spacing.medium,
    },
    previewIslandHorizontal: {
      flexDirection: "row",
      paddingVertical: sizes.spacing.medium,
    },
    previewRatingControls: {
      alignItems: "center",
      flexDirection: "column",
      gap: sizes.spacing.medium,
    },
    previewRatingControlsSide: { gap: sizes.spacing.small },
    previewRatingControlsHorizontal: {
      flexDirection: "row",
      gap: 0,
      justifyContent: "space-around",
      minWidth: 0,
    },
    previewLabel: { color: colors.textTertiary, fontSize: fontSize.micro },
    previewMarker: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    previewMarkerSide: { height: 24, width: 24 },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surfaceRaised,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      flex: 1,
      minHeight: 0,
      width: "100%",
    },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
    audioMarker: {
      alignItems: "center",
      backgroundColor: colors.surfaceHover,
      borderRadius: sizes.radius.pill,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
  });
}
