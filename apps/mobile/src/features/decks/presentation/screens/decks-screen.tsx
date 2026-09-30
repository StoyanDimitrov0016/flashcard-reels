import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View, type ListRenderItem } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";

import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { DeckThemeSelectionSheet } from "@/features/decks/presentation/components/deck-theme-selection-sheet";
import { ImportDeckSheet } from "@/features/decks/presentation/components/import-deck-sheet";
import { SavedProgressChoiceSheet } from "@/features/decks/presentation/components/saved-progress-choice-sheet";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useArchivedProgress } from "@/features/decks/presentation/controllers/use-archived-progress";
import { useDeckCatalog } from "@/features/decks/presentation/controllers/use-deck-catalog";
import { useImportDeckPackage } from "@/features/decks/presentation/controllers/use-import-deck-package";
import { useSaveDeckThemeSelection } from "@/features/decks/presentation/controllers/use-save-deck-theme-selection";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { getDeckDetailsHref } from "@/features/decks/presentation/deck-details-href";
import {
  getDeckImportErrorFeedback,
  getDeckImportResultFeedback,
} from "@/features/decks/presentation/deck-import-feedback";
import { resolveDeckTheme, type DeckTheme } from "@/features/decks/presentation/deck-theme-presets";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
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
  showErrorToast,
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
  const { entries, loading, refresh } = useDeckCatalog();
  const { refresh: refreshProgress, rows: progressRows } = useFlashcardProgressList();
  const { refresh: refreshArchived, rows: archivedRows } = useArchivedProgress();
  const reviewSummary = summarizeReviews(progressRows);

  useFocusEffect(
    useCallback(
      function refreshProgressWhenFocused() {
        refreshProgress();
        refreshArchived();
      },
      [refreshArchived, refreshProgress]
    )
  );
  const { savedProgressService } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressRevision();
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
  const { clearSaveError, pendingPreset, saveError, savePreset } = useSaveDeckThemeSelection();
  const [query, setQuery] = useState("");
  const [importSheetPresented, setImportSheetPresented] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null);
  const [pendingProgress, setPendingProgress] = useState<PendingDeckProgress[]>([]);
  const promptedProgress = useRef(new Set<string>());
  const pendingLoadSequence = useRef(0);
  const [selectedPending, setSelectedPending] = useState<PendingDeckProgress | null>(null);
  const [confirmStartFresh, setConfirmStartFresh] = useState(false);
  const [progressBusy, setProgressBusy] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);
  const visibleEntries = entries.filter(({ deck }) => matchesDeckSearch(deck, query));
  // The catalog reloads after a theme is saved, so the selected entry is read from it.
  const sheetThemeSelection = selectedEntry
    ? (entries.find(({ deck }) => deck.id === selectedEntry.deck.id)?.themeSelection ?? null)
    : null;

  const refreshPendingProgress = useCallback(() => {
    const sequence = ++pendingLoadSequence.current;
    void savedProgressService
      .listPendingProgress()
      .then((progress) => {
        if (sequence === pendingLoadSequence.current) {
          setPendingProgress(progress);
        }
      })
      .catch(() => {
        if (sequence === pendingLoadSequence.current) {
          setProgressError("Could not load saved progress. Try again.");
        }
      });
  }, [savedProgressService]);

  useFocusEffect(
    useCallback(
      function refreshPendingProgressWhenFocused() {
        refreshPendingProgress();
        return function cancelPendingProgressLoad() {
          pendingLoadSequence.current += 1;
        };
      },
      [refreshPendingProgress]
    )
  );

  useEffect(
    function announceProgressFailure() {
      // Inside the sheet the error shows next to its buttons.
      if (progressError && !selectedPending) {
        showErrorToast(progressError);
      }
    },
    [progressError, selectedPending]
  );

  useEffect(
    function offerUnresolvedProgressChoice() {
      if (importSheetPresented || selectedPending) {
        return;
      }
      const unprompted = pendingProgress.find(
        (progress) => !promptedProgress.current.has(progress.deckId)
      );
      if (unprompted) {
        promptedProgress.current.add(unprompted.deckId);
        setSelectedPending(unprompted);
      }
    },
    [importSheetPresented, pendingProgress, selectedPending]
  );

  const resolveProgress = async (startFresh: boolean) => {
    if (!selectedPending || progressBusy) {
      return;
    }
    setProgressBusy(true);
    setProgressError(null);
    try {
      if (startFresh) {
        await savedProgressService.deleteProgress(selectedPending.deckId);
      } else {
        await savedProgressService.continueProgress(selectedPending.deckId);
      }
      invalidateDeckContent();
      invalidateLearningProgress();
      setSelectedPending(null);
      setConfirmStartFresh(false);
      refreshPendingProgress();
      showSuccessToast(startFresh ? "Starting fresh with this deck." : "Saved progress continued.");
    } catch {
      setProgressError("Could not update saved progress. Try again.");
      setConfirmStartFresh(false);
    } finally {
      setProgressBusy(false);
    }
  };

  const handleImport = async (
    importDeck: () => Promise<Awaited<ReturnType<typeof importFromDevice>>>
  ) => {
    const result = await importDeck();
    if (result) {
      showSuccessToast(getDeckImportResultFeedback(result).message);
      refresh();
      refreshPendingProgress();
      return true;
    }
    return false;
  };

  const selectPreset = (preset: DeckTheme) => {
    if (!selectedEntry) {
      return;
    }
    void savePreset(selectedEntry.deck.id, preset);
  };

  const renderItem: ListRenderItem<CatalogEntry> = ({ item }) => (
    <DeckRow
      entry={item}
      paused={pendingProgress.some((progress) => progress.deckId === item.deck.id)}
      onThemeSelection={() => {
        clearSaveError();
        setSelectedEntry(item);
      }}
      onChooseProgress={() => {
        const progress = pendingProgress.find((candidate) => candidate.deckId === item.deck.id);
        if (progress) {
          setProgressError(null);
          setSelectedPending(progress);
        }
      }}
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
        {pendingProgress.map((progress) => (
          <Pressable
            key={progress.deckId}
            accessibilityRole="button"
            onPress={() => {
              setProgressError(null);
              setSelectedPending(progress);
            }}
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
          if (!pendingPreset) {
            setSelectedEntry(null);
          }
        }}
        onSelect={selectPreset}
        pendingPreset={pendingPreset}
      />
      <ImportDeckSheet
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
        busy={progressBusy}
        error={progressError}
        progress={confirmStartFresh ? null : selectedPending}
        onClose={() => {
          if (!confirmStartFresh) {
            setSelectedPending(null);
          }
        }}
        onContinue={() => void resolveProgress(false)}
        onStartFresh={() => setConfirmStartFresh(true)}
      />
      <DestructiveConfirmationSheet
        actionLabel="Delete saved progress"
        busy={progressBusy}
        error={progressError}
        icon={{ android: "delete", ios: "trash.fill", web: "delete" }}
        message="All saved reviews and learning progress for this deck will be permanently deleted."
        onCancel={() => setConfirmStartFresh(false)}
        onConfirm={() => void resolveProgress(true)}
        title={`Start ${selectedPending?.title ?? "deck"} fresh?`}
        visible={confirmStartFresh}
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
      width: 36,
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
      width: 36,
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
      borderRadius: 3,
      height: 12,
      width: "85%",
    },
    skeletonList: { gap: sizes.spacing.xxLarge },
    skeletonShortLine: {
      backgroundColor: colors.borderSubtle,
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
