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
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { useDeckCatalog } from "@/features/decks/presentation/hooks/use-deck-catalog";
import { useSaveDeckAppearance } from "@/features/decks/presentation/hooks/use-save-deck-appearance";
import { useImportDeckPackage } from "@/features/decks/presentation/hooks/use-import-deck-package";
import {
  getDeckImportErrorFeedback,
  getDeckImportResultFeedback,
  type DeckImportFeedback,
} from "@/features/decks/presentation/deck-import-feedback";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
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
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const { appearance, cardCount, deck } = entry;

  return (
    <View style={styles.deck}>
      <View style={[styles.accent, { backgroundColor: appearance.accentColor }]} />
      <Pressable
        accessibilityHint="Tap to view deck cards. Hold to study this deck in Focus."
        accessibilityLabel={deck.title}
        accessibilityRole="button"
        delayLongPress={500}
        onLongPress={onFocus}
        onPress={onViewCards}
        style={styles.deckBody}
      >
        <DeckCover accentColor={appearance.accentColor} asset={deck.coverAsset} />
        <View style={styles.deckCopy}>
          <View style={styles.deckHeading}>
            <Text numberOfLines={2} style={styles.deckTitle}>
              {deck.title}
            </Text>
            <Text style={styles.cardCount}>{cardCount} cards</Text>
          </View>
          <Text numberOfLines={2} style={styles.description}>
            {deck.description}
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
            size={sizes.icon.small}
            tintColor={colors.textSecondary}
          />
        </Pressable>
      </View>
    </View>
  );
}

function LibrarySkeleton() {
  const styles = createStyles(useAppTheme().colors);

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
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>No decks found</Text>
      <Text style={styles.emptyCopy}>Try another title or description.</Text>
    </View>
  );
}

function EmptyLibrary() {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>Your library is empty</Text>
      <Text style={styles.emptyCopy}>Import a local .fcrdeck file to add a deck.</Text>
    </View>
  );
}

export default function LibraryScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const router = useRouter();
  const openFocusedFeed = useOpenFocusedFeed();
  const { entries, loading, refresh } = useDeckCatalog();
  const { error: importError, importPackage, importing } = useImportDeckPackage();
  const { clearSaveError, pendingPreset, saveError, savePreset } = useSaveDeckAppearance();
  const [query, setQuery] = useState("");
  const [importFeedback, setImportFeedback] = useState<DeckImportFeedback | null>(null);
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
  const importStatus = importError ? getDeckImportErrorFeedback(importError) : importFeedback;

  const handleImport = async () => {
    setImportFeedback(null);
    const result = await importPackage();
    if (result) {
      setImportFeedback(getDeckImportResultFeedback(result));
      refresh();
    }
  };

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
        <View style={styles.headerTitleRow}>
          <Text accessibilityRole="header" style={styles.screenTitle}>
            Library
          </Text>
          <Pressable
            accessibilityLabel="Import deck package"
            accessibilityRole="button"
            disabled={importing}
            hitSlop={4}
            onPress={() => void handleImport()}
            style={styles.importButton}
          >
            <SymbolView
              name={{ android: "file_download", ios: "square.and.arrow.down", web: "download" }}
              size={sizes.icon.small}
              tintColor={colors.textPrimary}
            />
          </Pressable>
        </View>
        {importStatus ? (
          <Text style={importStatus.tone === "error" ? styles.importError : styles.importSuccess}>
            {importStatus.message}
          </Text>
        ) : null}
        <View style={styles.searchShell}>
          <SymbolView
            name={{ android: "search", ios: "magnifyingglass", web: "search" }}
            size={sizes.icon.small}
            tintColor={colors.textMuted}
          />
          <TextInput
            accessibilityLabel="Search deck library"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search decks…"
            placeholderTextColor={colors.textMuted}
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
                tintColor={colors.textMuted}
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
          ListEmptyComponent={query.trim() ? EmptyLibrarySearch : EmptyLibrary}
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

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    accent: { alignSelf: "stretch", width: 4 },
    actions: { alignItems: "center", flexDirection: "row", paddingRight: sizes.spacing.medium },
    cardCount: {
      color: colors.textMuted,
      fontSize: fontSize.caption,
    },
    clearButton: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
    deck: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      minHeight: 84,
      overflow: "hidden",
    },
    deckBody: {
      alignItems: "center",
      flex: 1,
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      minHeight: 84,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.large,
    },
    deckCopy: { flex: 1, gap: sizes.spacing.xSmall },
    deckHeading: {
      alignItems: "center",
      flexDirection: "row",
      gap: sizes.spacing.small,
      justifyContent: "space-between",
    },
    deckTitle: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.callout,
      fontWeight: fontWeight.bold,
    },
    description: {
      color: colors.textSecondary,
      fontSize: fontSize.caption,
      lineHeight: lineHeight.footnote,
    },
    empty: { alignItems: "center", gap: sizes.spacing.medium, padding: sizes.spacing.wide },
    emptyCopy: { color: colors.textSecondary, fontSize: fontSize.body },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
    },
    header: {
      borderBottomColor: colors.border,
      borderBottomWidth: sizes.border,
      gap: sizes.spacing.xLarge,
      paddingHorizontal: sizes.spacing.content,
      paddingVertical: sizes.spacing.section,
    },
    headerTitleRow: {
      alignItems: "center",
      flexDirection: "row",
      justifyContent: "space-between",
    },
    importButton: {
      alignItems: "center",
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    importError: { color: colors.danger, fontSize: fontSize.caption },
    importSuccess: { color: colors.success, fontSize: fontSize.caption },
    iconButton: {
      alignItems: "center",
      borderColor: colors.controlBorder,
      borderRadius: sizes.radius.pill,
      height: 36,
      justifyContent: "center",
      width: 36,
    },
    list: {
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.content,
      paddingHorizontal: sizes.spacing.content,
    },
    screenTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title1,
      fontWeight: fontWeight.heavy,
    },
    screen: { backgroundColor: colors.background, flex: 1 },
    searchInput: { color: colors.textPrimary, flex: 1, fontSize: fontSize.callout, height: 48 },
    searchShell: {
      alignItems: "center",
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      paddingLeft: sizes.spacing.section,
    },
    skeletonAccent: { backgroundColor: colors.borderStrong, height: 72, width: 6 },
    skeletonCopy: { flex: 1, gap: sizes.spacing.large, padding: sizes.spacing.content },
    skeletonDeck: { paddingHorizontal: sizes.spacing.content },
    skeletonLine: { backgroundColor: colors.border, borderRadius: 3, height: 12, width: "85%" },
    skeletonList: { gap: sizes.spacing.xxLarge, padding: sizes.spacing.content },
    skeletonShortLine: {
      backgroundColor: colors.border,
      borderRadius: 3,
      height: 10,
      width: "35%",
    },
    skeletonTitle: {
      backgroundColor: colors.borderStrong,
      borderRadius: 3,
      height: 21,
      width: "55%",
    },
  });
}
