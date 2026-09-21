import { spawnSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { ArchiveDeckPackageReader } from "@/features/decks/deck-installer/internal/archive-deck-package.reader";

const temporaryDirectories: string[] = [];

async function temporaryProject(): Promise<string> {
  const directory = await mkdtemp(path.join(tmpdir(), "flashcard-reels-deck-tooling-"));
  temporaryDirectories.push(directory);
  return directory;
}

function runTool(scriptName: string, ...arguments_: string[]) {
  return spawnSync(
    process.execPath,
    [path.join(process.cwd(), "scripts", scriptName), ...arguments_],
    { cwd: process.cwd(), encoding: "utf8" }
  );
}

describe("deck package tooling independence", () => {
  afterEach(async () => {
    await Promise.all(
      temporaryDirectories.splice(0).map((directory) => rm(directory, { recursive: true }))
    );
  });

  it("generates the demo from its isolated authoring source", async () => {
    const project = await temporaryProject();
    await mkdir(path.join(project, "data"), { recursive: true });
    await cp(
      path.join(process.cwd(), "data", "demo-deck"),
      path.join(project, "data", "demo-deck"),
      {
        recursive: true,
      }
    );
    const generateArchive = (timezone: string) => {
      const output = `generated/demo-${timezone.replace("/", "-")}.fcrdeck`;
      const result = spawnSync(
        process.execPath,
        [path.join(process.cwd(), "scripts", "generate-demo-deck-package.mjs")],
        {
          cwd: project,
          encoding: "utf8",
          env: { ...process.env, DEMO_PACKAGE_OUTPUT: output, TZ: timezone },
        }
      );
      expect(result.status, result.stderr).toBe(0);
      return path.join(project, output);
    };
    const generated = new Uint8Array(await readFile(generateArchive("UTC")));
    const generatedInSofia = new Uint8Array(await readFile(generateArchive("Europe/Sofia")));
    const checkedIn = new Uint8Array(
      await readFile(
        path.join(process.cwd(), "assets", "decks", "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873.fcrdeck")
      )
    );
    expect(generatedInSofia).toEqual(generated);
    expect(generated).toEqual(checkedIn);
    expect(new ArchiveDeckPackageReader().read(generated)).toMatchObject({
      id: "7f6f98a7-a84d-4cc8-b744-3d0b53e3c873",
      version: 1,
    });
  }, 10_000);

  it("verifies runtime packages in a project with no authoring data", async () => {
    const project = await temporaryProject();
    await mkdir(path.join(project, "src", "infrastructure"), { recursive: true });
    await mkdir(path.join(project, "assets", "decks"), { recursive: true });
    await cp(
      path.join(process.cwd(), "src", "infrastructure", "bundled-deck-registry.json"),
      path.join(project, "src", "infrastructure", "bundled-deck-registry.json")
    );
    await cp(path.join(process.cwd(), "assets", "decks"), path.join(project, "assets", "decks"), {
      recursive: true,
    });

    const result = spawnSync(
      process.execPath,
      [path.join(process.cwd(), "scripts", "assert-bundled-deck-packages.mjs")],
      { cwd: project, encoding: "utf8" }
    );

    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain("without authoring inputs");
  });

  it("excludes demo authoring fixtures but keeps generated runtime packages in build inputs", async () => {
    const buildIgnore = await readFile(path.join(process.cwd(), ".easignore"), "utf8");
    const patterns = buildIgnore.split(/\r?\n/).map((line) => line.trim());

    expect(patterns).toContain("/data/");
    expect(patterns).not.toContain("/assets/");
    expect(patterns).not.toContain("/assets/decks/");
  });

  it("generates canonical versioned test packages with stable IDs and optional audio", async () => {
    const project = await temporaryProject();
    const fixtureRoot = path.join(process.cwd(), "data", "test-decks", "versioned");
    const v1Output = path.join(project, "v1.fcrdeck");
    const v2Output = path.join(project, "v2.fcrdeck");

    expect(
      runTool("generate-test-deck-package.mjs", path.join(fixtureRoot, "v1", "deck.json"), v1Output)
        .status
    ).toBe(0);
    expect(
      runTool("generate-test-deck-package.mjs", path.join(fixtureRoot, "v2", "deck.json"), v2Output)
        .status
    ).toBe(0);

    const v1 = new ArchiveDeckPackageReader().read(new Uint8Array(await readFile(v1Output)));
    const v2 = new ArchiveDeckPackageReader().read(new Uint8Array(await readFile(v2Output)));
    expect(v1).toMatchObject({
      description: "A tiny deck for import update testing.",
      id: "a1000000-0000-4000-8000-000000000001",
      title: "Versioned Test Deck",
      version: 1,
    });
    expect(v1.cards).toHaveLength(3);
    expect(v1.audioFiles.get("audio/b1000000-0000-4000-8000-000000000001.answer.mp3")).toEqual(
      new Uint8Array(Buffer.from("fixture-audio-unchanged\n"))
    );
    expect(v2.cards.map(({ id }) => id)).toEqual([
      "b1000000-0000-4000-8000-000000000001",
      "b1000000-0000-4000-8000-000000000002",
      "b1000000-0000-4000-8000-000000000004",
    ]);
    expect(v2.cards.find(({ id }) => id.endsWith("0002"))?.answer).toBe(
      "The second version answer."
    );
    expect(v2.audioFiles.has("audio/b1000000-0000-4000-8000-000000000002.question.mp3")).toBe(true);
  });

  it("inspects valid packages and reports invalid packages with a non-zero exit", async () => {
    const project = await temporaryProject();
    const validPackage = path.join(project, "valid.fcrdeck");
    const invalidPackage = path.join(project, "invalid.fcrdeck");
    expect(
      runTool(
        "generate-test-deck-package.mjs",
        path.join(process.cwd(), "data", "test-decks", "versioned", "v1", "deck.json"),
        validPackage
      ).status
    ).toBe(0);
    await writeFile(invalidPackage, "not a deck package");

    const validResult = runTool("inspect-deck-package.mjs", validPackage);
    expect(validResult.status).toBe(0);
    expect(validResult.stdout).toContain("Deck ID: a1000000-0000-4000-8000-000000000001");
    expect(validResult.stdout).toContain("Cards: 3");
    expect(validResult.stdout).toContain("Answer audio: 2");
    expect(validResult.stdout).toContain("Question audio: 0");
    expect(validResult.stdout).toContain("Validation: passed");

    const invalidResult = runTool("inspect-deck-package.mjs", invalidPackage);
    expect(invalidResult.status).not.toBe(0);
    expect(invalidResult.stderr).toContain("Validation: failed -");
    expect(invalidResult.stderr).not.toContain("Error [");
  });
});
