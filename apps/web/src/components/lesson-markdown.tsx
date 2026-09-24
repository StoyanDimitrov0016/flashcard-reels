import Markdown, { type Components } from "react-markdown";

// Typography follows the mobile reader: comfortable body text, quiet headings, Notion-style code.
const components: Components = {
  a: ({ children, href }) => (
    <a
      className="text-accent underline underline-offset-2 hover:text-accent-hover"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-3 border-line-strong pl-4 text-fg-muted">{children}</blockquote>
  ),
  code: ({ children, className }) =>
    className ? (
      <code className="font-mono text-[13px] leading-6">{children}</code>
    ) : (
      <code className="rounded-sm bg-code-surface px-[0.3em] py-[0.1em] font-mono text-[0.88em] text-code">
        {children}
      </code>
    ),
  h1: ({ children }) => (
    <h2 className="mt-8 text-2xl font-semibold tracking-tight first:mt-0">{children}</h2>
  ),
  h2: ({ children }) => <h3 className="mt-8 text-xl font-semibold tracking-tight">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-6 text-[17px] font-semibold">{children}</h4>,
  hr: () => <hr className="my-8 border-line" />,
  // Lessons never load remote media; show the image description instead.
  img: ({ alt }) => (alt ? <span className="text-fg-muted italic">{alt}</span> : null),
  li: ({ children }) => <li className="pl-1">{children}</li>,
  ol: ({ children }) => (
    <ol className="ml-5 list-decimal space-y-1.5 marker:text-fg-subtle">{children}</ol>
  ),
  p: ({ children }) => <p className="leading-7">{children}</p>,
  pre: ({ children }) => (
    <pre className="overflow-x-auto rounded-lg bg-surface-subtle p-4 text-fg">{children}</pre>
  ),
  strong: ({ children }) => <strong className="font-semibold text-fg">{children}</strong>,
  ul: ({ children }) => (
    <ul className="ml-5 list-disc space-y-1.5 marker:text-fg-subtle">{children}</ul>
  ),
};

type LessonMarkdownProps = Readonly<{ markdown: string }>;

/** Renders lesson Markdown on the server. Raw HTML in lessons is ignored. */
export function LessonMarkdown({ markdown }: LessonMarkdownProps) {
  return (
    <div className="space-y-4 text-[16px] text-fg">
      <Markdown components={components} skipHtml>
        {markdown}
      </Markdown>
    </div>
  );
}
