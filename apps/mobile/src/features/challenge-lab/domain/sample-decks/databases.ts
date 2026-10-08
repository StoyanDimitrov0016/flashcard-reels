import type { IdeaDeck } from "../idea-deck";

export const databasesDeck: IdeaDeck = {
  schema: 5,
  id: "deck-databases",
  authorId: "author-lab",
  revision: 1,
  title: "Databases",
  description: "Indexes, transactions, and replicas",
  lessons: [
    {
      id: "lesson-db-core",
      title: "Storage and Queries",
      sections: [
        { id: "section-indexes", title: "Indexes" },
        { id: "section-transactions", title: "Transactions" },
        { id: "section-isolation", title: "Isolation" },
        { id: "section-replication", title: "Replication" },
      ],
    },
  ],
  ideas: [
    {
      id: "idea-index",
      title: "Indexes",
      statement:
        "An index trades extra writes and storage for fast lookups: the database finds matching rows without scanning the whole table.",
      sectionId: "section-indexes",
      challenges: [
        {
          id: "index-tf",
          format: "true-false",
          level: "recognize",
          prompt: "Adding an index makes inserts faster.",
          answer: false,
          explanation: "Every insert must also update the index, so writes get slower.",
        },
        {
          id: "index-slow-query",
          format: "choice",
          level: "recognize",
          prompt: "A query filtering on `email` is slow on a large table. What helps most?",
          options: [
            { id: "a", text: "An index on `email`", correct: true },
            { id: "b", text: "Selecting fewer columns", correct: false },
            {
              id: "c",
              text: "A bigger connection pool",
              correct: false,
              explanation: "More connections just run more full scans at once.",
            },
          ],
        },
        {
          id: "index-composite",
          format: "choice",
          level: "apply",
          prompt: "An index covers `(country, city)`. Which filters can use it?",
          options: [
            { id: "a", text: "`country = 'DE'`", correct: true },
            { id: "b", text: "`country = 'DE' AND city = 'Berlin'`", correct: true },
            {
              id: "c",
              text: "`city = 'Berlin'` on its own",
              correct: false,
              explanation:
                "The leftmost-prefix rule: without `country`, the index order doesn't help.",
            },
            { id: "d", text: "`country = 'DE' ORDER BY city`", correct: true },
          ],
        },
        {
          id: "index-fill",
          format: "fill-blanks",
          level: "recognize",
          prompt: "An index speeds up {{0}} but slows down {{1}}.",
          answers: ["reads", "writes"],
          distractors: ["backups", "replication"],
          explanation: "Every write has to keep the index in sync.",
        },
        {
          id: "index-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What do you pay for an index?",
          answer:
            "Extra storage, and slower inserts, updates, and deletes, because every write must keep the index in sync.",
        },
      ],
    },
    {
      id: "idea-atomicity",
      title: "Atomic transactions",
      statement: "A transaction is atomic: either all of its writes commit, or none of them do.",
      sectionId: "section-transactions",
      challenges: [
        {
          id: "atomic-tf",
          format: "true-false",
          level: "recognize",
          prompt: "If a transaction fails halfway, its earlier writes stay committed.",
          answer: false,
          explanation: "A failed transaction rolls back every write it made.",
        },
        {
          id: "atomic-acid",
          format: "choice",
          level: "recognize",
          prompt: "Which are ACID guarantees?",
          options: [
            { id: "a", text: "Atomicity", correct: true },
            { id: "b", text: "Isolation", correct: true },
            {
              id: "c",
              text: "Availability",
              correct: false,
              explanation: "Availability comes from CAP, not ACID.",
            },
            { id: "d", text: "Durability", correct: true },
          ],
        },
        {
          id: "atomic-transfer",
          format: "choice",
          level: "apply",
          prompt:
            "A transfer debits A, then crashes before crediting B. Both writes share one transaction. What is stored?",
          options: [
            { id: "a", text: "Neither write", correct: true },
            {
              id: "b",
              text: "Only the debit",
              correct: false,
              explanation: "That's exactly the half-done state atomicity rules out.",
            },
            { id: "c", text: "Only the credit", correct: false },
          ],
        },
        {
          id: "atomic-fill",
          format: "fill-blanks",
          level: "recognize",
          prompt: "A transaction is atomic: either {{0}} of its writes commit, or {{1}} do.",
          answers: ["all", "none"],
          distractors: ["most", "some"],
        },
        {
          id: "atomic-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What does atomicity guarantee?",
          answer: "All of a transaction's writes take effect together, or none of them do.",
        },
      ],
    },
    {
      id: "idea-read-committed",
      title: "Read committed",
      statement:
        "Read committed prevents dirty reads, but a row can still change between two reads in the same transaction.",
      sectionId: "section-isolation",
      challenges: [
        {
          id: "isolation-tf",
          format: "true-false",
          level: "recognize",
          prompt: "Under read committed, you can see another transaction's uncommitted writes.",
          answer: false,
          explanation: "That's a dirty read, which is exactly what read committed prevents.",
        },
        {
          id: "isolation-allowed",
          format: "choice",
          level: "recognize",
          prompt: "Which anomaly does read committed still allow?",
          options: [
            { id: "a", text: "Non-repeatable reads", correct: true },
            { id: "b", text: "Dirty reads", correct: false },
            { id: "c", text: "Dirty writes", correct: false },
          ],
        },
        {
          id: "isolation-serializable",
          format: "choice",
          level: "apply",
          prompt: "What does serializable isolation prevent?",
          options: [
            { id: "a", text: "Dirty reads", correct: true },
            { id: "b", text: "Non-repeatable reads", correct: true },
            { id: "c", text: "Phantom rows", correct: true },
            {
              id: "d",
              text: "Deadlocks and aborts",
              correct: false,
              explanation:
                "Serializable can still abort a transaction; it prevents anomalies, not conflicts.",
            },
          ],
        },
        {
          id: "isolation-match",
          format: "match",
          level: "recognize",
          prompt: "Match each level to the anomaly it still allows",
          pairs: [
            { left: "Read uncommitted", right: "Dirty reads" },
            { left: "Read committed", right: "Non-repeatable reads" },
            { left: "Repeatable read", right: "Phantom rows" },
          ],
          explanation: "Each stricter level closes one more gap; serializable closes them all.",
        },
        {
          id: "isolation-recall",
          format: "flashcard",
          level: "recall",
          prompt: "What can still go wrong under read committed?",
          answer:
            "Reading the same row twice can return different values, because another transaction committed a change in between.",
        },
      ],
    },
    {
      id: "idea-read-your-writes",
      title: "Read your writes",
      statement:
        "With asynchronous replicas, a read right after a write can reach a replica that hasn't caught up, so users may not see their own change.",
      sectionId: "section-replication",
      challenges: [
        {
          id: "replica-tf",
          format: "true-false",
          level: "recognize",
          prompt: "Asynchronous replicas always return the latest committed write.",
          answer: false,
          explanation: "They lag behind the primary by however long replication takes.",
        },
        {
          id: "replica-fixes",
          format: "choice",
          level: "recall",
          prompt: "Which give a user read-your-writes?",
          options: [
            {
              id: "a",
              text: "Read from the primary for a moment after the user writes",
              correct: true,
            },
            { id: "b", text: "Wait until a replica has applied the write", correct: true },
            {
              id: "c",
              text: "Pick a replica at random for every read",
              correct: false,
              explanation: "A random replica may be the one furthest behind.",
            },
          ],
        },
        {
          id: "replica-profile",
          format: "choice",
          level: "apply",
          prompt:
            "A user renames their profile, reloads, and sees the old name. Reads go to replicas. Simplest fix?",
          options: [
            {
              id: "a",
              text: "Serve that user's profile from the primary right after an edit",
              correct: true,
            },
            {
              id: "b",
              text: "Add more replicas",
              correct: false,
              explanation: "More replicas don't make any of them catch up faster.",
            },
            {
              id: "c",
              text: "Cache the profile for an hour",
              correct: false,
              explanation: "A cache would keep the stale name even longer.",
            },
          ],
        },
      ],
    },
  ],
};
