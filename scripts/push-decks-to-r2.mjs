import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { createDeckPackage, parseDeckFiles } from "@flashcard-reels/deck-contract";
import { unzipSync } from "fflate";
import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { createInterface } from "node:readline/promises";

import { readDeckSource } from "../apps/mobile/scripts/read-deck-source.mjs";
import { getR2Environment } from "../apps/web/src/server/env.ts";
import {
  canPublish,
  publicationUploads,
  reviewDeckPublication,
} from "./deck-package-publication.ts";

const ConfirmationWord = "publish";

const argumentsList = process.argv.slice(2);
const dryRun = argumentsList.includes("--dry-run");
const environmentArgument = argumentsList.find((argument) => argument.startsWith("--environment="));
const publicationEnvironment = environmentArgument?.slice("--environment=".length);
if (publicationEnvironment !== "dev" && publicationEnvironment !== "prod") {
  throw new Error("Select --environment=dev (dev/decks/) or --environment=prod (decks/)");
}
const PublishedKeyPrefix = publicationEnvironment === "dev" ? "dev/decks/" : "decks/";
for (const argument of argumentsList) {
  if (argument.startsWith("--") && argument !== "--dry-run" && argument !== environmentArgument) {
    throw new Error(`Unknown argument: ${argument}`);
  }
}
const sourcePaths = argumentsList.filter((argument) => !argument.startsWith("--"));
if (sourcePaths.length === 0) {
  sourcePaths.push("flashcard-reels-decks.zip");
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function readCandidates(paths) {
  const candidates = [];
  for (const sourcePath of paths) {
    const sourceStats = await stat(sourcePath);
    if (sourceStats.isDirectory()) {
      const source = parseDeckFiles(await readDeckSource(path.resolve(sourcePath)));
      const bytes = createDeckPackage(source);
      candidates.push({ bytes, fileName: `${source.deck.id}.fcrdeck`, sha256: sha256(bytes) });
      continue;
    }
    const bytes = new Uint8Array(await readFile(path.resolve(sourcePath)));
    if (sourcePath.endsWith(".fcrdeck")) {
      candidates.push({ bytes, fileName: path.basename(sourcePath), sha256: sha256(bytes) });
      continue;
    }
    const packages = Object.entries(unzipSync(bytes)).filter(([entryPath]) =>
      entryPath.endsWith(".fcrdeck")
    );
    if (packages.length === 0) {
      throw new Error(`No .fcrdeck files found in ${sourcePath}`);
    }
    for (const [entryPath, packageBytes] of packages) {
      candidates.push({
        bytes: packageBytes,
        fileName: path.basename(entryPath),
        sha256: sha256(packageBytes),
      });
    }
  }
  return candidates;
}

function createPublishedDeckStore(client, bucket) {
  return {
    async listPublishedDecks() {
      const keys = [];
      let continuationToken;
      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
            Prefix: PublishedKeyPrefix,
          })
        );
        for (const object of page.Contents ?? []) {
          if (object.Key?.endsWith(".fcrdeck")) {
            keys.push(object.Key);
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);

      const entries = [];
      for (const key of keys) {
        const head = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        const metadata = head.Metadata ?? {};
        const revision = Number(metadata.revision);
        if (!metadata["deck-id"] || !metadata.sha256 || !Number.isInteger(revision)) {
          throw new Error(`Published object ${key} has no deck metadata; it cannot be compared.`);
        }
        entries.push({
          deckId: metadata["deck-id"],
          key,
          sha256: metadata.sha256,
          title: metadata.title ?? "",
          revision,
        });
      }
      return entries;
    },
    async readPublishedDeck(key) {
      const object = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
      return new Uint8Array(await object.Body.transformToByteArray());
    },
  };
}

function printCards(label, cards) {
  if (cards.length === 0) {
    return;
  }
  console.log(`  ${label} (${cards.length}):`);
  for (const card of cards) {
    console.log(`    - ${card.question} [${card.id}]`);
  }
}

function printLessons(label, lessons) {
  if (lessons.length === 0) {
    return;
  }
  console.log(`  ${label} (${lessons.length}):`);
  for (const lesson of lessons) {
    console.log(`    - ${lesson.title} [${lesson.id}]`);
  }
}

function printReview(review) {
  for (const change of review.decks) {
    const revision =
      change.publishedRevision === null
        ? `r${change.revision}`
        : `r${change.publishedRevision} -> r${change.revision}`;
    console.log(
      `\n${change.status.toUpperCase()}  ${change.title} (${change.fileName}) ${revision}`
    );
    for (const block of change.blocks) {
      console.log(`  BLOCKED: ${block}`);
    }
    for (const warning of change.warnings) {
      console.log(`  WARNING: ${warning}`);
    }
    if (change.status === "new") {
      console.log(
        `  New deck with ${change.addedCards.length} cards and ${change.addedLessons.length} lessons.`
      );
      continue;
    }
    printCards("Added cards", change.addedCards);
    printCards("Changed cards - confirm each still teaches the same thing", change.changedCards);
    printCards("Removed cards", change.removedCards);
    if (change.reorderedCardCount > 0) {
      console.log(`  Reordered cards: ${change.reorderedCardCount}`);
    }
    printLessons("Added lessons", change.addedLessons);
    printLessons("Changed lessons", change.changedLessons);
    printLessons("Removed lessons", change.removedLessons);
    if (change.reorderedLessonCount > 0) {
      console.log(`  Reordered lessons: ${change.reorderedLessonCount}`);
    }
    if (change.metadataChanged) {
      console.log("  Deck or card metadata changed.");
    }
    if (change.audioChanged) {
      console.log("  Audio changed.");
    }
  }
  for (const block of review.blocks) {
    console.log(`\nBLOCKED: ${block}`);
  }
}

async function confirmUpload(uploadCount) {
  if (!process.stdin.isTTY) {
    console.error(
      "\nUploading needs the owner's confirmation in an interactive terminal. Nothing was uploaded."
    );
    return false;
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(
      `\nType "${ConfirmationWord}" to upload ${uploadCount} deck(s): `
    );
    return answer.trim() === ConfirmationWord;
  } finally {
    prompt.close();
  }
}

const candidates = await readCandidates(sourcePaths);
console.log(`Publication target: ${publicationEnvironment} (${PublishedKeyPrefix})`);
const environment = getR2Environment();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  },
});
const review = await reviewDeckPublication({
  candidates,
  store: createPublishedDeckStore(client, environment.R2_BUCKET_NAME),
  keyPrefix: PublishedKeyPrefix,
});
printReview(review);

if (!canPublish(review)) {
  console.error("\nPublishing is blocked. Nothing was uploaded.");
  process.exit(1);
}

const uploads = publicationUploads(review, candidates);
if (uploads.length === 0) {
  console.log("\nEverything is already published.");
  process.exit(0);
}
if (dryRun) {
  console.log(`\n[dry-run] ${uploads.length} deck(s) would be uploaded.`);
  process.exit(0);
}
if (!(await confirmUpload(uploads.length))) {
  console.log("Nothing was uploaded.");
  process.exit(1);
}

for (const upload of uploads) {
  await client.send(
    new PutObjectCommand({
      Body: upload.bytes,
      Bucket: environment.R2_BUCKET_NAME,
      ContentType: "application/octet-stream",
      Key: upload.key,
      Metadata: {
        "deck-id": upload.deckId,
        sha256: upload.sha256,
        title: upload.title,
        revision: String(upload.revision),
      },
    })
  );
  console.log(`uploaded ${upload.key}: ${upload.title} r${upload.revision}`);
}
