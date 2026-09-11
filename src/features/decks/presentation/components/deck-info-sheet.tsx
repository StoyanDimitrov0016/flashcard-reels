import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { Deck } from "@/features/decks/domain/deck.model";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { explainLearnerProfile } from "@/features/learner-profile/domain/learner-profile-explanation";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";
import { AppBottomSheet } from "@/shared/presentation/components/app-bottom-sheet";

type DeckInfoSheetProps = Readonly<{
  cards: readonly Flashcard[];
  deck: Deck | null;
  onClose: () => void;
  profiles: ReadonlyMap<string, LearnerProfile>;
  visible: boolean;
}>;

export function DeckInfoSheet({ cards, deck, onClose, profiles, visible }: DeckInfoSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const reviewedProfiles = cards.flatMap((card) => {
    const profile = profiles.get(card.id);
    return profile && profile.reviewCount > 0 ? [profile] : [];
  });
  const totalReviews = reviewedProfiles.reduce((total, profile) => total + profile.reviewCount, 0);
  const recallScores = reviewedProfiles.flatMap((profile) => {
    const score = explainLearnerProfile(profile).averageRecallScore;
    return score === null ? [] : [score];
  });
  const averageRecall =
    recallScores.length === 0
      ? null
      : Math.round(
          (recallScores.reduce((total, score) => total + score, 0) / recallScores.length / 3) * 100
        );

  return (
    <AppBottomSheet onClose={onClose} visible={visible}>
      <View accessibilityViewIsModal style={styles.sheet}>
        <View style={styles.header}>
          <Text accessibilityRole="header" style={styles.title}>
            {deck?.title ?? "Deck information"}
          </Text>
          <Pressable
            accessibilityLabel="Close deck information"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ android: "close", ios: "xmark", web: "close" }}
              size={sizes.icon.medium}
              tintColor={colors.textPrimary}
            />
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.metrics}>
            <Metric label="Cards" value={cards.length} />
            <Metric label="Reviewed" value={reviewedProfiles.length} />
            <Metric label="New" value={cards.length - reviewedProfiles.length} />
            <Metric label="Reviews" value={totalReviews} />
          </View>
          <Text style={styles.recall}>
            {averageRecall === null ? "No recall data yet" : `${averageRecall}% average recall`}
          </Text>
          {deck ? <Text style={styles.description}>{deck.description}</Text> : null}
        </ScrollView>
      </View>
    </AppBottomSheet>
  );
}

type MetricProps = Readonly<{ label: string; value: number }>;

function Metric({ label, value }: MetricProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    header: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      justifyContent: "space-between",
      padding: sizes.spacing.content,
    },
    iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    metric: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    metricLabel: { color: colors.textTertiary, fontSize: fontSize.caption },
    metrics: { flexDirection: "row" },
    metricValue: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
    },
    recall: { color: colors.textPrimary, fontSize: fontSize.body, fontWeight: fontWeight.bold },
    sheet: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderStrong,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      maxHeight: "70%",
    },
    title: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.heavy,
    },
  });
}
