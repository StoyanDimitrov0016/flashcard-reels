import Markdown, { type Components } from "react-markdown";

// Typography follows the mobile reader: comfortable body text, quiet headings, Notion-style code.
const components: Components = {
  code: ({ children, className }) =>
    className ? (
      <code className="font-mono text-[13px] leading-6">{children}</code>
    ) : (
      <code className="rounded-sm bg-code-surface px-[0.3em] py-[0.1em] font-mono text-[0.88em] text-code">
        {children}
      </code>
    ),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => (
    <ol className="ml-5 list-decimal space-y-1.5 marker:text-subtle-foreground">{children}</ol>
  ),
  p: ({ children }) => <p className="leading-7">{children}</p>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-muted p-4 text-foreground">{children}</pre>
  ),
  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
  ul: ({ children }) => (
    <ul className="ml-5 list-disc space-y-1.5 marker:text-subtle-foreground">{children}</ul>
  ),
};

type LessonMarkdownProps = Readonly<{ markdown: string }>;

/** Renders lesson Markdown on the server. Raw HTML in lessons is ignored. */
export function LessonMarkdown({ markdown }: LessonMarkdownProps) {
  return (
    <div className="space-y-4 text-[16px] text-foreground">
      <Markdown components={components} skipHtml>
        {markdown}
      </Markdown>
    </div>
  );
}
