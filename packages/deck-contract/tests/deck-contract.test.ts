import { strToU8, unzipSync, zipSync } from "fflate";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  compareDeckPackages,
  createDeckPackage,
  DeckContractError,
  DeckPackageParseError,
  DECK_PACKAGE_LIMITS,
  checkDeckPackageEntries,
  deckLessonTextPaths,
  parseDeckFiles,
  parseDeckManifest,
  parseDeckPackage,
  readDeckContent,
  UnsupportedDeckSchemaError,
  type DeckPackage,
  type DeckManifest,
  type Flashcard,
} from "../src/index.ts";

const deckId = "11111111-1111-4111-8111-111111111111";
const cardId = "22222222-2222-4222-8222-222222222222";
const lessonId = "33333333-3333-4333-8333-333333333333";
const sectionId = "55555555-5555-4555-8555-555555555555";
const timestamp = "2026-01-01T00:00:00Z";
const sectionPath = `lessons/${lessonId}/${sectionId}.md`;

function fixture(): DeckPackage {
  return {
    deck: {
      schema: 4,
      id: deckId,
      authorId: "44444444-4444-4444-8444-444444444444",
      revision: 1,
      title: "Sample deck",
      description: "",
      createdAt: timestamp,
      updatedAt: timestamp,
      cards: [
        {
          id: cardId,
          question: "Question",
          answer: "Answer",
          lessonId,
          lessonSectionId: sectionId,
          audio: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      lessons: [
        {
          id: lessonId,
          title: "Lesson",
          intro: "Introduction.",
          sections: [{ id: sectionId, title: "Section", body: "Explanation." }],
        },
      ],
    },
    audio: new Map([[cardId, new Uint8Array([1, 2, 3])]]),
  };
}
function files() {
  return unzipSync(createDeckPackage(fixture()));
}
type MutableCard = Omit<Flashcard, "lessonSectionId"> & { lessonSectionId?: string | null };
type MutableLesson = {
  id: string;
  title: string;
  intro: boolean;
  sections: [{ id: string; title: string }, ...{ id: string; title: string }[]] | [];
};
type MutableManifest = Omit<DeckManifest, "schema" | "cards" | "lessons"> & {
  schema?: number | string;
  extra?: boolean;
  cards: [MutableCard, ...MutableCard[]];
  lessons: [MutableLesson, ...MutableLesson[]];
};
function manifest(): MutableManifest {
  const deck = fixture().deck;
  const card = deck.cards[0];
  if (!card) {
    throw new Error("Missing fixture card");
  }
  return {
    ...deck,
    cards: [{ ...card }],
    lessons: [
      {
        id: lessonId,
        title: "Lesson",
        intro: true,
        sections: [{ id: sectionId, title: "Section" }],
      },
    ],
  };
}
function parseManifestInput(input: unknown) {
  return parseDeckManifest(strToU8(JSON.stringify(input)));
}

describe("schema 4 deck contract", () => {
  it("enforces the manifest byte limit for manifest-only reads", () => {
    const input = manifest();
    input.description = "x".repeat(DECK_PACKAGE_LIMITS.maxManifestFileBytes);
    expect(() => parseManifestInput(input)).toThrow(DeckPackageParseError);
  });
  it("round-trips all content through reproducible archives and directory files", () => {
    const source = fixture();
    expect(parseDeckPackage(createDeckPackage(source))).toEqual(source);
    expect(parseDeckFiles(files())).toEqual(source);
    expect(createDeckPackage(source)).toEqual(createDeckPackage(source));
    const archive = files();
    const parsedManifest = parseDeckManifest(archive["deck.json"] ?? new Uint8Array());
    const sizes = new Map(Object.entries(archive).map(([file, bytes]) => [file, bytes.length]));
    expect(() => checkDeckPackageEntries(parsedManifest, sizes)).not.toThrow();
    const lessonFiles = new Map(
      deckLessonTextPaths(parsedManifest).map((file) => [file, archive[file] ?? new Uint8Array()])
    );
    expect(readDeckContent(parsedManifest, sizes, lessonFiles)).toEqual(source.deck);
  });

  it("reports missing, empty and unreferenced entries once each", () => {
    const archive = files();
    delete archive[sectionPath];
    archive[`lessons/${lessonId}/intro.md`] = new Uint8Array();
    archive["notes.txt"] = strToU8("stray");
    expect(() => parseDeckFiles(archive)).toThrow(
      expect.objectContaining({
        issues: [
          { path: [`lessons/${lessonId}/intro.md`], message: "Empty declared file" },
          { path: [sectionPath], message: "Missing declared file" },
          { path: ["notes.txt"], message: "Unreferenced archive file" },
        ],
      })
    );
  });

  it("reports invalid UTF-8 lesson text once", () => {
    const archive = files();
    archive[sectionPath] = new Uint8Array([0xff, 0xfe]);
    expect(() => parseDeckFiles(archive)).toThrow(
      expect.objectContaining({
        issues: [
          expect.objectContaining({
            path: [sectionPath],
            message: "Lesson text must be valid UTF-8",
          }),
        ],
      })
    );
  });

  it("keeps titles as authored and rejects whitespace-only titles", () => {
    const input = manifest();
    const [lesson] = input.lessons;
    lesson.sections = [{ id: sectionId, title: "  Section  " }];
    expect(parseManifestInput(input).lessons[0]?.sections[0]?.title).toBe("  Section  ");
    lesson.title = "   ";
    expect(() => parseManifestInput(input)).toThrow(DeckPackageParseError);
  });

  it.each([1, 2, 3, 5])("rejects schema %i before other manifest problems", (schema) => {
    for (const parse of [
      () => parseManifestInput({ schema }),
      () => parseDeckFiles({ "deck.json": strToU8(JSON.stringify({ schema })) }),
      () => parseDeckPackage(zipSync({ "deck.json": strToU8(JSON.stringify({ schema })) })),
    ]) {
      try {
        parse();
        expect.fail("Expected rejection");
      } catch (error) {
        expect(error).toBeInstanceOf(UnsupportedDeckSchemaError);
        expect(error).toBeInstanceOf(DeckContractError);
        expect(error).toMatchObject({
          name: "UnsupportedDeckSchemaError",
          code: "DECK_SCHEMA_UNSUPPORTED",
          context: { schema },
        });
      }
    }
  });

  it.each(["malformed JSON", "invalid UTF-8"])("reports %s as a package error", (scenario) => {
    const bytes = scenario === "malformed JSON" ? strToU8("{bad") : new Uint8Array([0xff]);
    expect(() => parseDeckManifest(bytes)).toThrow(DeckPackageParseError);
  });

  it.each([
    [
      "missing schema",
      (value: ReturnType<typeof manifest>) => {
        delete value.schema;
      },
    ],
    [
      "string schema",
      (value: ReturnType<typeof manifest>) => {
        value.schema = "4";
      },
    ],
    [
      "unknown key",
      (value: ReturnType<typeof manifest>) => {
        value.extra = true;
      },
    ],
    [
      "bad UUID",
      (value: ReturnType<typeof manifest>) => {
        value.id = "bad";
      },
    ],
    [
      "missing section reference key",
      (value: ReturnType<typeof manifest>) => {
        delete value.cards[0].lessonSectionId;
      },
    ],
    [
      "empty title",
      (value: ReturnType<typeof manifest>) => {
        value.lessons[0].title = "";
      },
    ],
    [
      "too many sections",
      (value: ReturnType<typeof manifest>) => {
        const section = { id: sectionId, title: "Section" };
        value.lessons[0].sections = [section, ...Array.from({ length: 50 }, () => section)];
      },
    ],
    [
      "duplicate card",
      (value: ReturnType<typeof manifest>) => {
        value.cards.push(value.cards[0]);
      },
    ],
    [
      "duplicate lesson",
      (value: ReturnType<typeof manifest>) => {
        value.lessons.push(value.lessons[0]);
      },
    ],
    [
      "cross-kind duplicate",
      (value: ReturnType<typeof manifest>) => {
        value.lessons[0].sections = [{ id: cardId, title: "Section" }];
      },
    ],
    [
      "empty lesson",
      (value: ReturnType<typeof manifest>) => {
        value.lessons[0].intro = false;
        value.lessons[0].sections = [];
      },
    ],
    [
      "missing lesson",
      (value: ReturnType<typeof manifest>) => {
        value.cards[0].lessonId = deckId;
      },
    ],
    [
      "section without lesson",
      (value: ReturnType<typeof manifest>) => {
        value.cards[0].lessonId = null;
      },
    ],
    [
      "foreign section",
      (value: ReturnType<typeof manifest>) => {
        value.cards[0].lessonSectionId = deckId;
      },
    ],
  ])("rejects %s", (_scenario, change) => {
    const input = manifest();
    change(input);
    expect(() => parseManifestInput(input)).toThrow(DeckPackageParseError);
  });

  it("collects references, files, and Markdown failures in one typed error", () => {
    const input = files();
    const value = manifest();
    value.cards[0].lessonSectionId = deckId;
    input["deck.json"] = strToU8(JSON.stringify(value));
    delete input[`audio/${cardId}.mp3`];
    input[sectionPath] = strToU8("Good.\n\n## Heading\n\n[link](https://example.com)");
    input["extra.txt"] = strToU8("extra");
    try {
      parseDeckFiles(input);
      expect.fail("Expected rejection");
    } catch (error) {
      if (!(error instanceof DeckPackageParseError)) {
        throw error;
      }
      expect(error.code).toBe("DECK_PACKAGE_INVALID");
      expect(error.issues).toHaveLength(5);
      expect(error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ path: ["deck.json", "cards", 0, "lessonSectionId"] }),
          expect.objectContaining({ path: [`audio/${cardId}.mp3`] }),
          expect.objectContaining({ path: ["extra.txt"] }),
          expect.objectContaining({ path: [sectionPath], lessonId, sectionId, line: 3 }),
          expect.objectContaining({ path: [sectionPath], lessonId, sectionId, line: 5 }),
        ])
      );
    }
  });

  it.each([
    "Paragraph\nnext line",
    "- one\n- **bold** and *italic*",
    "3. first\n4. second",
    "- outer\n  - nested",
    "```js\n# heading in code\n```",
    "    # indented code",
    "`inline` and **bold *nested***",
    "line  \nbreak",
    "escaped \\*asterisk",
    "&amp; entity",
  ])("accepts allowed Markdown: %s", (body) => {
    const input = files();
    input[sectionPath] = strToU8(body);
    expect(() => parseDeckFiles(input)).not.toThrow();
  });

  it.each([
    "# Heading",
    "[link](https://example.com)",
    "![image](https://example.com/a.png)",
    "<b>html</b>",
    "| a | b |\n|---|---|\n| c | d |",
    "> quote",
    "---",
    "~~strike~~",
    "- [x] task",
    "[id]: https://example.com",
  ])("rejects disallowed Markdown with location: %s", (body) => {
    const input = files();
    input[sectionPath] = strToU8(body);
    try {
      parseDeckFiles(input);
      expect.fail("Expected rejection");
    } catch (error) {
      if (!(error instanceof DeckPackageParseError)) {
        throw error;
      }
      expect(error.issues[0]).toMatchObject({ path: [sectionPath], lessonId, sectionId, line: 1 });
    }
  });

  it("checks intro Markdown and line numbers inside nested lists", () => {
    const input = files();
    input[`lessons/${lessonId}/intro.md`] = strToU8("Introduction.\n\n[link](https://example.com)");
    input[sectionPath] = strToU8("- outer\n  - inner\n\n    > nested quote");
    try {
      parseDeckFiles(input);
      expect.fail("Expected rejection");
    } catch (error) {
      if (!(error instanceof DeckPackageParseError)) {
        throw error;
      }
      expect(error.issues).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ lessonId, sectionId: null, line: 3 }),
          expect.objectContaining({ lessonId, sectionId, line: 4 }),
        ])
      );
    }
  });

  it.each(["missing", "empty", "blank", "oversized", "invalid UTF-8"])(
    "rejects %s lesson text",
    (scenario) => {
      const input = files();
      if (scenario === "missing") {
        delete input[sectionPath];
      } else if (scenario === "empty") {
        input[sectionPath] = new Uint8Array();
      } else if (scenario === "blank") {
        input[sectionPath] = strToU8(" \n");
      } else if (scenario === "invalid UTF-8") {
        input[sectionPath] = new Uint8Array([0xff]);
      } else {
        input[sectionPath] = new Uint8Array(DECK_PACKAGE_LIMITS.maxLessonTextFileBytes + 1);
      }
      expect(() => parseDeckFiles(input)).toThrow(DeckPackageParseError);
    }
  );

  it("rejects invalid content passed to the writer with the same typed parse error", () => {
    const source = fixture();
    expect(() =>
      createDeckPackage({
        ...source,
        deck: {
          ...source.deck,
          lessons: [{ id: lessonId, title: "Lesson", intro: "# invalid", sections: [] }],
        },
      })
    ).toThrow(DeckPackageParseError);
    expect(() => createDeckPackage({ ...source, audio: new Map() })).toThrow(DeckPackageParseError);
  });

  it.each(["../deck.json", "lessons/../deck.json", "audio\\card.mp3", "/deck.json", "extra.txt"])(
    "rejects unsafe or extra archive path %s",
    (file) => {
      expect(() => parseDeckPackage(zipSync({ ...files(), [file]: strToU8("extra") }))).toThrow(
        DeckPackageParseError
      );
    }
  );

  it.each(["audio", "manifest"])("rejects oversized %s before decompressing", (kind) => {
    const input = files();
    const file = kind === "audio" ? `audio/${cardId}.mp3` : "deck.json";
    const size =
      kind === "audio"
        ? DECK_PACKAGE_LIMITS.maxAudioFileBytes
        : DECK_PACKAGE_LIMITS.maxManifestFileBytes;
    input[file] = new Uint8Array(size + 1);
    expect(() => parseDeckPackage(zipSync(input))).toThrow("exceeds size limit");
  });

  it("rejects corrupt ZIPs, directory corruption and ZIP64 metadata", () => {
    expect(() => parseDeckPackage(new Uint8Array([1, 2, 3]))).toThrow(DeckPackageParseError);
    for (const corrupt of ["directory", "zip64"]) {
      const archive = zipSync(files());
      const view = new DataView(archive.buffer, archive.byteOffset, archive.byteLength);
      const end = archive.length - 22;
      if (corrupt === "directory") {
        view.setUint32(view.getUint32(end + 16, true), 0, true);
      } else {
        view.setUint16(end + 8, 0xffff, true);
        view.setUint16(end + 10, 0xffff, true);
      }
      expect(() => parseDeckPackage(archive)).toThrow(DeckPackageParseError);
    }
  });

  it("compares section content and warns about replacing identities", () => {
    const source = fixture();
    const lesson = source.deck.lessons[0];
    if (!lesson) {
      throw new Error("Fixture missing");
    }
    const replacementId = "66666666-6666-4666-8666-666666666666";
    const candidate = {
      ...source,
      deck: {
        ...source.deck,
        cards: source.deck.cards.map((card) =>
          Object.assign({}, card, { lessonSectionId: replacementId })
        ),
        lessons: [
          {
            ...lesson,
            sections: lesson.sections.map((section) =>
              Object.assign({}, section, { id: replacementId })
            ),
          },
        ],
      },
    };
    const comparison = compareDeckPackages(source, candidate);
    expect(comparison.changedLessons).toEqual([{ id: lessonId, title: "Lesson" }]);
    expect(comparison.warnings[0]).toContain("keep the original section ID");
    expect(compareDeckPackages(source, source).changedLessons).toEqual([]);
  });

  it("parses every versioned source directory in the repository", async () => {
    const root = fileURLToPath(new URL("../../../apps/mobile/data/", import.meta.url));
    await Promise.all(
      ["demo-deck", "test-decks/versioned/v1", "test-decks/versioned/v2"].map(async (directory) => {
        const sourceFiles: Record<string, Uint8Array> = {};
        async function readDirectory(relative: string) {
          const entries = await readdir(path.join(root, directory, relative), {
            withFileTypes: true,
          });
          await Promise.all(
            entries.map(async (entry) => {
              const file = relative ? `${relative}/${entry.name}` : entry.name;
              if (entry.isDirectory()) {
                await readDirectory(file);
              } else {
                sourceFiles[file] = new Uint8Array(
                  await readFile(path.join(root, directory, file))
                );
              }
            })
          );
        }
        await readDirectory("");
        expect(() => parseDeckFiles(sourceFiles), directory).not.toThrow();
      })
    );
  });
});
