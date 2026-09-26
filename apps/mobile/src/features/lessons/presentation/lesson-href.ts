import type { LessonId } from "@/features/lessons/domain/lesson.model";

export function getLessonHref(lessonId: LessonId) {
  return {
    params: { lessonId },
    pathname: "/lessons/[lessonId]" as const,
  };
}
