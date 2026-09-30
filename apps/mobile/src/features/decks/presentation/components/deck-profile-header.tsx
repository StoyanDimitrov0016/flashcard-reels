import { Pressable, StyleSheet, Text, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, textStyles } from "@/shared/presentation/typography";

type DeckProfileHeaderProps = Readonly<{
  deck: Deck;
  accentColor: string;
  cardCount: number;
  reviewedCount: number;
  lessonCount: number;
  onStudy: () => void;
}>;

/** The top of a deck's page: who it is, how far the learner is, and the way into its feed. */
export function DeckProfileHeader({
  accentColor,
  cardCount,
  deck,
  lessonCount,
  onStudy,
  reviewedCount,
}: DeckProfileHeaderProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const lessonLabel = lessonCount === 1 ? "1 lesson" : `${lessonCount} lessons`;

  return (
    <View style={styles.header}>
      <View style={styles.identity}>
        <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" />
        <View style={styles.copy}>
          <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
            {deck.title}
          </Text>
          <Text style={styles.stat}>
            {reviewedCount} of {cardCount} cards reviewed
          </Text>
          {lessonCount > 0 && <Text style={styles.stat}>{lessonLabel}</Text>}
        </View>
      </View>
      <Pressable
        accessibilityHint="Opens Focus with only this deck's cards"
        accessibilityRole="button"
        onPress={onStudy}
        style={({ pressed }) => [styles.studyButton, pressed && styles.studyButtonPressed]}
      >
        <Text style={styles.studyLabel}>Study this deck</Text>
      </Pressable>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    copy: { flex: 1, gap: sizes.spacing.xSmall },
    header: {
      gap: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: sizes.spacing.small,
    },
    identity: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium },
    stat: { color: colors.textSecondary, fontSize: fontSize.footnote },
    studyButton: {
      alignItems: "center",
      backgroundColor: colors.actionPrimary,
      borderRadius: sizes.radius.control,
      justifyContent: "center",
      minHeight: sizes.control.standard,
      paddingHorizontal: sizes.spacing.content,
    },
    studyButtonPressed: { opacity: 0.72 },
    studyLabel: {
      color: colors.actionPrimaryText,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    title: { color: colors.textPrimary, ...textStyles.screenTitle },
  });
}
