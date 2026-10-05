import { parseLessonDocument } from "./lesson-document.ts";
import { parseLessonMarkdownSource, withoutRepeatedTitle } from "./lesson-markdown.ts";

/** Assign once during authoring conversion, using the same heading parser as readers. */
export function assignLessonSectionIds(
  markdown: string,
  title: string,
  createId: () => string
): Readonly<{ markdown: string; sectionIds: ReadonlyMap<string, string> }> {
  const { blocks, headingLines } = parseLessonMarkdownSource(markdown);
  if (blocks.some((block) => block.type === "heading" && block.sectionId)) {
    throw new Error("Lesson already contains permanent section identities");
  }
  const document = parseLessonDocument(markdown, title);
  const sectionIds = new Map(document.sections.map((section) => [section.id, createId()]));
  const titleOffset = withoutRepeatedTitle(blocks, title).length === blocks.length ? 0 : 1;
  const markers = new Map(
    document.sections.map((section, index) => {
      const line = headingLines[index + titleOffset];
      const id = sectionIds.get(section.id);
      if (line === undefined || !id) {
        throw new Error("Section source position is missing");
      }
      return [line, `<!-- section: ${id} -->`];
    })
  );
  const lines = markdown.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const output = lines.flatMap((line, index) => {
    const marker = markers.get(index);
    return marker ? [marker, "", line] : [line];
  });

  return { markdown: output.join("\n"), sectionIds };
}
