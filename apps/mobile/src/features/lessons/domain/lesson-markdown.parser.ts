/**
 * Parses the lesson Markdown subset: headings, paragraphs, bold, italic, bulleted and numbered
 * lists, inline code, and fenced code blocks. Everything else stays readable plain text. Links
 * and images keep only their visible text, so lessons never navigate or load remote content.
 */

export type LessonInline = Readonly<{
  text: string;
  bold: boolean;
  italic: boolean;
  code: boolean;
}>;

type LessonHeadingLevel = 1 | 2 | 3;

export type LessonBlock =
  | Readonly<{ type: "heading"; level: LessonHeadingLevel; content: readonly LessonInline[] }>
  | Readonly<{ type: "paragraph"; content: readonly LessonInline[] }>
  | Readonly<{
      type: "list";
      ordered: boolean;
      start: number;
      items: readonly (readonly LessonInline[])[];
    }>
  | Readonly<{ type: "code"; text: string }>;

const FencePattern = /^\s*(```|~~~)/;
const HeadingPattern = /^(#{1,6})\s+(.*?)\s*#*\s*$/;
const BulletItemPattern = /^\s*[-*+]\s+(.*)$/;
const OrderedItemPattern = /^\s*(\d{1,9})[.)]\s+(.*)$/;
const IndentedContinuationPattern = /^\s{2,}\S/;
const LinkPattern = /!?\[([^\]]*)\]\([^)]*\)/g;
const WordCharacterPattern = /[A-Za-z0-9]/;

type ListState = { ordered: boolean; start: number; items: string[] };

export function parseLessonMarkdown(markdown: string): LessonBlock[] {
  const lines = markdown.replaceAll("\r\n", "\n").replaceAll("\r", "\n").split("\n");
  const blocks: LessonBlock[] = [];
  let paragraph: string[] = [];
  let list: ListState | null = null;

  const flushParagraph = () => {
    if (paragraph.length > 0) {
      blocks.push({ content: parseInline(paragraph.join(" ")), type: "paragraph" });
      paragraph = [];
    }
  };
  const flushList = () => {
    if (list) {
      blocks.push({
        items: list.items.map((item) => parseInline(item)),
        ordered: list.ordered,
        start: list.start,
        type: "list",
      });
      list = null;
    }
  };

  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";

    const fence = FencePattern.exec(line);
    if (fence) {
      flushParagraph();
      flushList();
      const marker = fence[1] ?? "```";
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trimStart().startsWith(marker)) {
        codeLines.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ text: codeLines.join("\n"), type: "code" });
      index += 1;
      continue;
    }

    if (line.trim().length === 0) {
      flushParagraph();
      flushList();
      index += 1;
      continue;
    }

    const heading = HeadingPattern.exec(line);
    if (heading) {
      flushParagraph();
      flushList();
      const depth = heading[1]?.length ?? 1;
      blocks.push({
        content: parseInline(heading[2] ?? ""),
        level: toHeadingLevel(depth),
        type: "heading",
      });
      index += 1;
      continue;
    }

    const bullet = BulletItemPattern.exec(line);
    const ordered = bullet ? null : OrderedItemPattern.exec(line);
    if (bullet || ordered) {
      flushParagraph();
      const isOrdered = ordered !== null;
      const text = (bullet ? bullet[1] : ordered?.[2]) ?? "";
      if (!list || list.ordered !== isOrdered) {
        flushList();
        list = { items: [], ordered: isOrdered, start: isOrdered ? Number(ordered[1]) : 1 };
      }
      list.items.push(text);
      index += 1;
      continue;
    }

    if (list && IndentedContinuationPattern.test(line)) {
      const lastIndex = list.items.length - 1;
      list.items[lastIndex] = `${list.items[lastIndex] ?? ""} ${line.trim()}`;
      index += 1;
      continue;
    }

    flushList();
    paragraph.push(line.trim());
    index += 1;
  }

  flushParagraph();
  flushList();
  return blocks;
}

function toHeadingLevel(depth: number): LessonHeadingLevel {
  if (depth <= 1) {
    return 1;
  }
  return depth === 2 ? 2 : 3;
}

type InlineStyle = Readonly<{ bold: boolean; italic: boolean }>;

function parseInline(source: string): LessonInline[] {
  const text = source.replaceAll(LinkPattern, "$1");
  const segments: LessonInline[] = [];
  let style: InlineStyle = { bold: false, italic: false };
  let buffer = "";

  const pushText = (value: string, segmentStyle: InlineStyle, code = false) => {
    if (value.length === 0) {
      return;
    }
    const previous = segments.at(-1);
    if (
      previous &&
      previous.code === code &&
      previous.bold === segmentStyle.bold &&
      previous.italic === segmentStyle.italic
    ) {
      segments[segments.length - 1] = { ...previous, text: previous.text + value };
      return;
    }
    segments.push({ bold: segmentStyle.bold, code, italic: segmentStyle.italic, text: value });
  };
  const flush = () => {
    pushText(buffer, style);
    buffer = "";
  };

  let index = 0;
  while (index < text.length) {
    const character = text[index] ?? "";

    if (character === "`") {
      const closing = text.indexOf("`", index + 1);
      if (closing > index + 1) {
        flush();
        pushText(text.slice(index + 1, closing), style, true);
        index = closing + 1;
        continue;
      }
    }

    if (character === "*" || character === "_") {
      const double = text[index + 1] === character;
      const marker = double ? character.repeat(2) : character;
      const canToggle =
        character === "*" || isUnderscoreBoundary(text, index, marker.length, style, double);
      const closes = double ? style.bold : style.italic;
      const hasClosing = text.indexOf(marker, index + marker.length) >= 0;
      if (canToggle && (closes || hasClosing)) {
        flush();
        style = double ? { ...style, bold: !style.bold } : { ...style, italic: !style.italic };
        index += marker.length;
        continue;
      }
    }

    buffer += character;
    index += 1;
  }

  flush();
  return segments;
}

// Underscores inside words, such as max_connections, are literal text rather than emphasis.
function isUnderscoreBoundary(
  text: string,
  index: number,
  length: number,
  style: InlineStyle,
  double: boolean
): boolean {
  const closing = double ? style.bold : style.italic;
  const neighbour = closing ? text[index + length] : text[index - 1];
  return neighbour === undefined || !WordCharacterPattern.test(neighbour);
}

/**
 * Lesson screens show the title from deck.json, and authors often open the Markdown with the same
 * heading. Dropping a matching leading level-one heading avoids showing the title twice.
 */
export function withoutRepeatedTitle(blocks: readonly LessonBlock[], title: string): LessonBlock[] {
  const [first, ...rest] = blocks;
  if (
    first?.type === "heading" &&
    first.level === 1 &&
    normalizeTitle(first.content.map((segment) => segment.text).join("")) === normalizeTitle(title)
  ) {
    return rest;
  }
  return [...blocks];
}

function normalizeTitle(value: string): string {
  return value.trim().replaceAll(/\s+/g, " ").toLowerCase();
}
