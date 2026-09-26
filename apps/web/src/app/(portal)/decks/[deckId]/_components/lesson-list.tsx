"use client";

import { type ReactNode, useEffect, useRef } from "react";

type LessonListProps = Readonly<{ activeLessonId: string; children: ReactNode }>;

/**
 * The lesson links. Below `lg` they form one sideways-scrolling row, so the current lesson is
 * scrolled into view when it changes.
 */
export function LessonList({ activeLessonId, children }: LessonListProps) {
  const listRef = useRef<HTMLOListElement>(null);

  useEffect(
    function revealActiveLesson() {
      const list = listRef.current;
      const active = list?.querySelector<HTMLElement>('[aria-current="page"]');
      if (list && active) {
        list.scrollTo({
          behavior: "smooth",
          left: active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2,
        });
      }
    },
    [activeLessonId]
  );

  return (
    <ol
      className="scrollbar-none relative -mx-4 flex gap-1 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0"
      ref={listRef}
    >
      {children}
    </ol>
  );
}
