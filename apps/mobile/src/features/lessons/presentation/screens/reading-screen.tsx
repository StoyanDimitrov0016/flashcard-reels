import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckReadingList } from "@/features/lessons/domain/lesson.model";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { useDeckMetadata } from "@/features/decks/presentation/controllers/use-deck-metadata";
import { resolveDeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { useReadingLists } from "@/features/lessons/presentation/controllers/use-reading-lists";
import { getDeckLessonsHref } from "@/features/lessons/presentation/lesson-href";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { useTabBarInset } from "@/shared/presentation/context/tab-bar-inset-context";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

export default function ReadingScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const tabBarInset = useTabBarInset();
  const { loading, readingLists } = useReadingLists();
  const { themeSelections } = useDeckMetadata(
    readingLists.map((list) => list.deckId),
    false
  );

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Text accessibilityRole="header" style={styles.title}>
          Reading
        </Text>
      </ScreenHeader>
      {loading && <LoadingState />}
      {!loading && readingLists.length === 0 && <EmptyReadingList colors={colors} />}
      {!loading && readingLists.length > 0 && (
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: sizes.spacing.wide + tabBarInset },
          ]}
        >
          {readingLists.map((readingList) => {
            const themeSelection = themeSelections.get(readingList.deckId);
            const accent = themeSelection
              ? resolveDeckTheme(themeSelection.theme, resolvedScheme).accent
              : colors.textTertiary;
            return (
              <DeckLessonsCard
                accent={accent}
                colors={colors}
                key={readingList.deckId}
                readingList={readingList}
              />
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// Enough titles to show what the deck teaches without turning the card into the list.
const TEASER_LESSON_COUNT = 3;

type DeckLessonsCardProps = Readonly<{
  accent: string;
  colors: AppColors;
  readingList: DeckReadingList;
}>;

/** A deck's lessons at a glance; the whole list opens on its own screen. */
function DeckLessonsCard({ accent, colors, readingList }: DeckLessonsCardProps) {
  const styles = createStyles(colors);
  const router = useRouter();
  const lessonCount = readingList.lessons.length;
  const teaser = readingList.lessons.slice(0, TEASER_LESSON_COUNT);
  const remaining = lessonCount - teaser.length;

  return (
    <Pressable
      accessibilityHint="Shows this deck's lessons"
      accessibilityLabel={`${readingList.deckTitle}, ${formatLessonCount(lessonCount)}`}
      accessibilityRole="button"
      onPress={() => router.push(getDeckLessonsHref(readingList.deckId))}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardHeading}>
        <DeckCover accentColor={accent} asset={readingList.deckCoverAsset} />
        <View style={styles.cardTitleGroup}>
          <Text numberOfLines={2} style={styles.deckTitle}>
            {readingList.deckTitle}
          </Text>
          <Text style={styles.lessonCount}>{formatLessonCount(lessonCount)}</Text>
        </View>
        <SymbolView
          name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
          size={sizes.icon.small}
          tintColor={colors.textTertiary}
        />
      </View>
      <View style={styles.teaser}>
        {teaser.map((lesson) => (
          <View key={lesson.id} style={styles.teaserRow}>
            <Text style={styles.teaserPosition}>{lesson.order + 1}</Text>
            <Text numberOfLines={1} style={styles.teaserTitle}>
              {lesson.title}
            </Text>
          </View>
        ))}
        {remaining > 0 && <Text style={styles.teaserMore}>+{remaining} more</Text>}
      </View>
    </Pressable>
  );
}

function formatLessonCount(count: number): string {
  return `${count} ${count === 1 ? "lesson" : "lessons"}`;
}

type EmptyReadingListProps = Readonly<{ colors: AppColors }>;

function EmptyReadingList({ colors }: EmptyReadingListProps) {
  const styles = createStyles(colors);

  return (
    <View style={styles.empty}>
      <SymbolView
        name={{ android: "menu_book", ios: "book", web: "menu_book" }}
        size={sizes.icon.large}
        tintColor={colors.textTertiary}
      />
      <Text accessibilityRole="header" style={styles.emptyTitle}>
        No lessons yet
      </Text>
      <Text style={styles.emptyMessage}>
        Lessons come with decks. When a deck you install includes lessons, they appear here to read
        at your own pace.
      </Text>
    </View>
  );
}

/** The column that holds a teaser's lesson number; following rows align past it. */
const TEASER_POSITION_WIDTH = 22;

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.card,
      borderWidth: sizes.border,
      gap: sizes.spacing.xLarge,
      padding: sizes.spacing.xLarge,
    },
    cardHeading: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.large },
    cardTitleGroup: { flex: 1, gap: sizes.spacing.xSmall },
    content: {
      gap: sizes.spacing.large,
      paddingBottom: sizes.spacing.wide,
      paddingHorizontal: screenLayout.horizontalPadding,
      paddingTop: screenLayout.contentTopGap,
    },
    deckTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.bold,
      lineHeight: lineHeight.bodyLarge,
    },
    empty: {
      alignItems: "center",
      flex: 1,
      gap: sizes.spacing.xLarge,
      justifyContent: "center",
      paddingHorizontal: sizes.spacing.wide,
    },
    emptyMessage: {
      color: colors.textSecondary,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
      maxWidth: 320,
      textAlign: "center",
    },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title3,
      fontWeight: fontWeight.bold,
    },
    lessonCount: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
      letterSpacing: letterSpacing.wide,
    },
    pressed: { backgroundColor: colors.surfaceHover },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    teaser: {
      borderTopColor: colors.borderSubtle,
      borderTopWidth: sizes.border,
      gap: sizes.spacing.medium,
      paddingTop: sizes.spacing.large,
    },
    teaserMore: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontWeight: fontWeight.semibold,
      paddingLeft: TEASER_POSITION_WIDTH + sizes.spacing.medium,
    },
    teaserPosition: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      textAlign: "center",
      width: TEASER_POSITION_WIDTH,
    },
    teaserRow: { alignItems: "center", flexDirection: "row", gap: sizes.spacing.medium },
    teaserTitle: {
      color: colors.textSecondary,
      flex: 1,
      fontSize: fontSize.body,
      lineHeight: lineHeight.body,
    },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
  });
}
