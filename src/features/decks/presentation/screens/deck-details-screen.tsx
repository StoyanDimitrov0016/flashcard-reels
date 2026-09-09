import { useLocalSearchParams, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckDetails } from "@/features/decks/presentation/hooks/use-deck-details";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { explainLearnerProfile } from "@/features/learner-profile/domain/adaptive-shuffle-policy";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight, textStyles } from "@/shared/presentation/typography";

type CardRowProps = Readonly<{
  accentColor: string;
  card: Flashcard;
  profile: LearnerProfile | null;
}>;

function CardRow({ accentColor, card, profile }: CardRowProps) {
  const [expanded, setExpanded] = useState(false);
  const explanation = explainLearnerProfile(profile);
  const reviewed = (profile?.reviewCount ?? 0) > 0;
  const progress =
    explanation.averageRecallScore === null
      ? 0
      : Math.round((explanation.averageRecallScore / 3) * 100);

  return (
    <Pressable
      accessibilityHint="Shows or hides the answer"
      accessibilityRole="button"
      accessibilityState={{ expanded }}
      onPress={() => setExpanded((current) => !current)}
      style={styles.cardRow}
    >
      <Text style={styles.position}>{card.order + 1}</Text>
      <View style={styles.cardCopy}>
        <Text style={styles.question}>{card.question}</Text>
        {expanded ? (
          <View style={styles.expandedContent}>
            <Text style={styles.answer}>{card.answer}</Text>
            <View style={styles.progressHeading}>
              <Text style={[styles.status, { color: reviewed ? accentColor : palette.textMuted }]}>
                {reviewed ? `${profile?.reviewCount ?? 0} reviews` : "New"}
              </Text>
              <Text style={styles.progressCaption}>
                {reviewed
                  ? `${progress}% recall · ${explanation.priority} priority`
                  : "Not reviewed yet"}
              </Text>
            </View>
            <View style={styles.cardProgressTrack}>
              <View
                style={[
                  styles.cardProgressFill,
                  { backgroundColor: accentColor, width: `${progress}%` },
                ]}
              />
            </View>
            <View style={styles.ratingRow}>
              <RatingFact color={palette.danger} label="Again" value={profile?.againCount ?? 0} />
              <RatingFact color={palette.warning} label="Hard" value={profile?.hardCount ?? 0} />
              <RatingFact color={palette.success} label="Good" value={profile?.goodCount ?? 0} />
              <RatingFact color={palette.recallEasy} label="Easy" value={profile?.easyCount ?? 0} />
            </View>
            <Text style={styles.lastReviewed}>
              {profile?.lastReviewedAt
                ? `Last reviewed ${new Date(profile.lastReviewedAt).toLocaleDateString()}`
                : "No review history"}
            </Text>
          </View>
        ) : null}
      </View>
      <SymbolView
        name={{
          android: expanded ? "expand_less" : "chevron_right",
          ios: expanded ? "chevron.up" : "chevron.right",
          web: expanded ? "expand_less" : "chevron_right",
        }}
        size={sizes.icon.small}
        tintColor={palette.textMuted}
      />
    </Pressable>
  );
}

type RatingFactProps = Readonly<{ color: string; label: string; value: number }>;

function RatingFact({ color, label, value }: RatingFactProps) {
  return (
    <View style={styles.ratingFact}>
      <Text style={[styles.ratingValue, { color }]}>{value}</Text>
      <Text style={styles.ratingLabel}>{label}</Text>
    </View>
  );
}

function EmptyCardList() {
  return <Text style={styles.empty}>This deck has no cards.</Text>;
}

export default function DeckDetailsScreen() {
  const router = useRouter();
  const { deckId } = useLocalSearchParams<{ deckId: string }>();
  const { appearance, cards, deck, loading, profiles } = useDeckDetails(deckId);
  const accentColor = appearance?.accentColor ?? palette.actionPrimary;
  const renderCard: ListRenderItem<Flashcard> = ({ item }) => (
    <CardRow accentColor={accentColor} card={item} profile={profiles.get(item.id) ?? null} />
  );

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.navigationRow}>
        <Pressable
          accessibilityLabel="Back to Library"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <SymbolView
            name={{ android: "arrow_back", ios: "chevron.left", web: "arrow_back" }}
            size={sizes.icon.medium}
            tintColor={palette.textPrimary}
          />
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>
      <View style={styles.header}>
        {deck ? <DeckCover accentColor={accentColor} asset={deck.coverAsset} size="large" /> : null}
        <View style={styles.headingCopy}>
          <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
            {deck?.title ?? "Deck cards"}
          </Text>
          <Text style={styles.count}>{loading ? "Loading cards…" : `${cards.length} cards`}</Text>
          {deck ? (
            <Text numberOfLines={2} style={styles.description}>
              {deck.description}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={styles.tabs}>
        <View style={[styles.activeTab, { borderBottomColor: accentColor }]}>
          <Text style={[styles.activeTabLabel, { color: accentColor }]}>Cards</Text>
        </View>
      </View>
      {loading ? (
        <LoadingState accessibilityLabel="Loading deck cards" />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={cards}
          keyExtractor={(card) => card.id}
          ListEmptyComponent={EmptyCardList}
          initialNumToRender={12}
          maxToRenderPerBatch={8}
          removeClippedSubviews
          renderItem={renderCard}
          updateCellsBatchingPeriod={32}
          windowSize={7}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  answer: {
    color: palette.textSecondary,
    fontSize: fontSize.bodyLarge,
    lineHeight: lineHeight.bodyLarge,
  },
  backButton: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.xSmall,
    height: "100%",
    paddingHorizontal: sizes.spacing.xSmall,
  },
  backLabel: { color: palette.textPrimary, fontSize: fontSize.body },
  cardCopy: { flex: 1, gap: sizes.spacing.medium },
  cardProgressFill: { borderRadius: sizes.radius.pill, height: "100%" },
  cardProgressTrack: {
    backgroundColor: palette.borderStrong,
    borderRadius: sizes.radius.pill,
    height: 5,
    overflow: "hidden",
  },
  cardRow: {
    alignItems: "flex-start",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: sizes.radius.row,
    borderWidth: sizes.border,
    flexDirection: "row",
    gap: sizes.spacing.medium,
    paddingHorizontal: sizes.spacing.xLarge,
    paddingVertical: sizes.spacing.xLarge,
  },
  count: { color: palette.textMuted, fontSize: fontSize.footnote },
  description: {
    color: palette.textSecondary,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.footnote,
    marginTop: sizes.spacing.xSmall,
  },
  empty: { color: palette.textSecondary, padding: sizes.spacing.wide, textAlign: "center" },
  expandedContent: {
    borderTopColor: palette.border,
    borderTopWidth: sizes.border,
    gap: sizes.spacing.medium,
    marginTop: sizes.spacing.xSmall,
    paddingTop: sizes.spacing.xLarge,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.medium,
    paddingBottom: sizes.spacing.section,
    paddingHorizontal: sizes.spacing.content,
    paddingTop: sizes.spacing.small,
  },
  headingCopy: { flex: 1 },
  list: { gap: sizes.spacing.medium, padding: sizes.spacing.content },
  navigationRow: {
    alignItems: "center",
    borderBottomColor: palette.border,
    borderBottomWidth: sizes.border,
    flexDirection: "row",
    height: 56,
    paddingHorizontal: sizes.spacing.xLarge,
  },
  position: {
    color: palette.textMuted,
    fontSize: fontSize.footnote,
    fontVariant: ["tabular-nums"],
    fontWeight: fontWeight.heavy,
    textAlign: "center",
    width: 22,
  },
  progressHeading: {
    alignItems: "center",
    flexDirection: "row",
    gap: sizes.spacing.medium,
    justifyContent: "space-between",
  },
  progressCaption: {
    color: palette.textMuted,
    flex: 1,
    fontSize: fontSize.caption,
    textAlign: "right",
  },
  question: {
    color: palette.textPrimary,
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    lineHeight: lineHeight.subhead,
  },
  ratingFact: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
  ratingLabel: { color: palette.textMuted, fontSize: fontSize.caption },
  ratingRow: { flexDirection: "row", gap: sizes.spacing.small },
  ratingValue: { fontSize: fontSize.body, fontWeight: fontWeight.heavy },
  screen: { backgroundColor: palette.background, flex: 1 },
  tabs: {
    borderBottomColor: palette.border,
    borderBottomWidth: sizes.border,
    paddingHorizontal: sizes.spacing.content,
  },
  activeTab: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderBottomWidth: 2,
    paddingHorizontal: sizes.spacing.xLarge,
    paddingVertical: sizes.spacing.medium,
  },
  activeTabLabel: { fontSize: fontSize.footnote, fontWeight: fontWeight.bold },
  lastReviewed: { color: palette.textMuted, fontSize: fontSize.caption },
  status: { flexShrink: 0, fontSize: fontSize.caption, fontWeight: fontWeight.bold },
  title: { color: palette.textPrimary, ...textStyles.screenTitle },
});
