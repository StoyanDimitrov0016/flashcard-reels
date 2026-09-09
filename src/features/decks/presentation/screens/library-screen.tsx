import { useState } from "react";
import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ListRenderItem,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";
import type { DeckAppearancePreset } from "@/features/decks/presentation/deck-appearance-presets";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { DeckAppearanceSheet } from "@/features/decks/presentation/components/deck-appearance-sheet";
import { useDeckCatalog } from "@/features/decks/presentation/hooks/use-deck-catalog";
import { useSaveDeckAppearance } from "@/features/decks/presentation/hooks/use-save-deck-appearance";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { palette } from "@/shared/presentation/palette";
import { sizes } from "@/shared/presentation/sizes";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type CatalogEntry = ReturnType<typeof useDeckCatalog>["entries"][number];
type DeckRowProps = Readonly<{
  entry: CatalogEntry;
  onAppearance: () => void;
  onFocus: () => void;
  onViewCards: () => void;
}>;

function DeckRow({ entry, onAppearance, onFocus, onViewCards }: DeckRowProps) {
  const { appearance, cardCount, deck } = entry;

  return (
    <View style={[styles.deck, { backgroundColor: appearance.backgroundColor }]}>
      <Pressable
        accessibilityHint="Opens the Focus tab in Shuffle mode"
        accessibilityLabel={`Focus on ${deck.title}`}
        accessibilityRole="button"
        onPress={onFocus}
        style={styles.deckBody}
      >
        <View style={[styles.accent, { backgroundColor: appearance.accentColor }]} />
        <View style={styles.deckCopy}>
          <Text style={styles.deckTitle}>{deck.title}</Text>
          <Text style={styles.description}>{deck.description}</Text>
          <Text style={[styles.cardCount, { color: appearance.accentColor }]}>
            {cardCount} cards
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Change ${deck.title} appearance`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onAppearance}
          style={styles.iconButton}
        >
          <SymbolView
            name={{ android: "palette", ios: "paintpalette.fill", web: "palette" }}
            size={sizes.icon.medium}
            tintColor={palette.textPrimary}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={`View cards in ${deck.title}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onViewCards}
          style={styles.iconButton}
        >
          <SymbolView
            name={{ android: "view_list", ios: "list.bullet.rectangle", web: "view_list" }}
            size={sizes.icon.medium}
            tintColor={palette.textPrimary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function LibrarySkeleton() {
  return (
    <View accessibilityLabel="Loading deck library" style={styles.skeletonList}>
      {["first", "second", "third"].map((key) => (
        <View key={key} style={[styles.deck, styles.skeletonDeck]}>
          <View style={styles.skeletonAccent} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonTitle} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonShortLine} />
          </View>
        </View>
      ))}
    </View>
  );
}

function EmptyLibrarySearch() {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No decks found</Text>
      <Text style={styles.emptyCopy}>Try another title or description.</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const router = useRouter();
  const openFocusedFeed = useOpenFocusedFeed();
  const { entries, loading } = useDeckCatalog();
  const { clearSaveError, pendingPreset, saveError, savePreset } = useSaveDeckAppearance();
  const [query, setQuery] = useState("");
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [appearanceOverrides, setAppearanceOverrides] = useState(
    () => new Map<string, DeckAppearance>()
  );
  const visibleEntries = entries
    .filter(({ deck }) => matchesDeckSearch(deck, query))
    .map((entry) => ({
      ...entry,
      appearance: appearanceOverrides.get(entry.deck.id) ?? entry.appearance,
    }));
  const sheetAppearance = selectedEntry
    ? (appearanceOverrides.get(selectedEntry.deck.id) ?? selectedEntry.appearance)
    : null;

  const selectPreset = (preset: DeckAppearancePreset) => {
    if (!selectedEntry) {
      return;
    }
    const deckId = selectedEntry.deck.id;
    void savePreset(deckId, preset).then((appearance) => {
      if (appearance) {
        setAppearanceOverrides((current) => new Map(current).set(deckId, appearance));
        setSelectedEntry(null);
      }
    });
  };

  const renderItem: ListRenderItem<CatalogEntry> = ({ item }) => (
    <DeckRow
      entry={item}
      onAppearance={() => {
        clearSaveError();
        setSelectedEntry(item);
      }}
      onFocus={() => openFocusedFeed(item.deck.id)}
      onViewCards={() =>
        router.push({ pathname: "/decks/[deckId]", params: { deckId: item.deck.id } })
      }
    />
  );

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.searchShell}>
          <SymbolView
            name={{ android: "search", ios: "magnifyingglass", web: "search" }}
            size={sizes.icon.small}
            tintColor={palette.textMuted}
          />
          <TextInput
            accessibilityLabel="Search deck library"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search decks"
            placeholderTextColor={palette.textMuted}
            style={styles.searchInput}
            value={query}
          />
          {query ? (
            <Pressable
              accessibilityLabel="Clear deck search"
              accessibilityRole="button"
              onPress={() => setQuery("")}
              style={styles.clearButton}
            >
              <SymbolView
                name={{ android: "cancel", ios: "xmark.circle.fill", web: "cancel" }}
                size={sizes.icon.small}
                tintColor={palette.textMuted}
              />
            </Pressable>
          ) : null}
        </View>
      </View>
      {loading ? (
        <LibrarySkeleton />
      ) : (
        <FlatList
          contentContainerStyle={styles.list}
          data={visibleEntries}
          keyboardShouldPersistTaps="handled"
          keyExtractor={({ deck }) => deck.id}
          ListEmptyComponent={EmptyLibrarySearch}
          renderItem={renderItem}
        />
      )}
      <DeckAppearanceSheet
        appearance={sheetAppearance}
        error={saveError}
        isPresented={selectedEntry !== null}
        onDismiss={() => {
          if (!pendingPreset) {
            setSelectedEntry(null);
          }
        }}
        onSelect={selectPreset}
        pendingPreset={pendingPreset}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  accent: { borderRadius: sizes.radius.medium, height: 72, width: 6 },
  actions: { gap: sizes.spacing.medium, paddingRight: sizes.spacing.xLarge },
  cardCount: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.heavy,
    textTransform: "uppercase",
  },
  clearButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  deck: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderRadius: sizes.radius.card,
    flexDirection: "row",
    minHeight: 132,
    overflow: "hidden",
  },
  deckBody: {
    alignItems: "center",
    flex: 1,
    flexDirection: "row",
    gap: sizes.spacing.section,
    minHeight: 132,
    padding: sizes.spacing.content,
  },
  deckCopy: { flex: 1, gap: sizes.spacing.small },
  deckTitle: {
    color: palette.textPrimary,
    fontSize: fontSize.deckTitle,
    fontWeight: fontWeight.bold,
  },
  description: {
    color: palette.textSecondary,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
  },
  empty: { alignItems: "center", gap: sizes.spacing.medium, padding: sizes.spacing.wide },
  emptyCopy: { color: palette.textSecondary, fontSize: fontSize.body },
  emptyTitle: {
    color: palette.textPrimary,
    fontSize: fontSize.title2,
    fontWeight: fontWeight.bold,
  },
  header: { gap: sizes.spacing.section, padding: sizes.spacing.screen },
  iconButton: {
    alignItems: "center",
    borderColor: palette.controlBorder,
    borderRadius: sizes.radius.control,
    borderWidth: sizes.border,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  list: { gap: sizes.spacing.xxLarge, padding: sizes.spacing.content },
  screen: { backgroundColor: palette.background, flex: 1 },
  searchInput: { color: palette.textPrimary, flex: 1, fontSize: fontSize.callout, height: 48 },
  searchShell: {
    alignItems: "center",
    backgroundColor: palette.surface,
    borderColor: palette.border,
    borderRadius: sizes.radius.card,
    borderWidth: sizes.border,
    flexDirection: "row",
    paddingLeft: sizes.spacing.section,
  },
  skeletonAccent: { backgroundColor: palette.borderStrong, height: 72, width: 6 },
  skeletonCopy: { flex: 1, gap: sizes.spacing.large, padding: sizes.spacing.content },
  skeletonDeck: { paddingHorizontal: sizes.spacing.content },
  skeletonLine: { backgroundColor: palette.border, borderRadius: 3, height: 12, width: "85%" },
  skeletonList: { gap: sizes.spacing.xxLarge, padding: sizes.spacing.content },
  skeletonShortLine: { backgroundColor: palette.border, borderRadius: 3, height: 10, width: "35%" },
  skeletonTitle: {
    backgroundColor: palette.borderStrong,
    borderRadius: 3,
    height: 21,
    width: "55%",
  },
});
