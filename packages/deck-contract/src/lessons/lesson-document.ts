import { parseLessonMarkdown, withoutRepeatedTitle, type LessonBlock } from "./lesson-markdown.ts";

export type LessonSection = Readonly<{
  id: string;
  title: string;
  depth: number;
  parentId: string | null;
  startBlock: number;
  endBlock: number;
}>;

export type LessonDocument = Readonly<{
  blocks: readonly LessonBlock[];
  sections: readonly LessonSection[];
}>;

const HeadingSeparatorPattern = /[^\p{L}\p{N}]+/gu;
const EdgeHyphenPattern = /^-+|-+$/g;

/** Heading paths are content references, not permanent identities across heading edits. */
export function parseLessonDocument(markdown: string, title: string): LessonDocument {
  const blocks = withoutRepeatedTitle(parseLessonMarkdown(markdown), title);
  const sections: LessonSection[] = [];
  const ancestors: number[] = [];
  const occurrences = new Map<string, number>();

  for (const [startBlock, block] of blocks.entries()) {
    if (block.type !== "heading") {
      continue;
    }
    while (ancestors.length > 0) {
      const index = ancestors.at(-1);
      const section = index === undefined ? undefined : sections[index];
      if (index === undefined || !section) {
        break;
      }
      if (section.depth < block.level) {
        break;
      }
      sections[index] = { ...section, endBlock: startBlock };
      ancestors.pop();
    }
    const parentIndex = ancestors.at(-1);
    const parentId = parentIndex === undefined ? null : (sections[parentIndex]?.id ?? null);
    const heading = block.content.map((inline) => inline.text).join("");
    const slug =
      heading
        .normalize("NFKC")
        .toLowerCase()
        .replaceAll(HeadingSeparatorPattern, "-")
        .replaceAll(EdgeHyphenPattern, "") || "section";
    const base = parentId ? `${parentId}/${slug}` : slug;
    const occurrence = (occurrences.get(base) ?? 0) + 1;
    occurrences.set(base, occurrence);
    const id = occurrence === 1 ? base : `${base}~${occurrence}`;
    ancestors.push(sections.length);
    sections.push({
      id,
      title: heading,
      depth: block.level,
      parentId,
      startBlock,
      endBlock: blocks.length,
    });
  }
  return { blocks, sections };
}
