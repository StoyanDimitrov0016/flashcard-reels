import {
  compareDeckPackages,
  parseDeckPackage,
  type DeckPackage,
  type DeckComparison,
} from "@flashcard-reels/deck-contract";

/**
 * Publication review for deck tooling. The app never publishes decks; the R2 upload script uses
 * this module to compare candidate packages with the currently published catalog before upload.
 */

type PublishedDeckEntry = Readonly<{
  key: string;
  deckId: string;
  title: string;
  revision: number;
  sha256: string;
}>;

export interface PublishedDeckStore {
  listPublishedDecks(): Promise<readonly PublishedDeckEntry[]>;
  readPublishedDeck(key: string): Promise<Uint8Array>;
}

export type DeckPublicationCandidate = Readonly<{
  fileName: string;
  bytes: Uint8Array;
  sha256: string;
}>;

type PublicationCard = Readonly<{ id: string; question: string }>;

type PublicationLesson = Readonly<{ id: string; title: string }>;

type DeckPublicationStatus = "new" | "unchanged" | "updated" | "blocked";

type DeckPublicationChange = Readonly<{
  deckId: string;
  title: string;
  fileName: string;
  key: string;
  status: DeckPublicationStatus;
  publishedRevision: number | null;
  revision: number;
  addedCards: readonly PublicationCard[];
  changedCards: readonly PublicationCard[];
  removedCards: readonly PublicationCard[];
  reorderedCardCount: number;
  addedLessons: readonly PublicationLesson[];
  changedLessons: readonly PublicationLesson[];
  removedLessons: readonly PublicationLesson[];
  reorderedLessonCount: number;
  metadataChanged: boolean;
  audioChanged: boolean;
  blocks: readonly string[];
  warnings: readonly string[];
}>;

export type DeckPublicationReview = Readonly<{
  decks: readonly DeckPublicationChange[];
  blocks: readonly string[];
}>;

export type DeckPublicationUpload = Readonly<{
  key: string;
  bytes: Uint8Array;
  sha256: string;
  deckId: string;
  title: string;
  revision: number;
}>;

type ReviewOptions = Readonly<{
  candidates: readonly DeckPublicationCandidate[];
  store: PublishedDeckStore;
  keyPrefix?: string;
}>;

type ReadCandidate = Readonly<{
  candidate: DeckPublicationCandidate;
  deck: DeckPackage;
}>;

type DeckIdInventory = Readonly<{
  id: string;
  cards: readonly Readonly<{ id: string }>[];
  lessons: readonly Readonly<{ id: string }>[];
}>;

/**
 * Reads every candidate and every relevant published package before deciding anything, so a
 * store failure rejects the whole review and nothing can be uploaded from a partial comparison.
 */
export async function reviewDeckPublication({
  candidates,
  store,
  keyPrefix = "decks/",
}: ReviewOptions): Promise<DeckPublicationReview> {
  if (!keyPrefix.endsWith("/") || keyPrefix.startsWith("/") || keyPrefix.includes("..")) {
    throw new Error("Publication prefix must be a relative prefix ending in /");
  }
  const readCandidates: ReadCandidate[] = candidates.map((candidate) => ({
    candidate,
    deck: parseDeckPackage(candidate.bytes),
  }));
  const publishedEntries = await store.listPublishedDecks();
  if (publishedEntries.some((entry) => !entry.key.startsWith(keyPrefix))) {
    throw new Error("Published catalog contains an object outside the selected prefix");
  }
  const publishedByDeckId = new Map(publishedEntries.map((entry) => [entry.deckId, entry]));
  const catalogBlocks: string[] = [];

  const candidateCounts = new Map<string, number>();
  const fileNameCounts = new Map<string, number>();
  for (const { candidate, deck } of readCandidates) {
    candidateCounts.set(deck.deck.id, (candidateCounts.get(deck.deck.id) ?? 0) + 1);
    fileNameCounts.set(candidate.fileName, (fileNameCounts.get(candidate.fileName) ?? 0) + 1);
  }
  for (const [deckId, count] of candidateCounts) {
    if (count > 1) {
      catalogBlocks.push(`Deck ${deckId} appears in ${count} candidate packages.`);
    }
  }
  for (const [fileName, count] of fileNameCounts) {
    if (count > 1) {
      catalogBlocks.push(`File name ${fileName} appears in ${count} candidate packages.`);
    }
  }

  const publishedDecks = new Map<string, DeckPackage>();
  const publishedIds: DeckIdInventory[] = [];
  for (const published of publishedEntries) {
    // Read one package at a time so the review does not retain every published audio file.
    // oxlint-disable-next-line no-await-in-loop
    const bytes = await store.readPublishedDeck(published.key);
    const deck = parseDeckPackage(bytes);
    if (deck.deck.id !== published.deckId || deck.deck.revision !== published.revision) {
      throw new Error(`Published metadata disagrees with package ${published.key}`);
    }
    publishedIds.push({
      id: deck.deck.id,
      cards: deck.deck.cards.map(({ id }) => ({ id })),
      lessons: deck.deck.lessons.map(({ id }) => ({ id })),
    });
    const candidate = readCandidates.find(({ deck: item }) => item.deck.id === deck.deck.id);
    if (candidate && candidate.candidate.sha256 !== published.sha256) {
      publishedDecks.set(deck.deck.id, deck);
    }
  }
  if (publishedByDeckId.size !== publishedEntries.length) {
    catalogBlocks.push("The published catalog contains duplicate deck IDs.");
  }

  const changes = readCandidates.map(({ candidate, deck }) => {
    const published = publishedByDeckId.get(deck.deck.id) ?? null;
    return reviewDeck({
      candidate,
      deck,
      published,
      publishedDeck:
        published && published.sha256 !== candidate.sha256
          ? (publishedDecks.get(deck.deck.id) ?? null)
          : null,
      publishedEntries,
      keyPrefix,
    });
  });

  const ownersByKey = new Map(publishedEntries.map((entry) => [entry.key, entry.deckId]));
  for (const change of changes) {
    const owner = ownersByKey.get(change.key);
    if (owner && owner !== change.deckId) {
      catalogBlocks.push(`Object key ${change.key} already belongs to deck ${owner}.`);
    }
    ownersByKey.set(change.key, change.deckId);
  }

  catalogBlocks.push(
    ...findCrossDeckIds([...readCandidates.map(({ deck }) => deck.deck), ...publishedIds])
  );

  return { blocks: catalogBlocks, decks: changes };
}

export function canPublish(review: DeckPublicationReview): boolean {
  return review.blocks.length === 0 && review.decks.every((change) => change.status !== "blocked");
}

export function publicationUploads(
  review: DeckPublicationReview,
  candidates: readonly DeckPublicationCandidate[]
): DeckPublicationUpload[] {
  if (!canPublish(review)) {
    return [];
  }
  const candidatesByFileName = new Map(
    candidates.map((candidate) => [candidate.fileName, candidate])
  );
  return review.decks.flatMap((change) => {
    const candidate = candidatesByFileName.get(change.fileName);
    if (!candidate || (change.status !== "new" && change.status !== "updated")) {
      return [];
    }
    return [
      {
        bytes: candidate.bytes,
        deckId: change.deckId,
        key: change.key,
        sha256: candidate.sha256,
        title: change.title,
        revision: change.revision,
      },
    ];
  });
}

type ReviewDeckOptions = Readonly<{
  candidate: DeckPublicationCandidate;
  deck: DeckPackage;
  published: PublishedDeckEntry | null;
  publishedDeck: DeckPackage | null;
  publishedEntries: readonly PublishedDeckEntry[];
  keyPrefix: string;
}>;

function reviewDeck({
  candidate,
  deck,
  published,
  publishedDeck,
  publishedEntries,
  keyPrefix,
}: ReviewDeckOptions): DeckPublicationChange {
  const key = published?.key ?? `${keyPrefix}${candidate.fileName}`;
  if (candidate.fileName.includes("/") || candidate.fileName.includes("\\")) {
    throw new Error("Candidate file names cannot contain directory separators");
  }
  const base = {
    deckId: deck.deck.id,
    fileName: candidate.fileName,
    key,
    title: deck.deck.title,
    revision: deck.deck.revision,
  };

  if (!published) {
    const warnings = publishedEntries
      .filter((entry) => entry.title === deck.deck.title)
      .map(
        (entry) =>
          `A published deck with a different ID (${entry.deckId}) already has the title "${deck.deck.title}". Check that the deck ID did not change by accident.`
      );
    return {
      ...base,
      ...unchangedComparison(),
      addedCards: deck.deck.cards.map(toPublicationCard),
      addedLessons: (deck.deck.lessons ?? []).map(toPublicationLesson),
      blocks: [],
      publishedRevision: null,
      status: "new",
      warnings,
    };
  }

  const blocks: string[] = [];
  if (publishedDeck && publishedDeck.deck.authorId !== deck.deck.authorId) {
    blocks.push(`Deck ${deck.deck.id} cannot change author ID across revisions.`);
  }

  const comparison = publishedDeck
    ? compareDeckPackages(publishedDeck, deck)
    : unchangedComparison();
  const contentChanged =
    comparison.addedCards.length > 0 ||
    comparison.changedCards.length > 0 ||
    comparison.removedCards.length > 0 ||
    comparison.reorderedCardCount > 0 ||
    comparison.addedLessons.length > 0 ||
    comparison.changedLessons.length > 0 ||
    comparison.removedLessons.length > 0 ||
    comparison.reorderedLessonCount > 0 ||
    comparison.metadataChanged ||
    comparison.audioChanged;

  if (deck.deck.revision < published.revision) {
    blocks.push(
      `Revision ${deck.deck.revision} is lower than the published revision ${published.revision}.`
    );
  } else if (contentChanged && deck.deck.revision === published.revision) {
    blocks.push(
      `Content changed but the revision is still ${deck.deck.revision}. Installed apps would ignore this update; raise the revision.`
    );
  }

  let status: DeckPublicationStatus;
  if (blocks.length > 0) {
    status = "blocked";
  } else if (contentChanged || deck.deck.revision !== published.revision) {
    status = "updated";
  } else {
    status = "unchanged";
  }

  return { ...base, ...comparison, blocks, publishedRevision: published.revision, status };
}

function unchangedComparison(): DeckComparison {
  return {
    addedCards: [],
    audioChanged: false,
    changedCards: [],
    metadataChanged: false,
    removedCards: [],
    reorderedCardCount: 0,
    addedLessons: [],
    changedLessons: [],
    removedLessons: [],
    reorderedLessonCount: 0,
    warnings: [],
  };
}

function findCrossDeckIds(decks: readonly DeckIdInventory[]): string[] {
  const owners = new Map<string, Readonly<{ kind: string; deckIds: Set<string> }>>();
  const addOwner = (id: string, kind: string, deckId: string) => {
    const owner = owners.get(id) ?? { deckIds: new Set<string>(), kind };
    owner.deckIds.add(deckId);
    owners.set(id, owner);
  };
  for (const deck of decks) {
    for (const card of deck.cards) {
      addOwner(card.id, "Card", deck.id);
    }
    for (const lesson of deck.lessons ?? []) {
      addOwner(lesson.id, "Lesson", deck.id);
    }
  }
  return [...owners.entries()]
    .filter(([, owner]) => owner.deckIds.size > 1)
    .map(
      ([id, owner]) =>
        `${owner.kind} ${id} appears in more than one deck: ${[...owner.deckIds].join(", ")}.`
    );
}

function toPublicationLesson(lesson: Readonly<{ id: string; title: string }>): PublicationLesson {
  return { id: lesson.id, title: lesson.title };
}

function toPublicationCard(card: Readonly<{ id: string; question: string }>): PublicationCard {
  return { id: card.id, question: card.question };
}
