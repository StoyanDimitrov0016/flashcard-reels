import type { Deck, DeckPackage, Flashcard, Lesson } from "@flashcard-reels/deck-contract";

import type { DeckPackageReader } from "./deck-package.model.ts";

type PublicationDeckPackage = Readonly<
  Omit<Deck, "cards" | "lessons"> & {
    cards: readonly (Flashcard & { order: number })[];
    lessons: readonly (Lesson & { order: number })[];
    audioFiles: DeckPackage["audioFiles"];
    lessonFiles: DeckPackage["lessonFiles"];
  }
>;

function toPublicationDeckPackage(deckPackage: DeckPackage): PublicationDeckPackage {
  const { deck, audioFiles, lessonFiles } = deckPackage;
  return {
    ...deck,
    cards: deck.cards.map((card, order) => ({
      id: card.id,
      question: card.question,
      answer: card.answer,
      lessonId: card.lessonId,
      lessonSectionId: card.lessonSectionId ?? null,
      audio: card.audio,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      order,
    })),
    lessons: deck.lessons.map((lesson, order) => ({
      id: lesson.id,
      title: lesson.title,
      order,
    })),
    audioFiles,
    lessonFiles,
  };
}

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
  reader: DeckPackageReader;
}>;

type ReadCandidate = Readonly<{
  candidate: DeckPublicationCandidate;
  deck: PublicationDeckPackage;
}>;

type DeckIdInventory = Readonly<{
  id: string;
  cards: readonly Readonly<{ id: string }>[];
  lessons: readonly Readonly<{ id: string }>[];
}>;

type DeckComparison = Pick<
  DeckPublicationChange,
  | "addedCards"
  | "changedCards"
  | "removedCards"
  | "reorderedCardCount"
  | "addedLessons"
  | "changedLessons"
  | "removedLessons"
  | "reorderedLessonCount"
  | "metadataChanged"
  | "audioChanged"
  | "warnings"
>;

const publishedKeyPrefix = "decks/";

/**
 * Reads every candidate and every relevant published package before deciding anything, so a
 * store failure rejects the whole review and nothing can be uploaded from a partial comparison.
 */
export async function reviewDeckPublication({
  candidates,
  store,
  reader,
}: ReviewOptions): Promise<DeckPublicationReview> {
  const readCandidates: ReadCandidate[] = candidates.map((candidate) => ({
    candidate,
    deck: toPublicationDeckPackage(reader.read(candidate.bytes)),
  }));
  const publishedEntries = await store.listPublishedDecks();
  const publishedByDeckId = new Map(publishedEntries.map((entry) => [entry.deckId, entry]));
  const catalogBlocks: string[] = [];

  const candidateCounts = new Map<string, number>();
  const fileNameCounts = new Map<string, number>();
  for (const { candidate, deck } of readCandidates) {
    candidateCounts.set(deck.id, (candidateCounts.get(deck.id) ?? 0) + 1);
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

  const publishedDecks = new Map<string, PublicationDeckPackage>();
  const publishedIds: DeckIdInventory[] = [];
  for (const published of publishedEntries) {
    // Read one package at a time so the review does not retain every published audio file.
    // oxlint-disable-next-line no-await-in-loop
    const bytes = await store.readPublishedDeck(published.key);
    const deck = toPublicationDeckPackage(reader.read(bytes));
    if (deck.id !== published.deckId || deck.revision !== published.revision) {
      throw new Error(`Published metadata disagrees with package ${published.key}`);
    }
    publishedIds.push({
      id: deck.id,
      cards: deck.cards.map(({ id }) => ({ id })),
      lessons: deck.lessons.map(({ id }) => ({ id })),
    });
    const candidate = readCandidates.find(({ deck: item }) => item.id === deck.id);
    if (candidate && candidate.candidate.sha256 !== published.sha256) {
      publishedDecks.set(deck.id, deck);
    }
  }
  if (publishedByDeckId.size !== publishedEntries.length) {
    catalogBlocks.push("The published catalog contains duplicate deck IDs.");
  }

  const changes = readCandidates.map(({ candidate, deck }) => {
    const published = publishedByDeckId.get(deck.id) ?? null;
    return reviewDeck({
      candidate,
      deck,
      published,
      publishedDeck:
        published && published.sha256 !== candidate.sha256
          ? (publishedDecks.get(deck.id) ?? null)
          : null,
      publishedEntries,
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
    ...findCrossDeckIds([...readCandidates.map(({ deck }) => deck), ...publishedIds])
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
  deck: PublicationDeckPackage;
  published: PublishedDeckEntry | null;
  publishedDeck: PublicationDeckPackage | null;
  publishedEntries: readonly PublishedDeckEntry[];
}>;

function reviewDeck({
  candidate,
  deck,
  published,
  publishedDeck,
  publishedEntries,
}: ReviewDeckOptions): DeckPublicationChange {
  const key = published?.key ?? `${publishedKeyPrefix}${candidate.fileName}`;
  const base = {
    deckId: deck.id,
    fileName: candidate.fileName,
    key,
    title: deck.title,
    revision: deck.revision,
  };

  if (!published) {
    const warnings = publishedEntries
      .filter((entry) => entry.title === deck.title)
      .map(
        (entry) =>
          `A published deck with a different ID (${entry.deckId}) already has the title "${deck.title}". Check that the deck ID did not change by accident.`
      );
    return {
      ...base,
      ...unchangedComparison(),
      addedCards: deck.cards.map(toPublicationCard),
      addedLessons: (deck.lessons ?? []).map(toPublicationLesson),
      blocks: [],
      publishedRevision: null,
      status: "new",
      warnings,
    };
  }

  const blocks: string[] = [];
  if (publishedDeck && publishedDeck.authorId !== deck.authorId) {
    blocks.push(`Deck ${deck.id} cannot change author ID across revisions.`);
  }

  const comparison = publishedDeck ? compareDecks(publishedDeck, deck) : unchangedComparison();
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

  if (deck.revision < published.revision) {
    blocks.push(
      `Revision ${deck.revision} is lower than the published revision ${published.revision}.`
    );
  } else if (contentChanged && deck.revision === published.revision) {
    blocks.push(
      `Content changed but the revision is still ${deck.revision}. Installed apps would ignore this update; raise the revision.`
    );
  }

  let status: DeckPublicationStatus;
  if (blocks.length > 0) {
    status = "blocked";
  } else if (contentChanged || deck.revision !== published.revision) {
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

function compareDecks(
  published: PublicationDeckPackage,
  candidate: PublicationDeckPackage
): DeckComparison {
  const publishedCards = new Map(published.cards.map((card) => [card.id, card]));
  const candidateCards = new Map(candidate.cards.map((card) => [card.id, card]));
  const addedCards = candidate.cards.filter((card) => !publishedCards.has(card.id));
  const removedCards = published.cards.filter((card) => !candidateCards.has(card.id));
  const keptCards = candidate.cards.flatMap((card) => {
    const publishedCard = publishedCards.get(card.id);
    return publishedCard ? [{ card, publishedCard }] : [];
  });
  const changedCards = keptCards
    .filter(
      ({ card, publishedCard }) =>
        card.question !== publishedCard.question ||
        card.answer !== publishedCard.answer ||
        card.lessonId !== publishedCard.lessonId ||
        (card.lessonSectionId ?? null) !== (publishedCard.lessonSectionId ?? null)
    )
    .map(({ card }) => card);
  const reorderedCardCount = keptCards.filter(
    ({ card, publishedCard }) => card.order !== publishedCard.order
  ).length;

  const warnings: string[] = [];
  for (const removed of removedCards) {
    const replacement = addedCards.find(
      (added) => added.question === removed.question || added.answer === removed.answer
    );
    if (replacement) {
      warnings.push(
        `Card "${removed.question}" was removed (${removed.id}) and a card with the same text was added (${replacement.id}). If it teaches the same thing, keep the original ID so learners keep their progress.`
      );
    }
  }

  return {
    addedCards: addedCards.map(toPublicationCard),
    audioChanged: !sameAudio(published.audioFiles, candidate.audioFiles),
    changedCards: changedCards.map(toPublicationCard),
    metadataChanged:
      published.authorId !== candidate.authorId ||
      published.schema !== candidate.schema ||
      published.title !== candidate.title ||
      published.description !== candidate.description ||
      published.createdAt !== candidate.createdAt ||
      published.updatedAt !== candidate.updatedAt ||
      keptCards.some(
        ({ card, publishedCard }) =>
          card.createdAt !== publishedCard.createdAt || card.updatedAt !== publishedCard.updatedAt
      ),
    removedCards: removedCards.map(toPublicationCard),
    reorderedCardCount,
    ...compareLessons(published, candidate),
    warnings,
  };
}

function compareLessons(
  published: PublicationDeckPackage,
  candidate: PublicationDeckPackage
): Pick<
  DeckComparison,
  "addedLessons" | "changedLessons" | "removedLessons" | "reorderedLessonCount"
> {
  const publishedLessons = new Map((published.lessons ?? []).map((lesson) => [lesson.id, lesson]));
  const candidateLessons = candidate.lessons ?? [];
  const candidateIds = new Set(candidateLessons.map((lesson) => lesson.id));
  const kept = candidateLessons.flatMap((lesson) => {
    const publishedLesson = publishedLessons.get(lesson.id);
    return publishedLesson ? [{ lesson, publishedLesson }] : [];
  });
  return {
    addedLessons: candidateLessons
      .filter((lesson) => !publishedLessons.has(lesson.id))
      .map(toPublicationLesson),
    changedLessons: kept
      .filter(
        ({ lesson, publishedLesson }) =>
          lesson.title !== publishedLesson.title ||
          candidate.lessonFiles.get(lesson.id) !== published.lessonFiles.get(lesson.id)
      )
      .map(({ lesson }) => toPublicationLesson(lesson)),
    removedLessons: (published.lessons ?? [])
      .filter((lesson) => !candidateIds.has(lesson.id))
      .map(toPublicationLesson),
    reorderedLessonCount: kept.filter(
      ({ lesson, publishedLesson }) => lesson.order !== publishedLesson.order
    ).length,
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

function sameAudio(
  left: ReadonlyMap<string, Uint8Array>,
  right: ReadonlyMap<string, Uint8Array>
): boolean {
  if (left.size !== right.size) {
    return false;
  }
  for (const [path, leftBytes] of left) {
    const rightBytes = right.get(path);
    if (!rightBytes || !sameBytes(leftBytes, rightBytes)) {
      return false;
    }
  }
  return true;
}

function sameBytes(left: Uint8Array, right: Uint8Array): boolean {
  if (left.byteLength !== right.byteLength) {
    return false;
  }
  for (let index = 0; index < left.byteLength; index += 1) {
    if (left[index] !== right[index]) {
      return false;
    }
  }
  return true;
}

function toPublicationLesson(lesson: Readonly<{ id: string; title: string }>): PublicationLesson {
  return { id: lesson.id, title: lesson.title };
}

function toPublicationCard(card: Readonly<{ id: string; question: string }>): PublicationCard {
  return { id: card.id, question: card.question };
}
