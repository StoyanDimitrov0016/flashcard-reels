import { SymbolView } from "expo-symbols";
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import type { AudioReference } from "@/features/audio/domain/audio-reference";
import { AnswerAudioPlayer } from "@/features/audio/presentation/components/answer-audio-player";
import type { Flashcard } from "@/features/flashcards/domain/flashcard.model";
import { explainLearnerProfile } from "@/features/learner-profile/domain/learner-profile-explanation";
import type { LearnerProfile } from "@/features/learner-profile/domain/learner-profile.model";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type FlashcardProgressSheetProps = Readonly<{
  accentColor: string;
  audioSource: AudioReference;
  card: Flashcard | null;
  onClose: () => void;
  profile: LearnerProfile | null;
}>;

export function FlashcardProgressSheet({
  accentColor,
  audioSource,
  card,
  onClose,
  profile,
}: FlashcardProgressSheetProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const explanation = explainLearnerProfile(profile);
  const reviewed = (profile?.reviewCount ?? 0) > 0;
  const recallPercentage =
    explanation.averageRecallScore === null
      ? 0
      : Math.round((explanation.averageRecallScore / 3) * 100);

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={card !== null}>
      <View style={styles.root}>
        <Pressable
          accessibilityLabel="Close card progress"
          onPress={onClose}
          style={styles.scrim}
        />
        <View accessibilityViewIsModal style={styles.sheet}>
          <View style={styles.header}>
            <Text accessibilityRole="header" style={styles.title}>
              Card {card ? card.order + 1 : ""}
            </Text>
            <Pressable
              accessibilityLabel="Close card progress"
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
          {card ? (
            <ScrollView contentContainerStyle={styles.content}>
              <Text style={styles.question}>{card.question}</Text>
              <View style={styles.answerRow}>
                <Text style={styles.answer}>{card.answer}</Text>
                {audioSource ? <AnswerAudioPlayer isActive source={audioSource} /> : null}
              </View>
              <View style={styles.progressHeading}>
                <Text style={[styles.status, { color: reviewed ? accentColor : colors.textMuted }]}>
                  {reviewed ? `${profile?.reviewCount ?? 0} reviews` : "New"}
                </Text>
                <Text style={styles.caption}>
                  {reviewed
                    ? `${recallPercentage}% recall · ${explanation.historyBand}`
                    : "Not reviewed yet"}
                </Text>
              </View>
              <View style={styles.track}>
                <View
                  style={[
                    styles.fill,
                    { backgroundColor: accentColor, width: `${recallPercentage}%` },
                  ]}
                />
              </View>
              <View style={styles.ratings}>
                <ProgressFact
                  color={colors.danger}
                  label="Again"
                  value={profile?.againCount ?? 0}
                />
                <ProgressFact color={colors.warning} label="Hard" value={profile?.hardCount ?? 0} />
                <ProgressFact color={colors.success} label="Good" value={profile?.goodCount ?? 0} />
                <ProgressFact
                  color={colors.recallEasy}
                  label="Easy"
                  value={profile?.easyCount ?? 0}
                />
              </View>
              <Text style={styles.caption}>
                {profile?.lastReviewedAt
                  ? `Last reviewed ${new Date(profile.lastReviewedAt).toLocaleDateString()}`
                  : "No review history"}
              </Text>
            </ScrollView>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

type ProgressFactProps = Readonly<{ color: string; label: string; value: number }>;

function ProgressFact({ color, label, value }: ProgressFactProps) {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.fact}>
      <Text style={[styles.value, { color }]}>{value}</Text>
      <Text style={styles.caption}>{label}</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    answer: {
      color: colors.textSecondary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      lineHeight: lineHeight.bodyLarge,
    },
    answerRow: { alignItems: "flex-start", flexDirection: "row", gap: sizes.spacing.section },
    caption: { color: colors.textMuted, fontSize: fontSize.caption },
    content: {
      gap: sizes.spacing.section,
      padding: sizes.spacing.content,
      paddingBottom: sizes.spacing.spacious,
    },
    fact: { alignItems: "center", flex: 1, gap: sizes.spacing.xSmall },
    fill: { borderRadius: sizes.radius.pill, height: "100%" },
    header: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
      padding: sizes.spacing.content,
    },
    iconButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    progressHeading: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    question: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.title3,
    },
    ratings: { flexDirection: "row" },
    root: { flex: 1, justifyContent: "flex-end" },
    scrim: {
      backgroundColor: colors.scrim,
      bottom: 0,
      left: 0,
      position: "absolute",
      right: 0,
      top: 0,
    },
    sheet: {
      backgroundColor: colors.surface,
      borderColor: colors.borderStrong,
      borderTopLeftRadius: sizes.radius.panel,
      borderTopRightRadius: sizes.radius.panel,
      borderWidth: sizes.border,
      maxHeight: "82%",
    },
    status: { fontSize: fontSize.caption, fontWeight: fontWeight.bold },
    title: { color: colors.textPrimary, fontSize: fontSize.title2, fontWeight: fontWeight.heavy },
    track: {
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.pill,
      height: 5,
      overflow: "hidden",
    },
    value: { fontSize: fontSize.body, fontWeight: fontWeight.heavy },
  });
}
