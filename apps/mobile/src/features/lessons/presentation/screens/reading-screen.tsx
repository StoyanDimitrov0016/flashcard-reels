import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckReadingList, LessonSummary } from "@/features/lessons/domain/lesson.model";

import { useDeckAppearances } from "@/features/decks/presentation/controllers/use-deck-appearances";
import { resolveDeckAppearance } from "@/features/decks/presentation/deck-appearance-presets";
import { useReadingLists } from "@/features/lessons/presentation/controllers/use-reading-lists";
import { getLessonHref } from "@/features/lessons/presentation/lesson-href";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, letterSpacing, lineHeight } from "@/shared/presentation/typography";

export default function ReadingScreen() {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const { loading, readingLists } = useReadingLists();
  const { appearances } = useDeckAppearances(readingLists.map((list) => list.deckId));

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
        <ScrollView contentContainerStyle={styles.content}>
          {readingLists.map((readingList) => {
            const appearance = appearances.get(readingList.deckId);
            const accent = appearance
              ? resolveDeckAppearance(appearance.presetId, resolvedScheme).accent
              : colors.textTertiary;
            return (
              <DeckLessons
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

type DeckLessonsProps = Readonly<{
  accent: string;
  colors: AppColors;
  readingList: DeckReadingList;
}>;

function DeckLessons({ accent, colors, readingList }: DeckLessonsProps) {
  const styles = createStyles(colors);
  const lessonCount = readingList.lessons.length;

  return (
    <View style={styles.deckSection}>
      <View style={styles.deckHeading}>
        <View style={[styles.deckAccent, { backgroundColor: accent }]} />
        <Text accessibilityRole="header" numberOfLines={1} style={styles.deckTitle}>
          {readingList.deckTitle}
        </Text>
        <Text style={styles.lessonCount}>
          {lessonCount} {lessonCount === 1 ? "lesson" : "lessons"}
        </Text>
      </View>
      <View style={styles.lessonGroup}>
        {readingList.lessons.map((lesson, index) => (
          <LessonRow colors={colors} isFirst={index === 0} key={lesson.id} lesson={lesson} />
        ))}
      </View>
    </View>
  );
}

type LessonRowProps = Readonly<{
  colors: AppColors;
  isFirst: boolean;
  lesson: LessonSummary;
}>;

function LessonRow({ colors, isFirst, lesson }: LessonRowProps) {
  const styles = createStyles(colors);
  const router = useRouter();

  return (
    <Pressable
      accessibilityHint="Opens the lesson"
      accessibilityLabel={`Lesson ${lesson.order + 1}: ${lesson.title}`}
      accessibilityRole="button"
      onPress={() => router.push(getLessonHref(lesson.id))}
      style={({ pressed }) => [
        styles.lessonRow,
        !isFirst && styles.lessonDivider,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.lessonPosition}>{lesson.order + 1}</Text>
      <Text numberOfLines={2} style={styles.lessonTitle}>
        {lesson.title}
      </Text>
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
    </Pressable>
  );
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    content: {
      gap: sizes.spacing.wide,
      paddingBottom: sizes.spacing.wide,
      paddingHorizontal: screenLayout.horizontalPadding,
      paddingTop: screenLayout.contentTopGap,
    },
    deckAccent: { borderRadius: sizes.radius.small, height: 14, width: 3 },
    deckHeading: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xSmall,
    },
    deckSection: { gap: sizes.spacing.large },
    deckTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.callout,
      fontWeight: fontWeight.bold,
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
    lessonDivider: { borderTopColor: colors.borderSubtle, borderTopWidth: sizes.border },
    lessonGroup: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      overflow: "hidden",
    },
    lessonPosition: {
      color: colors.textTertiary,
      fontSize: fontSize.footnote,
      fontVariant: ["tabular-nums"],
      fontWeight: fontWeight.heavy,
      textAlign: "center",
      width: 22,
    },
    lessonRow: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.large,
      minHeight: sizes.control.standard + sizes.spacing.medium,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.xLarge,
    },
    lessonTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.bodyLarge,
      fontWeight: fontWeight.semibold,
      lineHeight: lineHeight.bodyLarge,
    },
    pressed: { backgroundColor: colors.surfaceHover },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    title: { color: colors.textPrimary, fontSize: fontSize.title1, fontWeight: fontWeight.heavy },
  });
}
