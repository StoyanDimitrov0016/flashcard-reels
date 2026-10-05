import type * as S3Module from "@aws-sdk/client-s3";

import { GetObjectCommand, type ListObjectsV2Command } from "@aws-sdk/client-s3";
import { afterEach, describe, expect, it, vi } from "vitest";

type R2Command = GetObjectCommand | ListObjectsV2Command;
const transport = vi.hoisted(() => ({
  send: vi.fn<(command: R2Command) => Promise<unknown>>(),
  sign: vi.fn<
    (client: unknown, command: GetObjectCommand, options: { expiresIn: number }) => Promise<string>
  >(),
}));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const original = await importOriginal<typeof S3Module>();
  return {
    ...original,
    S3Client: class {
      send = transport.send;
    },
  };
});
vi.mock("@aws-sdk/s3-request-presigner", () => ({ getSignedUrl: transport.sign }));

import { createR2DeckStorage } from "@/server/decks/r2-deck-storage";
import { DeckCatalogEnvironmentSchema } from "@/server/env";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetAllMocks();
});

function configureR2(prefix?: string) {
  vi.stubEnv("R2_ACCOUNT_ID", "test-account");
  vi.stubEnv("R2_ACCESS_KEY_ID", "test-access-key");
  vi.stubEnv("R2_SECRET_ACCESS_KEY", "test-secret-key");
  vi.stubEnv("R2_BUCKET_NAME", "test-decks");
  vi.stubEnv("DECK_PREFIX", prefix);
}

describe("R2 catalog isolation", () => {
  it("rejects an unset catalog prefix before accessing storage", () => {
    configureR2();
    expect(() => createR2DeckStorage()).toThrow();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it("uses the configured catalog for every listing page, range read, and signed download", async () => {
    configureR2("dev/decks/");
    transport.send
      .mockResolvedValueOnce({
        Contents: [{ Key: "dev/decks/first.fcrdeck", Size: 32, ETag: "first" }],
        IsTruncated: true,
        NextContinuationToken: "next-page",
      })
      .mockResolvedValueOnce({
        Contents: [{ Key: "dev/decks/second.fcrdeck", Size: 64, ETag: "second" }],
      });
    const storage = createR2DeckStorage();
    expect(await storage.listDeckObjects()).toEqual([
      { key: "dev/decks/first.fcrdeck", size: 32, revision: "first" },
      { key: "dev/decks/second.fcrdeck", size: 64, revision: "second" },
    ]);
    expect(transport.send.mock.calls.slice(0, 2).map(([command]) => command.input)).toEqual([
      expect.objectContaining({ Prefix: "dev/decks/" }),
      expect.objectContaining({ Prefix: "dev/decks/", ContinuationToken: "next-page" }),
    ]);
    transport.send.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2]) },
    });
    expect(await storage.readRange("dev/decks/first.fcrdeck", 0, 2)).toEqual(
      new Uint8Array([1, 2])
    );
    const read = transport.send.mock.calls[2]?.[0];
    expect(read).toBeInstanceOf(GetObjectCommand);
    expect(read?.input).toMatchObject({ Key: "dev/decks/first.fcrdeck", Range: "bytes=0-1" });
    transport.sign.mockResolvedValue("https://example.com/signed");
    expect(await storage.createDownload("dev/decks/first.fcrdeck")).toEqual({
      kind: "redirect",
      url: "https://example.com/signed",
    });
    expect(transport.sign.mock.calls[0]?.[1].input.Key).toBe("dev/decks/first.fcrdeck");
  });

  it("rejects foreign keys before reading or signing them", async () => {
    configureR2("dev/decks/");
    const storage = createR2DeckStorage();
    await expect(storage.readRange("decks/production.fcrdeck", 0, 2)).rejects.toThrow("outside");
    await expect(storage.createDownload("decks/production.fcrdeck")).rejects.toThrow("outside");
    expect(transport.send).not.toHaveBeenCalled();
    expect(transport.sign).not.toHaveBeenCalled();
  });

  it("fails on malformed prefixes rather than broadening the catalog", () => {
    for (const prefix of [
      "",
      " ",
      "/",
      "/decks/",
      "decks",
      "../decks/",
      "dev//decks/",
      "dev\\decks\\",
    ]) {
      expect(DeckCatalogEnvironmentSchema.safeParse({ DECK_PREFIX: prefix }).success).toBe(false);
    }
  });
});
