import { describe, expect, it } from "vitest";

import { parseLessonDocument } from "../src/index.ts";

describe("lesson section destinations", () => {
  it("includes nested explanations in the parent section and stops before the next topic", () => {
    const document = parseLessonDocument(
      "# Scaling\nIntro\n\n## Vertical scaling\nMore resources.\n\n### Limitations\n- Hardware ceiling\n\n#### Example\nA larger machine.\n\n## Horizontal scaling\nMore machines.",
      "Scaling"
    );
    const vertical = document.sections.find((section) => section.id === "vertical-scaling");
    const horizontal = document.sections.find((section) => section.id === "horizontal-scaling");
    if (!vertical || !horizontal) {
      throw new Error("Missing scaling sections");
    }
    expect(vertical.endBlock).toBe(horizontal.startBlock);
    expect(document.blocks.slice(vertical.startBlock, vertical.endBlock)).toContainEqual(
      expect.objectContaining({
        type: "paragraph",
        content: [expect.objectContaining({ text: "A larger machine." })],
      })
    );
    expect(
      document.sections.find((section) => section.id === "vertical-scaling/limitations/example")
    ).toMatchObject({
      depth: 4,
      parentId: "vertical-scaling/limitations",
    });
  });

  it("preserves destinations after prose edits, unrelated insertions, and line-ending changes", () => {
    const original =
      "# Scaling\n\n## Vertical scaling\nSmall.\n\n### Limitations\nFinite.\n\n## Horizontal scaling\nDistributed.";
    const edited = original
      .replace("Small.", "A much longer explanation.")
      .replace("## Horizontal", "## Costs\nDifferent costs.\n\n## Horizontal");
    const ids = parseLessonDocument(original, "Scaling").sections.map((section) => section.id);
    expect(
      parseLessonDocument(edited.replaceAll("\n", "\r\n"), "Scaling").sections.map(
        (section) => section.id
      )
    ).toEqual(expect.arrayContaining(ids));
    expect(parseLessonDocument(original, "Scaling")).toEqual(
      parseLessonDocument(original, "Scaling")
    );
  });

  it("disambiguates repeated siblings and identical headings under different parents", () => {
    const { sections } = parseLessonDocument(
      "## Vertical\n### Limits\n### Limits\n## Horizontal\n### Limits\n## limits 2\n## limits~2",
      "Scaling"
    );
    expect(sections.map((section) => section.id)).toEqual([
      "vertical",
      "vertical/limits",
      "vertical/limits~2",
      "horizontal",
      "horizontal/limits",
      "limits-2",
      "limits-2~2",
    ]);
  });

  it("ignores headings inside code and keeps heading-free lessons readable", () => {
    expect(
      parseLessonDocument(
        "```md\n## Example only\n```\n\n## Real section\nText",
        "Lesson"
      ).sections.map((section) => section.id)
    ).toEqual(["real-section"]);
    expect(parseLessonDocument("An explanation without headings.", "Lesson")).toMatchObject({
      sections: [],
      blocks: [expect.objectContaining({ type: "paragraph" })],
    });
  });

  it("uses visible heading text and deterministic Unicode normalization", () => {
    expect(
      parseLessonDocument("## **Café** and `Map`\n## Cafe\u0301 and Map", "Lesson").sections.map(
        (section) => section.id
      )
    ).toEqual(["café-and-map", "café-and-map~2"]);
  });
});
