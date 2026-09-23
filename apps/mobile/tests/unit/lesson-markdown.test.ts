import { describe, expect, it } from "vitest";

import { parseLessonMarkdown } from "@/features/lessons/domain/lesson-markdown.parser";

function plain(text: string) {
  return { bold: false, code: false, italic: false, text };
}

describe("lesson Markdown", () => {
  it("parses headings, paragraphs, and lists in document order", () => {
    const blocks = parseLessonMarkdown(
      [
        "# Scaling",
        "",
        "A system scales when it handles",
        "more load.",
        "",
        "## Options",
        "- Vertical",
        "- Horizontal",
        "",
        "3. Measure",
        "4. Decide",
      ].join("\n")
    );

    expect(blocks).toEqual([
      { content: [plain("Scaling")], level: 1, type: "heading" },
      { content: [plain("A system scales when it handles more load.")], type: "paragraph" },
      { content: [plain("Options")], level: 2, type: "heading" },
      {
        items: [[plain("Vertical")], [plain("Horizontal")]],
        ordered: false,
        start: 1,
        type: "list",
      },
      { items: [[plain("Measure")], [plain("Decide")]], ordered: true, start: 3, type: "list" },
    ]);
  });

  it("styles bold, italic, and inline code", () => {
    const [block] = parseLessonMarkdown("Use **bold**, *italic*, _also italic_, and `code`.");

    expect(block).toEqual({
      content: [
        plain("Use "),
        { bold: true, code: false, italic: false, text: "bold" },
        plain(", "),
        { bold: false, code: false, italic: true, text: "italic" },
        plain(", "),
        { bold: false, code: false, italic: true, text: "also italic" },
        plain(", and "),
        { bold: false, code: true, italic: false, text: "code" },
        plain("."),
      ],
      type: "paragraph",
    });
  });

  it("keeps code blocks verbatim, including Markdown syntax inside them", () => {
    const blocks = parseLessonMarkdown("```sql\nSELECT *\n  FROM **users**;\n```\nAfter");

    expect(blocks).toEqual([
      { text: "SELECT *\n  FROM **users**;", type: "code" },
      { content: [plain("After")], type: "paragraph" },
    ]);
  });

  it("treats underscores inside identifiers and unmatched markers as text", () => {
    const [block] = parseLessonMarkdown("Tune max_connections and 2 * 3 carefully");

    expect(block).toEqual({
      content: [plain("Tune max_connections and 2 * 3 carefully")],
      type: "paragraph",
    });
  });

  it("keeps only the visible text of links and images", () => {
    const [block] = parseLessonMarkdown(
      "Read [the guide](https://example.com) ![diagram](https://example.com/a.png)"
    );

    expect(block).toEqual({ content: [plain("Read the guide diagram")], type: "paragraph" });
  });

  it("shows unsupported syntax as plain text", () => {
    const blocks = parseLessonMarkdown("> A quote\n\n| a | b |\n\n<b>html</b>");

    expect(blocks).toEqual([
      { content: [plain("> A quote")], type: "paragraph" },
      { content: [plain("| a | b |")], type: "paragraph" },
      { content: [plain("<b>html</b>")], type: "paragraph" },
    ]);
  });

  it("caps deep headings at level three and joins indented list continuations", () => {
    const blocks = parseLessonMarkdown("#### Detail\n- First line\n  continues here");

    expect(blocks).toEqual([
      { content: [plain("Detail")], level: 3, type: "heading" },
      { items: [[plain("First line continues here")]], ordered: false, start: 1, type: "list" },
    ]);
  });

  it("keeps an unclosed code fence as code through the end of the lesson", () => {
    expect(parseLessonMarkdown("```\nconst a = 1;")).toEqual([
      { text: "const a = 1;", type: "code" },
    ]);
  });
});
