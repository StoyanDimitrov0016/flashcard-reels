import { useFocusEffect, useRouter } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
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

import type { PendingDeckProgress } from "@/features/decks/domain/archived-deck-progress";
import type { DeckAppearance } from "@/features/decks/domain/deck-appearance.model";

import { DeckAppearanceSheet } from "@/features/decks/presentation/components/deck-appearance-sheet";
import { DeckCover } from "@/features/decks/presentation/components/deck-cover";
import { ImportDeckSheet } from "@/features/decks/presentation/components/import-deck-sheet";
import { SavedProgressChoiceSheet } from "@/features/decks/presentation/components/saved-progress-choice-sheet";
import { useInvalidateDeckContent } from "@/features/decks/presentation/context/deck-content-context";
import { useDeckCatalog } from "@/features/decks/presentation/controllers/use-deck-catalog";
import { useImportDeckPackage } from "@/features/decks/presentation/controllers/use-import-deck-package";
import { useSaveDeckAppearance } from "@/features/decks/presentation/controllers/use-save-deck-appearance";
import {
  resolveDeckAppearance,
  type DeckAppearancePreset,
} from "@/features/decks/presentation/deck-appearance-presets";
import { matchesDeckSearch } from "@/features/decks/presentation/deck-catalog-search";
import { getDeckDetailsHref } from "@/features/decks/presentation/deck-details-mode";
import {
  getDeckImportErrorFeedback,
  getDeckImportResultFeedback,
} from "@/features/decks/presentation/deck-import-feedback";
import { useDecks } from "@/features/decks/presentation/dependencies/use-decks";
import { useLearningProgressRevision } from "@/features/flashcard-progress/presentation/context/learning-progress-revision-context";
import { useHaptics } from "@/features/preferences/presentation/controllers/use-haptics";
import {
  FOCUS_HOLD_DURATION_MS,
  HOLD_FEEDBACK_DELAY_MS,
} from "@/features/reels/presentation/hold-to-focus";
import { useOpenFocusedFeed } from "@/features/reels/presentation/hooks/use-open-focused-feed";
import { DestructiveConfirmationSheet } from "@/shared/presentation/components/destructive-confirmation-sheet";
import { ScreenHeader } from "@/shared/presentation/components/screen-header";
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
  onAppearance: () => void;
  onChooseProgress: () => void;
  onFocus: () => void;
  onViewCards: () => void;
}>;

function DeckRow({
  entry,
  paused,
  onAppearance,
  onChooseProgress,
  onFocus,
  onViewCards,
}: DeckRowProps) {
  const { colors, resolvedScheme } = useAppTheme();
  const styles = createStyles(colors);
  const { appearance, cardCount, deck } = entry;
  const deckColors = resolveDeckAppearance(appearance.presetId, resolvedScheme);
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
  const { savedProgressService } = useDecks();
  const invalidateDeckContent = useInvalidateDeckContent();
  const { invalidateLearningProgress } = useLearningProgressRevision();
  const {
    cancelDownload,
    clearImportError,
    downloading,
    error: importError,
    importFromDevice,
    importFromUrl,
    importing,
  } = useImportDeckPackage();
  const { clearSaveError, pendingPreset, saveError, savePreset } = useSaveDeckAppearance();
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
  const [appearanceOverrides, setAppearanceOverrides] = useState(
    () => new Map<string, DeckAppearance>()
  );
  const visibleEntries = entries
    .filter(({ deck }) => matchesDeckSearch(deck, query))
    .map((entry) => ({
      appearance: appearanceOverrides.get(entry.deck.id) ?? entry.appearance,
      cardCount: entry.cardCount,
      deck: entry.deck,
    }));
  const sheetAppearance = selectedEntry
    ? (appearanceOverrides.get(selectedEntry.deck.id) ?? selectedEntry.appearance)
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
    useCallback(() => {
      refreshPendingProgress();
      return function cancelPendingProgressLoad() {
        pendingLoadSequence.current += 1;
      };
    }, [refreshPendingProgress])
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

  const selectPreset = (preset: DeckAppearancePreset) => {
    if (!selectedEntry) {
      return;
    }
    const deckId = selectedEntry.deck.id;
    void savePreset(deckId, preset).then((appearance) => {
      if (appearance) {
        setAppearanceOverrides((current) => new Map(current).set(deckId, appearance));
      }
    });
  };

  const renderItem: ListRenderItem<CatalogEntry> = ({ item }) => (
    <DeckRow
      entry={item}
      paused={pendingProgress.some((progress) => progress.deckId === item.deck.id)}
      onAppearance={() => {
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
      onFocus={() => openFocusedFeed(item.deck.id)}
      onViewCards={() => router.push(getDeckDetailsHref(item.deck.id, "library"))}
    />
  );

  return (
    <SafeAreaView edges={["top", "right", "left"]} style={styles.screen}>
      <ScreenHeader>
        <Text accessibilityRole="header" style={styles.screenTitle}>
          Library
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
        {progressError && !selectedPending && (
          <Text accessibilityRole="alert" style={styles.pendingError}>
            {progressError}
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
        <View style={styles.searchShell}>
          <SymbolView
            name={{ android: "search", ios: "magnifyingglass", web: "search" }}
            size={sizes.icon.small}
            tintColor={colors.textTertiary}
          />
          <TextInput
            accessibilityLabel="Search deck library"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder="Search decks…"
            placeholderTextColor={colors.textTertiary}
            style={styles.searchInput}
            value={query}
          />
          {!!query && (
            <Pressable
              accessibilityLabel="Clear deck search"
              accessibilityRole="button"
              onPress={() => setQuery("")}
              style={styles.clearButton}
            >
              <SymbolView
                name={{ android: "cancel", ios: "xmark.circle.fill", web: "cancel" }}
                size={sizes.icon.small}
                tintColor={colors.textTertiary}
              />
            </Pressable>
          )}
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
            style={styles.listView}
          />
        )}
      </View>
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
      <ImportDeckSheet
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
    clearButton: {
      alignItems: "center",
      height: sizes.touchTarget.minimum,
      justifyContent: "center",
      width: sizes.touchTarget.minimum,
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
    empty: { alignItems: "center", gap: sizes.spacing.medium, padding: sizes.spacing.wide },
    emptyCopy: { color: colors.textSecondary, fontSize: fontSize.body },
    emptyTitle: {
      color: colors.textPrimary,
      fontSize: fontSize.title2,
      fontWeight: fontWeight.bold,
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
    pendingError: { color: colors.error, fontSize: fontSize.caption },
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
    searchInput: {
      color: colors.textPrimary,
      flex: 1,
      fontSize: fontSize.callout,
      height: sizes.input.standard,
    },
    searchShell: {
      alignItems: "center",
      backgroundColor: colors.surfaceRaised,
      borderColor: colors.borderSubtle,
      borderRadius: sizes.radius.row,
      borderWidth: sizes.border,
      flexDirection: "row",
      paddingLeft: sizes.spacing.section,
    },
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
