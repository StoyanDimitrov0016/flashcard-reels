import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type {
  AppPreferences,
  AudioSide,
  RatingDirection,
  RecollectionIslandPosition,
} from "@/features/preferences/domain/app-preferences";
import { recallOptions } from "@/features/reels/presentation/recall-options";
import {
  deriveAudioPosition,
  deriveIslandOrientation,
  deriveRatingOrder,
  getAudioSideLabel,
  getRatingDirectionLabel,
} from "@/features/reels/presentation/study-control-layout";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight } from "@/shared/presentation/typography";

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
  const orientation = deriveIslandOrientation(preferences.recollectionIslandPosition);
  const audioPosition = deriveAudioPosition(
    preferences.recollectionIslandPosition,
    preferences.audioSide
  );
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

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.modalRoot}>
        <Pressable
          accessibilityLabel="Close study island"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.handle} />
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
          <ScrollView contentContainerStyle={styles.content}>
            <View style={styles.preview}>
              <View
                style={[
                  styles.previewStage,
                  preferences.recollectionIslandPosition === "bottom" && styles.previewStageBottom,
                  preferences.recollectionIslandPosition === "left" && styles.previewStageLeft,
                  preferences.recollectionIslandPosition === "right" && styles.previewStageRight,
                ]}
              >
                <View
                  style={[
                    styles.previewCluster,
                    orientation === "horizontal" && styles.previewClusterHorizontal,
                  ]}
                >
                  {audioBeforeIsland ? audioMarker : null}
                  <View
                    style={[
                      styles.previewIsland,
                      orientation === "horizontal" && styles.previewIslandHorizontal,
                    ]}
                  >
                    {deriveRatingOrder(preferences.ratingDirection).map((level) => {
                      const option = recallOptions.find((current) => current.level === level);
                      if (!option) {
                        return null;
                      }
                      return (
                        <View key={level} style={styles.previewAction}>
                          <View
                            style={[
                              styles.previewMarker,
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
                  {audioBeforeIsland ? null : audioMarker}
                </View>
              </View>
            </View>
            <OptionGroup
              label="Recollection island"
              options={positions.map((value) => ({
                label: value.charAt(0).toUpperCase() + value.slice(1),
                symbol: getPositionSymbol(value),
                value,
              }))}
              selected={preferences.recollectionIslandPosition}
              onChange={onPositionChange}
            />
            <OptionGroup
              label="Rating direction"
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
              label="Audio position"
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
            <Pressable accessibilityRole="button" onPress={onClose} style={styles.doneButton}>
              <Text style={styles.doneLabel}>Done</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
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
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <SymbolView
                name={option.symbol}
                size={sizes.icon.small}
                tintColor={isSelected ? colors.textPrimary : colors.textSecondary}
              />
              <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    closeButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
    },
    doneButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.pill,
      justifyContent: "center",
      minHeight: 48,
    },
    doneLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.heavy,
    },
    handle: {
      alignSelf: "center",
      backgroundColor: colors.borderStrong,
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
    modalRoot: { flex: 1, justifyContent: "flex-end" },
    option: {
      alignItems: "center",
      borderColor: colors.controlBorder,
      borderRadius: sizes.radius.medium,
      borderWidth: sizes.border,
      flex: 1,
      justifyContent: "center",
      minHeight: 44,
      paddingHorizontal: sizes.spacing.small,
    },
    optionGroup: { gap: sizes.spacing.small },
    optionLabel: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
    },
    optionSelected: { backgroundColor: colors.controlSelected, borderColor: colors.actionPrimary },
    optionText: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      fontWeight: fontWeight.bold,
      textAlign: "center",
    },
    optionTextSelected: { color: colors.textPrimary },
    options: { flexDirection: "row", gap: sizes.spacing.small },
    preview: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.border,
      borderRadius: sizes.radius.card,
      borderWidth: sizes.border,
      height: 260,
      justifyContent: "center",
      overflow: "hidden",
      position: "relative",
    },

    previewAction: { alignItems: "center", gap: sizes.spacing.xSmall },
    previewCluster: {
      alignItems: "center",
      flexDirection: "column",
      gap: sizes.spacing.small,
    },
    previewClusterHorizontal: { flexDirection: "row" },
    previewStage: {
      alignItems: "center",
      alignSelf: "stretch",
      flex: 1,
      justifyContent: "center",
    },
    previewStageBottom: { justifyContent: "flex-end", paddingBottom: sizes.spacing.medium },
    previewStageLeft: { alignItems: "flex-start", paddingLeft: sizes.spacing.medium },
    previewStageRight: { alignItems: "flex-end", paddingRight: sizes.spacing.medium },
    previewIsland: {
      alignItems: "center",
      backgroundColor: colors.controlOverlay,
      borderColor: colors.controlBorder,
      borderRadius: sizes.radius.island,
      borderWidth: sizes.border,
      flexDirection: "column",
      gap: sizes.spacing.medium,
      padding: sizes.spacing.medium,
    },
    previewIslandHorizontal: { flexDirection: "row" },
    previewLabel: { color: colors.textMuted, fontSize: fontSize.micro },
    previewMarker: {
      alignItems: "center",
      borderRadius: sizes.radius.pill,
      height: 28,
      justifyContent: "center",
      width: 28,
    },
    scrim: {
      backgroundColor: colors.scrim,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheet: {
      alignSelf: "center",
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      maxHeight: "96%",
      minHeight: "88%",
      width: "100%",
    },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
    audioMarker: {
      alignItems: "center",
      backgroundColor: colors.controlSelected,
      borderRadius: sizes.radius.pill,
      height: 34,
      justifyContent: "center",
      width: 34,
    },
  });
}
