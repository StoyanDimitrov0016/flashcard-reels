import { describe, expect, it } from "vitest";

import { parseLessonDocument } from "../src/index.ts";

describe("lesson section destinations", () => {
  it("keeps explicit identities after renaming, moving, and reordering duplicate headings", () => {
    const first = "11111111-1111-4111-8111-111111111111";
    const second = "22222222-2222-4222-8222-222222222222";
    const parent = "33333333-3333-4333-8333-333333333333";
    const original = `<!-- section: ${first} -->\n## Limits\nFirst explanation.\n<!-- section: ${second} -->\n## Limits\nSecond explanation.`;
    const edited = `<!-- section: ${second} -->\n\n## Limits\nSecond explanation.\n<!-- section: ${parent} -->\n## Scaling\n<!-- section: ${first} -->\n### Hardware ceiling\nFirst explanation.`;
    const before = parseLessonDocument(original, "Lesson");
    const after = parseLessonDocument(edited, "Lesson");
    expect(before.sections.map((section) => section.id)).toEqual([first, second]);
    expect(after.sections.find((section) => section.id === first)).toMatchObject({
      title: "Hardware ceiling",
      parentId: parent,
      depth: 3,
    });
    const target = after.sections.find((section) => section.id === second);
    if (!target) {
      throw new Error("Missing explicit destination");
    }
    expect(after.blocks[target.startBlock + 1]).toMatchObject({
      type: "paragraph",
      content: [expect.objectContaining({ text: "Second explanation." })],
    });
    expect(
      after.blocks.some(
        (block) =>
          block.type === "paragraph" &&
          block.content.some((inline) => inline.text.includes("<!-- section:"))
      )
    ).toBe(false);
  });

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
    expect(
      parseLessonDocument(
        "```md\n<!-- section: invalid-example -->\n## Example only\n```",
        "Lesson"
      ).sections
    ).toEqual([]);
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
