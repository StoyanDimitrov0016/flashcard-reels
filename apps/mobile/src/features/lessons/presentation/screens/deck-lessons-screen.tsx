import { useRouter } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useDeckRouteId } from "@/features/decks/presentation/hooks/use-deck-route-id";
import { LessonSearchResults } from "@/features/lessons/presentation/components/lesson-search-results";
import { useReadingLists } from "@/features/lessons/presentation/controllers/use-reading-lists";
import { getLessonHref } from "@/features/lessons/presentation/lesson-href";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { LoadingState } from "@/shared/presentation/components/loading-state";
import { SearchField } from "@/shared/presentation/components/search-field";
import { SubScreenHeader } from "@/shared/presentation/components/sub-screen-header";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme } from "@/shared/presentation/theme";

/** One deck's lessons, opened from its card on the Reading tab. */
export default function DeckLessonsScreen() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const deckId = useDeckRouteId();
  const { loading, readingLists } = useReadingLists();
  const readingList = readingLists.find((list) => list.deckId === deckId);
  const [query, setQuery] = useState("");

  return (
    <SafeAreaView
      edges={["top", "right", "left"]}
      style={[styles.screen, { backgroundColor: colors.canvas }]}
    >
      <SubScreenHeader
        backLabel="Back to Reading"
        onBack={() => router.back()}
        title={readingList?.deckTitle}
      />
      {loading && <LoadingState />}
      {!loading && !readingList && (
        <View style={styles.missing}>
          <EmptyState
            action={{ label: "Back to Reading", onPress: () => router.back() }}
            icon={{ android: "menu_book", ios: "book", web: "menu_book" }}
            message="Its deck was removed or updated without lessons."
            title="These lessons are no longer available"
          />
        </View>
      )}
      {!loading && readingList && (
        <>
          <View style={styles.search}>
            <SearchField
              accessibilityLabel="Search lessons in deck"
              clearLabel="Clear lesson search"
              onChangeText={setQuery}
              placeholder="Search lessons…"
              value={query}
            />
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <LessonSearchResults
              lessons={readingList.lessons}
              onOpen={(lesson) => router.push(getLessonHref(lesson.id))}
              query={query}
            />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: sizes.spacing.wide * 2,
    paddingHorizontal: screenLayout.horizontalPadding,
    paddingTop: sizes.spacing.section,
  },
  missing: { flex: 1, justifyContent: "center" },
  search: {
    paddingHorizontal: screenLayout.horizontalPadding,
    paddingTop: screenLayout.contentTopGap,
  },
  screen: { flex: 1 },
});
