import { useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { DeckThemeSelectionSheet } from "@/features/decks/presentation/components/deck-theme-selection-sheet";
import { ImportDeckSheet } from "@/features/decks/presentation/components/import-deck-sheet";
import { SavedProgressChoiceSheet } from "@/features/decks/presentation/components/saved-progress-choice-sheet";
import { useArchivedProgress } from "@/features/decks/presentation/controllers/use-archived-progress";
import { useDeckCatalog } from "@/features/decks/presentation/controllers/use-deck-catalog";
import { useImportDeckPackage } from "@/features/decks/presentation/controllers/use-import-deck-package";
import { usePausedDeckProgress } from "@/features/decks/presentation/controllers/use-paused-deck-progress";
import { useSaveDeckThemeSelection } from "@/features/decks/presentation/controllers/use-save-deck-theme-selection";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { getDeckDetailsHref } from "@/features/decks/presentation/deck-details-href";
import {
  isRetryableDeckDownloadError,
  getDeckImportErrorFeedback,
  getDeckImportResultFeedback,
} from "@/features/decks/presentation/deck-import-feedback";
import { resolveDeckTheme, type DeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { useFlashcardProgressList } from "@/features/flashcard-progress/presentation/controllers/use-flashcard-progress-list";
import { summarizeReviews } from "@/features/flashcard-progress/presentation/review-summary";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import {
  FOCUS_HOLD_DURATION_MS,
  HOLD_FEEDBACK_DELAY_MS,
} from "@/features/reels/presentation/hold-to-focus";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { EmptyState } from "@/shared/presentation/components/empty-state";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
import { SearchField } from "@/shared/presentation/components/search-field";
import { useTabBarInset } from "@/shared/presentation/context/tab-bar-inset-context";
import {
  hideFlashcardToast,
  showFocusedToast,
  showHoldToast,
  showSuccessToast,
} from "@/shared/presentation/flashcard-toast";
import { screenLayout } from "@/shared/presentation/screen-layout";
import { sizes } from "@/shared/presentation/sizes";
import { useAppTheme, type AppColors } from "@/shared/presentation/theme";
import { fontSize, fontWeight, lineHeight } from "@/shared/presentation/typography";

type CatalogEntry = ReturnType<typeof useDeckCatalog>["entries"][number];
type DeckRowProps = Readonly<{
  entry: CatalogEntry;
  paused: boolean;
  onThemeSelection: () => void;
  onChooseProgress: () => void;
  onFocus: () => void;
  onViewCards: () => void;
  reviewedCount: number;
}>;

function DeckRow({
  entry,
  paused,
  onThemeSelection,
  onChooseProgress,
  onFocus,
  onViewCards,
  reviewedCount,
}: DeckRowProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const { themeSelection, cardCount, deck } = entry;
  const deckColors = resolveDeckTheme(themeSelection.theme, resolvedScheme);
  const longPressHandled = useRef(false);
  const holdFeedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const haptics = useHaptics();

  const clearHoldFeedback = () => {
    if (holdFeedbackTimer.current !== null) {
      clearTimeout(holdFeedbackTimer.current);
      holdFeedbackTimer.current = null;
    }
    hideFlashcardToast();
  };

  useEffect(function cleanUpHoldFeedback() {
    return function cancelIncompleteHoldFeedback() {
      if (holdFeedbackTimer.current !== null) {
        clearTimeout(holdFeedbackTimer.current);
        holdFeedbackTimer.current = null;
      }
      if (!longPressHandled.current) {
        hideFlashcardToast();
      }
    };
  }, []);

  return (
    <View style={styles.deck}>
      <View style={[styles.accent, { backgroundColor: deckColors.accent }]} />
      <Pressable
        accessibilityHint={
          paused
            ? "Choose how to use saved learning progress."
            : "Tap to view deck cards. Hold to study this deck in Focus."
        }
        accessibilityLabel={deck.title}
        accessibilityRole="button"
        delayLongPress={FOCUS_HOLD_DURATION_MS}
        onLongPress={() => {
          clearHoldFeedback();
          longPressHandled.current = true;
          if (paused) {
            onChooseProgress();
            return;
          }
          haptics.focusCompleted();
          showFocusedToast();
          onFocus();
        }}
        onPressIn={() => {
          longPressHandled.current = false;
          if (paused) {
            return;
          }
          clearHoldFeedback();
          holdFeedbackTimer.current = setTimeout(() => {
            holdFeedbackTimer.current = null;
            showHoldToast();
          }, HOLD_FEEDBACK_DELAY_MS);
        }}
        onPressOut={() => {
          if (!longPressHandled.current) {
            clearHoldFeedback();
          }
        }}
        onPress={() => {
          if (longPressHandled.current) {
            longPressHandled.current = false;
            return;
          }
          if (paused) {
            onChooseProgress();
            return;
          }
          onViewCards();
        }}
        style={styles.deckBody}
      >
        <DeckCover accentColor={deckColors.accent} asset={deck.coverAsset} />
        <View style={styles.deckCopy}>
          <View style={styles.deckHeading}>
            <Text numberOfLines={2} style={styles.deckTitle}>
              {deck.title}
            </Text>
            <Text style={styles.cardCount}>
              {reviewedCount} / {cardCount} reviewed
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.description}>
            {deck.description}
          </Text>
        </View>
      </Pressable>
      <View style={styles.actions}>
        <Pressable
          accessibilityLabel={`Change ${deck.title} theme`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={onThemeSelection}
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

type ArchivedProgressRowProps = Readonly<{ count: number; onPress: () => void }>;

/** Removed decks whose learning progress is kept, under the installed decks. */
function ArchivedProgressRow({ count, onPress }: ArchivedProgressRowProps) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const countLabel = count === 1 ? "1 removed deck" : `${count} removed decks`;

  return (
    <Pressable
      accessibilityHint="Opens the progress kept from removed decks"
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.archivedRow, pressed && styles.archivedRowPressed]}
    >
      <SymbolView
        name={{ android: "archive", ios: "archivebox", web: "archive" }}
        size={sizes.icon.small}
        tintColor={colors.textSecondary}
      />
      <View style={styles.archivedCopy}>
        <Text style={styles.archivedTitle}>Archived deck progress</Text>
        <Text style={styles.cardCount}>{countLabel}</Text>
      </View>
      <SymbolView
        name={{ android: "chevron_right", ios: "chevron.right", web: "chevron_right" }}
        size={sizes.icon.small}
        tintColor={colors.textTertiary}
      />
    </Pressable>
  );
}

function DecksSkeleton() {
  const styles = createStyles(useAppTheme().colors);

  return (
    <View accessibilityLabel="Loading decks" style={styles.skeletonList}>
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

function EmptyDeckSearch() {
  return (
    <EmptyState
      icon={{ android: "search_off", ios: "magnifyingglass", web: "search_off" }}
      message="Try another title or description."
      title="No decks found"
    />
  );
}

function EmptyDecks() {
  return (
    <EmptyState
      icon={{ android: "library_books", ios: "books.vertical", web: "library_books" }}
      message="Import a deck from Flashcard Reels on the web or a .fcrdeck file."
      title="No decks yet"
    />
  );
}

export default function DecksScreen() {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);
  const tabBarInset = useTabBarInset();
  const router = useRouter();
  const openFocusedFeed = useOpenFocusedFeed();
  const { entries, loading } = useDeckCatalog();
  const { rows: progressRows } = useFlashcardProgressList();
  const { rows: archivedRows } = useArchivedProgress();
  const reviewSummary = summarizeReviews(progressRows);
  const {
    cancelDownload,
    clearImportError,
    downloading,
    error: importError,
    importFromDevice,
    downloadProgress,
    importFromUrl,
    importing,
  } = useImportDeckPackage();
  const [query, setQuery] = useState("");
  const [importSheetPresented, setImportSheetPresented] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const pausedProgress = usePausedDeckProgress({ suspendPrompt: importSheetPresented });
  const visibleEntries = entries.filter(({ deck }) => matchesDeckSearch(deck, query));
  // The catalog reloads after a theme is saved, so the selected entry is read from it.
  const sheetThemeSelection = selectedEntry
    ? (entries.find(({ deck }) => deck.id === selectedEntry.deck.id)?.themeSelection ?? null)
    : null;
  const { clearSaveError, pendingPreset, saveError, savePreset, saving } =
    useSaveDeckThemeSelection({
      deckId: selectedEntry?.deck.id ?? null,
      themeId: sheetThemeSelection?.theme ?? null,
    });

  const handleImport = async (
    importDeck: () => Promise<Awaited<ReturnType<typeof importFromDevice>>>
  ) => {
    const result = await importDeck();
    if (result) {
      showSuccessToast(getDeckImportResultFeedback(result).message);
      return true;
    }
    return false;
  };

  const selectPreset = (preset: DeckTheme) => {
    if (!selectedEntry) {
      return;
    }
    savePreset(selectedEntry.deck.id, preset);
  };

  const renderItem: ListRenderItem<CatalogEntry> = ({ item }) => (
    <DeckRow
      entry={item}
      paused={pausedProgress.isPaused(item.deck.id)}
      onThemeSelection={() => {
        clearSaveError();
        setSelectedEntry(item);
      }}
      onChooseProgress={() => pausedProgress.open(item.deck.id)}
      onFocus={() => openFocusedFeed(item.deck.id, null)}
      onViewCards={() => router.push(getDeckDetailsHref(item.deck.id))}
      reviewedCount={reviewSummary.reviewedByDeckId.get(item.deck.id) ?? 0}
    />
  );

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Decks
        </Text>
        <Pressable
          accessibilityLabel="Import deck package"
          accessibilityRole="button"
          disabled={importing}
          hitSlop={4}
          onPress={() => {
            clearImportError();
            setImportSheetPresented(true);
          }}
          style={styles.importButton}
        >
          <SymbolView
            name={{ android: "file_download", ios: "square.and.arrow.down", web: "download" }}
            size={sizes.icon.small}
            tintColor={colors.textPrimary}
          />
        </Pressable>
      </ScreenHeader>
      <View style={styles.body}>
        {reviewSummary.cardCount > 0 && (
          <Text style={styles.description}>
            {reviewSummary.reviewedCount} of {reviewSummary.cardCount} cards reviewed
          </Text>
        )}
        {pausedProgress.paused.map((progress) => (
          <Pressable
            key={progress.deckId}
            accessibilityRole="button"
            onPress={() => pausedProgress.open(progress.deckId)}
            style={styles.pendingBanner}
          >
            <Text style={styles.pendingTitle}>Choose progress for {progress.title}</Text>
            <Text style={styles.pendingCopy}>This deck is paused until you decide.</Text>
          </Pressable>
        ))}
        <SearchField
          accessibilityLabel="Search decks"
          clearLabel="Clear deck search"
          onChangeText={setQuery}
          placeholder="Search decks…"
          value={query}
        />
        {loading ? (
          <DecksSkeleton />
        ) : (
          <FlatList
            contentContainerStyle={[
              styles.list,
              { paddingBottom: sizes.spacing.content + tabBarInset },
            ]}
            data={visibleEntries}
            keyboardShouldPersistTaps="handled"
            keyExtractor={({ deck }) => deck.id}
            ListEmptyComponent={query.trim() ? EmptyDeckSearch : EmptyDecks}
            ListFooterComponent={
              archivedRows.length > 0 ? (
                <ArchivedProgressRow
                  count={archivedRows.length}
                  onPress={() => router.push("../archived-progress")}
                />
              ) : null
            }
            renderItem={renderItem}
            style={styles.listView}
          />
        )}
      </View>
      <DeckThemeSelectionSheet
        themeSelection={sheetThemeSelection}
        deck={selectedEntry?.deck ?? null}
        error={saveError}
        isPresented={selectedEntry !== null}
        onDismiss={() => {
          if (!saving) {
            setSelectedEntry(null);
          }
        }}
        onSelect={selectPreset}
        pendingPreset={pendingPreset}
        saving={saving}
      />
      <ImportDeckSheet
        canRetryDownload={isRetryableDeckDownloadError(importError)}
        downloadProgress={downloadProgress}
        downloading={downloading}
        errorMessage={importError ? getDeckImportErrorFeedback(importError).message : null}
        importing={importing}
        onBrowse={() => handleImport(importFromDevice)}
        onClose={() => {
          if (!importing || downloading) {
            cancelDownload();
            clearImportError();
            setImportSheetPresented(false);
          }
        }}
        onClearError={clearImportError}
        onScan={(url) => handleImport(() => importFromUrl(url))}
        visible={importSheetPresented}
      />
      <SavedProgressChoiceSheet
        busy={pausedProgress.busy}
        error={pausedProgress.error}
        progress={pausedProgress.confirmingStartFresh ? null : pausedProgress.selected}
        onClose={pausedProgress.close}
        onContinue={pausedProgress.continueProgress}
        onStartFresh={pausedProgress.askToStartFresh}
      />
      <DestructiveConfirmationSheet
        actionLabel="Delete saved progress"
        busy={pausedProgress.busy}
        error={pausedProgress.error}
        icon={{ android: "delete", ios: "trash.fill", web: "delete" }}
        message="All saved reviews and learning progress for this deck will be permanently deleted."
        onCancel={pausedProgress.cancelStartFresh}
        onConfirm={pausedProgress.startFresh}
        title={`Start ${pausedProgress.selected?.title ?? "deck"} fresh?`}
        visible={pausedProgress.confirmingStartFresh}
      />
    </SafeAreaView>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    archivedCopy: { flex: 1, gap: sizes.spacing.xSmall },
    archivedRow: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      gap: sizes.spacing.xLarge,
      marginTop: sizes.spacing.medium,
      minHeight: sizes.input.standard + sizes.spacing.xSmall,
      paddingHorizontal: sizes.spacing.xLarge,
      paddingVertical: sizes.spacing.medium,
    },
    archivedRowPressed: { backgroundColor: colors.surfaceHover },
    archivedTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.semibold,
    },
    accent: { alignSelf: "stretch", width: 4 },
    actions: {
      alignItems: "center",
      flexDirection: "column",
      paddingRight: sizes.spacing.medium,
    },
    cardCount: {
      color: colors.textTertiary,
      fontSize: fontSize.caption,
    },
    deck: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
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
    body: {
      flex: 1,
      gap: sizes.spacing.section,
      paddingHorizontal: sizes.spacing.content,
      paddingTop: screenLayout.contentTopGap,
    },
    importButton: {
      alignItems: "center",
      height: sizes.control.compact,
      justifyContent: "center",
      width: sizes.control.compact,
    },
    pendingBanner: {
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.actionPrimary,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      gap: sizes.spacing.xSmall,
      padding: sizes.spacing.medium,
    },
    pendingTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.body,
      fontWeight: fontWeight.bold,
    },
    pendingCopy: { color: colors.textSecondary, fontSize: fontSize.caption },
    iconButton: {
      alignItems: "center",
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.pill,
      height: sizes.control.compact,
      justifyContent: "center",
      width: sizes.control.compact,
    },
    list: {
      gap: sizes.spacing.medium,
      paddingBottom: sizes.spacing.content,
    },
    listView: { flex: 1 },
    screenTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title1,
      fontWeight: fontWeight.heavy,
    },
    screen: { backgroundColor: colors.canvas, flex: 1 },
    skeletonAccent: { backgroundColor: colors.borderStrong, height: 72, width: 6 },
    skeletonCopy: { flex: 1, gap: sizes.spacing.large, padding: sizes.spacing.content },
    skeletonDeck: { paddingHorizontal: sizes.spacing.content },
    skeletonLine: {
      backgroundColor: colors.borderSubtle,
      borderRadius: sizes.radius.medium,
      height: 12,
      width: "85%",
    },
    skeletonList: { gap: sizes.spacing.xxLarge },
    skeletonShortLine: {
      backgroundColor: colors.borderSubtle,
      borderRadius: sizes.radius.medium,
      height: 10,
      width: "35%",
    },
    skeletonTitle: {
      backgroundColor: colors.borderStrong,
      borderRadius: sizes.radius.medium,
      height: 21,
      width: "55%",
    },
  });
}
