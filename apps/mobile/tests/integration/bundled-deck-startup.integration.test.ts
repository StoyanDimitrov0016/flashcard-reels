import { afterEach, describe, expect, it, vi } from "vitest";

const { readBundledDeckPackage } = vi.hoisted(() => ({
  readBundledDeckPackage: vi.fn(async () => {
    throw new Error("package reader must not be invoked");
  }),
}));

vi.mock("@/infrastructure/bundled-deck-packages", () => ({
  bundledDeckRegistry: {
    "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873": {
      appearance: { presetId: "gold", coverAsset: "javascript" },
      asset: 1,
      id: "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873",
      version: 2,
    },
  },
  readBundledDeckPackage,
}));
vi.mock("@/infrastructure/deck-package-services", () => ({
  createDeckPackageServices: () => ({
    installBundledPackage: vi.fn(async () => {
      throw new Error("installer must not be invoked");
    }),
  }),
}));

import { installBundledDecks } from "@/infrastructure/bundled-deck-installer";
import { decks } from "@/infrastructure/sqlite/schema";
import { NodeSqliteDatabase } from "../support/node-sqlite-database";
import { TestClock } from "../support/study-fixtures";

describe("bundled deck startup", () => {
  let database: NodeSqliteDatabase | null = null;
  afterEach(() => {
    database?.close();
    readBundledDeckPackage.mockClear();
  });

  it.each([
    ["equal", 2],
    ["newer", 3],
  ])("does not read a package when the installed version is %s", async (_case, version) => {
    database = new NodeSqliteDatabase();
    await database.drizzle.insert(decks).values({
      createdAt: "2026-01-01T00:00:00.000Z",
      description: "",
      id: "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873",
      title: "Demo",
      updatedAt: "2026-01-01T00:00:00.000Z",
      version,
    });

    await installBundledDecks(database.drizzle, new TestClock());

    expect(readBundledDeckPackage).not.toHaveBeenCalled();
  });
});
