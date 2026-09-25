import Link from "next/link";

import type { DeckLesson } from "@/server/decks";

import { LessonMarkdown } from "@/components/lesson-markdown";
import { withoutRepeatedTitle } from "@/lib/lesson-text";
import { cn } from "@/lib/utils";

import { LessonList } from "./lesson-list";
import { LessonPager } from "./lesson-pager";

type LessonsViewProps = Readonly<{
  deckId: string;
  lessons: readonly DeckLesson[];
  selectedLessonId: string | undefined;
}>;

export function LessonsView({ deckId, lessons, selectedLessonId }: LessonsViewProps) {
  const lesson = lessons.find((item) => item.id === selectedLessonId) ?? lessons[0];
  if (!lesson) {
    return null;
  }
  const lessonIndex = lessons.indexOf(lesson);

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-8 lg:grid-cols-[16rem_minmax(0,1fr)]">
      <nav aria-label="Lessons" className="min-w-0">
        <LessonList activeLessonId={lesson.id}>
          {lessons.map((item) => (
            <li className="shrink-0" key={item.id}>
              <Link
                aria-current={item.id === lesson.id ? "page" : undefined}
                className={cn(
                  "flex gap-2.5 rounded-md px-2.5 py-2 text-sm transition-colors",
                  item.id === lesson.id
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
                href={`/decks/${deckId}?view=lessons&lesson=${item.id}`}
                scroll={false}
              >
                <span className="w-4 shrink-0 text-right text-xs leading-5 text-subtle-foreground tabular-nums">
                  {item.order + 1}
                </span>
                {item.title}
              </Link>
            </li>
          ))}
        </LessonList>
      </nav>

      <article className="max-w-[68ch] min-w-0">
        <p className="text-xs font-medium tracking-wide text-subtle-foreground uppercase">
          Lesson {lesson.order + 1} of {lessons.length}
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">{lesson.title}</h2>
        <div className="mt-6">
          <LessonMarkdown markdown={withoutRepeatedTitle(lesson.markdown, lesson.title)} />
        </div>
        <LessonPager
          deckId={deckId}
          next={lessons[lessonIndex + 1]}
          previous={lessons[lessonIndex - 1]}
        />
      </article>
    </div>
  );
}
