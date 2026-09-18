import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PutObjectCommand, S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { unzipSync } from "fflate";
import { ArchiveDeckPackageReader } from "../apps/mobile/src/features/decks/deck-installer/internal/archive-deck-package.reader.ts";
import { getR2Environment } from "../apps/web/src/config/server-environment.ts";

const argumentsList = process.argv.slice(2);
const sourcePath =
  argumentsList.find((argument) => !argument.startsWith("--")) ?? "flashcard-reels-decks.zip";
const dryRun = argumentsList.includes("--dry-run");
const sourceBytes = new Uint8Array(await readFile(path.resolve(sourcePath)));
const outerEntries = unzipSync(sourceBytes);
const packages = Object.entries(outerEntries).filter(([entryPath]) =>
  entryPath.endsWith(".fcrdeck")
);

if (packages.length === 0) {
  throw new Error(`No .fcrdeck files found in ${sourcePath}`);
}

const environment = getR2Environment();
const client = new S3Client({
  region: "auto",
  endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: environment.R2_ACCESS_KEY_ID,
    secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
  },
});
const reader = new ArchiveDeckPackageReader();

for (const [entryPath, bytes] of packages) {
  const deck = reader.read(bytes);
  const filename = path.basename(entryPath);
  const key = `decks/${filename}`;
  const sha256 = createHash("sha256").update(bytes).digest("hex");

  if (dryRun) {
    console.log(`[dry-run] ${filename}: ${deck.title} v${deck.version}, ${bytes.byteLength} bytes`);
    continue;
  }

  let existing;
  try {
    existing = await client.send(
      new HeadObjectCommand({ Bucket: environment.R2_BUCKET_NAME, Key: key })
    );
  } catch (error) {
    if (error?.$metadata?.httpStatusCode !== 404) {
      throw error;
    }
  }

  if (existing?.Metadata?.sha256 === sha256) {
    console.log(`unchanged ${filename}`);
    continue;
  }

  await client.send(
    new PutObjectCommand({
      Bucket: environment.R2_BUCKET_NAME,
      Key: key,
      Body: bytes,
      ContentType: "application/octet-stream",
      Metadata: {
        sha256,
        "deck-id": deck.id,
        version: String(deck.version),
        title: deck.title,
      },
    })
  );
  console.log(`uploaded ${filename}: ${deck.title} v${deck.version}, ${bytes.byteLength} bytes`);
}
