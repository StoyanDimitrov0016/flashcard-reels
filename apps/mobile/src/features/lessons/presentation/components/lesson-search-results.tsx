import type { LessonSummary } from "@/features/lessons/domain/lesson.model";

import { LessonList } from "@/features/lessons/presentation/components/lesson-list";
import { matchesLessonSearch } from "@/features/lessons/presentation/lesson-search";
import { EmptyState } from "@/shared/presentation/components/empty-state";

type LessonSearchResultsProps = Readonly<{
  lessons: readonly LessonSummary[];
  onOpen: (lesson: LessonSummary) => void;
  query: string;
}>;

/** A deck's lessons narrowed to a search, keeping each lesson's number from the full list. */
export function LessonSearchResults({ lessons, onOpen, query }: LessonSearchResultsProps) {
  const matches = lessons.filter((lesson) => matchesLessonSearch(lesson, query));

  if (matches.length === 0) {
    return (
      <EmptyState
        icon={{ android: "search_off", ios: "magnifyingglass", web: "search_off" }}
        message="Try another word from a lesson title."
        title="No lessons found"
      />
    );
  }
  return <LessonList lessons={matches} onOpen={onOpen} />;
}
