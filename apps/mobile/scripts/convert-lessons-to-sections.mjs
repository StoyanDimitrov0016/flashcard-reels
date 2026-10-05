import { parseDeck, parseLessonDocument } from "@flashcard-reels/deck-contract";
import { cp, mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { parseLessonMarkdownSource } from "../../../packages/deck-contract/src/lessons/lesson-markdown.ts";

const MarkerPattern = /^<!-- section: [0-9a-f-]+ -->$/;
const WhitespacePattern = /\s+/g;
const HeadingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;

export async function convertLessons(input, output) {
  const inputDirectory = path.resolve(input);
  const outputDirectory = path.resolve(output);
  if (
    await stat(outputDirectory).catch((error) => {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    })
  ) {
    throw new Error(`Output directory must not exist: ${outputDirectory}`);
  }
  const manifest = JSON.parse(await readFile(path.join(inputDirectory, "deck.json"), "utf8"));
  const deck = parseDeck(manifest);
  const files = new Map();
  const lessons = [];
  const report = [];
  for (const lesson of deck.lessons) {
    const originalSource = await readFile(
      path.join(inputDirectory, "lessons", `${lesson.id}.md`),
      "utf8"
    );
    const source = originalSource.replaceAll("\r\n", "\n").replaceAll("\r", "\n");
    const lines = source.split("\n");
    const parsed = parseLessonMarkdownSource(source);
    const document = parseLessonDocument(source, lesson.title);
    const headings = parsed.blocks.filter((block) => block.type === "heading");
    const sections = headings.flatMap((heading, index) => {
      if (!heading.sectionId) {
        if (
          index !== 0 ||
          document.blocks.includes(heading) ||
          heading.level !== 1 ||
          heading.content
            .map((segment) => segment.text)
            .join("")
            .trim()
            .toLowerCase() !== lesson.title.trim().toLowerCase()
        ) {
          throw new Error(
            `${lesson.id}:${parsed.headingLines[index] + 1}: heading has no section ID`
          );
        }
        return [];
      }
      const start = parsed.headingLines[index];
      const end = parsed.headingLines[index + 1] ?? lines.length;
      const title = heading.content.map((segment) => segment.text).join("");
      const body = lines
        .slice(start + 1, end)
        .filter((line) => !MarkerPattern.test(line))
        .join("\n")
        .trim();
      if (!body) {
        throw new Error(`${lesson.id}:${start + 1}: empty section ${heading.sectionId}`);
      }
      files.set(`lessons/${lesson.id}/${heading.sectionId}.md`, `${body}\n`);
      if (heading.level >= 3) {
        report.push(
          `${lesson.id}:${start + 1}: level ${heading.level} becomes flat section ${title}`
        );
      }
      const sourceTitle = HeadingPattern.exec(lines[start])?.[2];
      if (sourceTitle !== title) {
        report.push(
          `${lesson.id}:${start + 1}: title ${JSON.stringify(sourceTitle)} -> ${JSON.stringify(title)}`
        );
      }
      return [{ id: heading.sectionId, title, body }];
    });
    const firstSectionIndex = headings.findIndex((heading) => heading.sectionId);
    const introEnd = firstSectionIndex < 0 ? lines.length : parsed.headingLines[firstSectionIndex];
    const headingLines = new Set(parsed.headingLines);
    const intro = lines
      .slice(0, introEnd)
      .filter((line, index) => !headingLines.has(index) && !MarkerPattern.test(line))
      .join("\n")
      .trim();
    if (intro) {
      files.set(`lessons/${lesson.id}/intro.md`, `${intro}\n`);
      report.push(`${lesson.id}: has intro`);
    }
    const ids = new Set(sections.map((section) => section.id));
    if (
      ids.size !== sections.length ||
      document.sections.length !== sections.length ||
      document.sections.some((section) => !ids.has(section.id))
    ) {
      throw new Error(`${lesson.id}: section IDs changed`);
    }
    for (const card of deck.cards.filter((candidate) => candidate.lessonId === lesson.id)) {
      if (card.lessonSectionId && !ids.has(card.lessonSectionId)) {
        throw new Error(`${lesson.id}: card ${card.id} reference lost`);
      }
    }
    const original = lines
      .filter((line, index) => !headingLines.has(index) && !MarkerPattern.test(line))
      .join("\n")
      .replaceAll(WhitespacePattern, " ")
      .trim();
    const converted = [intro, ...sections.map((section) => section.body)]
      .join("\n")
      .replaceAll(WhitespacePattern, " ")
      .trim();
    if (original !== converted) {
      throw new Error(`${lesson.id}: text preservation check failed`);
    }
    lessons.push({
      id: lesson.id,
      title: lesson.title,
      intro: Boolean(intro),
      sections: sections.map(({ id, title }) => ({ id, title })),
    });
  }
  const updated = {
    ...manifest,
    schema: 4,
    revision: deck.revision + 1,
    updatedAt: new Date().toISOString(),
    lessons,
  };
  await mkdir(outputDirectory, { recursive: true });
  for (const [file, content] of files) {
    const target = path.join(outputDirectory, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  if (deck.cards.some((card) => card.audio)) {
    await cp(path.join(inputDirectory, "audio"), path.join(outputDirectory, "audio"), {
      recursive: true,
    });
  }
  await writeFile(path.join(outputDirectory, "deck.json"), `${JSON.stringify(updated, null, 2)}\n`);
  console.log(
    `${deck.title}: schema 4, revision ${updated.revision}; IDs, references, and text preserved\n${report.join("\n") || "No deep headings, formatted titles, or intros."}`
  );
}

const [input, output] = process.argv.slice(2);
if (!input || !output) {
  throw new Error("Usage: convert-lessons-to-sections.mjs <input-directory> <output-directory>");
}
await convertLessons(input, output);
