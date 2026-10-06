import "server-only";
import { GetObjectCommand, ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import {
  deckFileName,
  type DeckDownload,
  type DeckStorage,
  type StoredDeckObject,
} from "@/server/decks/deck-storage";
import { getDeckCatalogEnvironment, getR2Environment } from "@/server/env";

const DOWNLOAD_TTL_SECONDS = 15 * 60;

export function createR2DeckStorage(): DeckStorage {
  const environment = getR2Environment();
  const client = new S3Client({
    credentials: {
      accessKeyId: environment.R2_ACCESS_KEY_ID,
      secretAccessKey: environment.R2_SECRET_ACCESS_KEY,
    },
    endpoint: `https://${environment.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    region: "auto",
  });
  const bucket = environment.R2_BUCKET_NAME;
  const { DECK_PREFIX: prefix } = getDeckCatalogEnvironment();
  const assertCatalogKey = (key: string) => {
    if (!key.startsWith(prefix) || !key.endsWith(".fcrdeck")) {
      throw new Error(`Deck object ${key} is outside the configured catalog`);
    }
  };

  return {
    async listDeckObjects(): Promise<StoredDeckObject[]> {
      const objects: StoredDeckObject[] = [];
      let continuationToken: string | undefined;
      do {
        // Pages are sequential: each request needs the previous page's continuation token.
        // oxlint-disable-next-line no-await-in-loop
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: bucket,
            ContinuationToken: continuationToken,
            Prefix: prefix,
          })
        );
        for (const object of page.Contents ?? []) {
          if (object.Key?.endsWith(".fcrdeck") && object.Size !== undefined) {
            assertCatalogKey(object.Key);
            objects.push({
              key: object.Key,
              revision: object.ETag ?? object.LastModified?.toISOString() ?? String(object.Size),
              size: object.Size,
            });
          }
        }
        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
      return objects;
    },

    async readRange(key: string, start: number, end: number): Promise<Uint8Array> {
      assertCatalogKey(key);
      const response = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key, Range: `bytes=${start}-${end - 1}` })
      );
      if (!response.Body) {
        throw new Error(`Deck object ${key} returned no body`);
      }
      return response.Body.transformToByteArray();
    },

    async createDownload(key: string): Promise<DeckDownload> {
      assertCatalogKey(key);
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: bucket,
          Key: key,
          ResponseContentDisposition: `attachment; filename="${deckFileName(key)}"`,
          ResponseContentType: "application/octet-stream",
        }),
        { expiresIn: DOWNLOAD_TTL_SECONDS }
      );
      return { kind: "redirect", url };
    },
  };
}
